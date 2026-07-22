"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { notify } from "@/lib/notifications";
import { getClientIp, verifySameOrigin } from "@/lib/request";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

const meetingSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(2, "عنوان الاجتماع مطلوب").max(220),
  meetingAt: z.string().min(1, "حدد وقت الاجتماع"),
  location: z.string().trim().max(180).optional().or(z.literal("")),
  attendees: z.string().trim().max(1200).optional().or(z.literal("")),
  agenda: z.string().trim().max(2000).optional().or(z.literal("")),
  decisions: z.string().trim().min(3, "اكتب قرارات الاجتماع").max(4000),
  actionItems: z.string().trim().max(3000).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIONS_OPEN", "CLOSED", "CANCELLED"]),
  nextMeetingAt: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  caseId: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

async function guard(): Promise<{ id: string; name: string } | ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("cases.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function saveMeetingMinuteAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = meetingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات الاجتماع" };
  }

  const meetingAt = dateOrNull(parsed.data.meetingAt);
  const nextMeetingAt = dateOrNull(parsed.data.nextMeetingAt);
  if (!meetingAt) return { ok: false, error: "وقت الاجتماع غير صحيح" };
  if (parsed.data.nextMeetingAt && !nextMeetingAt) return { ok: false, error: "وقت الاجتماع القادم غير صحيح" };

  const data = {
    title: parsed.data.title,
    meetingAt,
    location: nullIfEmpty(parsed.data.location),
    attendees: nullIfEmpty(parsed.data.attendees),
    agenda: nullIfEmpty(parsed.data.agenda),
    decisions: parsed.data.decisions,
    actionItems: nullIfEmpty(parsed.data.actionItems),
    status: parsed.data.status,
    nextMeetingAt,
    clientId: nullIfEmpty(parsed.data.clientId),
    caseId: nullIfEmpty(parsed.data.caseId),
    assignedToId: nullIfEmpty(parsed.data.assignedToId),
    notes: nullIfEmpty(parsed.data.notes),
  };

  const ip = await getClientIp();
  let id = parsed.data.id;
  if (id) {
    await prisma.meetingMinute.update({ where: { id }, data });
    await audit({ action: "meeting.update", userId: actor.id, entity: "MeetingMinute", entityId: id, ip });
  } else {
    const created = await prisma.meetingMinute.create({ data: { ...data, createdById: actor.id } });
    id = created.id;
    await audit({ action: "meeting.create", userId: actor.id, entity: "MeetingMinute", entityId: id, ip });
  }

  if (!parsed.data.id) {
    let generatedTaskId: string | null = null;
    let generatedEventId: string | null = null;
    if (data.actionItems) {
      const task = await prisma.task.create({
        data: {
          title: `متابعة اجتماع: ${parsed.data.title}`,
          description: data.actionItems,
          status: "TODO",
          priority: "HIGH",
          dueDate: nextMeetingAt ?? new Date(),
          caseId: data.caseId,
          assignedToId: data.assignedToId ?? actor.id,
          createdById: actor.id,
        },
      });
      generatedTaskId = task.id;
      if (task.assignedToId && task.assignedToId !== actor.id) {
        await notify({
          userId: task.assignedToId,
          type: "meeting.action",
          title: "بنود عمل من اجتماع",
          body: `${actor.name}: ${parsed.data.title}`,
          link: "/tasks",
        });
      }
    }
    if (nextMeetingAt) {
      const event = await prisma.event.create({
        data: {
          title: `اجتماع متابعة: ${parsed.data.title}`,
          type: "MEETING",
          startAt: nextMeetingAt,
          location: data.location,
          notes: data.agenda ?? data.notes,
          caseId: data.caseId,
          createdById: actor.id,
        },
      });
      generatedEventId = event.id;
    }
    if (generatedTaskId || generatedEventId) {
      await prisma.meetingMinute.update({ where: { id }, data: { generatedTaskId, generatedEventId } });
    }
  }

  revalidatePath("/meetings");
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  if (data.caseId) revalidatePath(`/cases/${data.caseId}`);
  return { ok: true, success: parsed.data.id ? "تم حفظ محضر الاجتماع" : "تم تسجيل محضر الاجتماع" };
}

export async function deleteMeetingMinuteAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "معرف غير صالح" };
  const item = await prisma.meetingMinute.findUnique({ where: { id }, select: { caseId: true } });
  await prisma.meetingMinute.delete({ where: { id } });
  await audit({ action: "meeting.delete", userId: actor.id, entity: "MeetingMinute", entityId: id, ip: await getClientIp() });
  revalidatePath("/meetings");
  if (item?.caseId) revalidatePath(`/cases/${item.caseId}`);
  return { ok: true, success: "تم حذف محضر الاجتماع" };
}
