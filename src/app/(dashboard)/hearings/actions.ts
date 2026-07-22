"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensurePermission, AuthError } from "@/lib/auth";
import { dateOrNull, nullIfEmpty } from "@/lib/action-form";
import { notify, notifyMany } from "@/lib/notifications";
import { notifyClientCaseUpdate } from "@/lib/client-notify";
import { getClientIp, verifySameOrigin } from "@/lib/request";
import { formatDateTime } from "@/lib/labels";

const hearingMinuteSchema = z.object({
  caseId: z.string().min(1),
  litigationStepId: z.string().optional().or(z.literal("")),
  sessionDate: z.string().min(1, "حدد تاريخ الجلسة"),
  court: z.string().trim().max(160).optional().or(z.literal("")),
  circuit: z.string().trim().max(160).optional().or(z.literal("")),
  decision: z.string().trim().min(3, "اكتب قرار الجلسة").max(4000),
  requirements: z.string().trim().max(3000).optional().or(z.literal("")),
  nextSessionAt: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});

export interface HearingActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

async function guard(): Promise<{ id: string; name: string } | HearingActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  try {
    const user = await ensurePermission("litigation.manage");
    return { id: user.id, name: user.name };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }
}

function dayBefore(date: Date | null) {
  if (!date) return null;
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}

export async function saveHearingMinuteAction(
  _prev: HearingActionResult,
  formData: FormData
): Promise<HearingActionResult> {
  const actor = await guard();
  if ("ok" in actor) return actor;

  const parsed = hearingMinuteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "راجع بيانات محضر الجلسة" };
  }

  const sessionDate = dateOrNull(parsed.data.sessionDate);
  const nextSessionAt = dateOrNull(parsed.data.nextSessionAt);
  if (!sessionDate) return { ok: false, error: "تاريخ الجلسة غير صحيح" };
  if (parsed.data.nextSessionAt && !nextSessionAt) return { ok: false, error: "تاريخ الجلسة القادمة غير صحيح" };

  const caseInfo = await prisma.case.findUnique({
    where: { id: parsed.data.caseId },
    select: {
      id: true,
      title: true,
      caseNumber: true,
      assignedLawyerId: true,
      createdById: true,
    },
  });
  if (!caseInfo) return { ok: false, error: "القضية غير موجودة" };

  const minute = await prisma.hearingMinute.create({
    data: {
      caseId: caseInfo.id,
      litigationStepId: parsed.data.litigationStepId || null,
      sessionDate,
      court: nullIfEmpty(parsed.data.court),
      circuit: nullIfEmpty(parsed.data.circuit),
      decision: parsed.data.decision,
      requirements: nullIfEmpty(parsed.data.requirements),
      nextSessionAt,
      notes: nullIfEmpty(parsed.data.notes),
      createdById: actor.id,
    },
  });

  let generatedEventId: string | null = null;
  let generatedTaskId: string | null = null;

  if (nextSessionAt) {
    const event = await prisma.event.create({
      data: {
        title: `جلسة: ${caseInfo.title}`,
        type: "HEARING",
        startAt: nextSessionAt,
        location: parsed.data.court || null,
        notes: `تم إنشاؤها من محضر جلسة ${formatDateTime(sessionDate)}`,
        caseId: caseInfo.id,
        createdById: actor.id,
      },
    });
    generatedEventId = event.id;
  }

  if (parsed.data.requirements) {
    const task = await prisma.task.create({
      data: {
        title: `متابعة محضر جلسة: ${caseInfo.caseNumber}`,
        description: parsed.data.requirements,
        status: "TODO",
        priority: "HIGH",
        dueDate: dayBefore(nextSessionAt) ?? new Date(),
        caseId: caseInfo.id,
        assignedToId: parsed.data.assignedToId || caseInfo.assignedLawyerId || actor.id,
        createdById: actor.id,
      },
    });
    generatedTaskId = task.id;
    if (task.assignedToId && task.assignedToId !== actor.id) {
      await notify({
        userId: task.assignedToId,
        type: "hearing.followup",
        title: "مطلوبات محضر جلسة",
        body: `${caseInfo.caseNumber}: ${parsed.data.requirements.slice(0, 180)}`,
        link: "/tasks",
      });
    }
  }

  if (generatedEventId || generatedTaskId) {
    await prisma.hearingMinute.update({
      where: { id: minute.id },
      data: { generatedEventId, generatedTaskId },
    });
  }

  if (parsed.data.litigationStepId) {
    await prisma.litigationStep.updateMany({
      where: { id: parsed.data.litigationStepId, caseId: caseInfo.id },
      data: {
        outcome: parsed.data.decision,
        nextAction: nullIfEmpty(parsed.data.requirements),
        status: nextSessionAt ? "WAITING" : "DONE",
      },
    });
  }

  await audit({
    action: "hearing.minute.create",
    userId: actor.id,
    entity: "HearingMinute",
    entityId: minute.id,
    ip: await getClientIp(),
    details: { caseId: caseInfo.id, generatedEventId, generatedTaskId },
  });

  await notifyMany([caseInfo.assignedLawyerId, caseInfo.createdById], {
    type: "hearing.minute",
    title: "محضر جلسة جديد",
    body: `${actor.name}: ${caseInfo.caseNumber}`,
    link: `/cases/${caseInfo.id}`,
  });
  await notifyClientCaseUpdate(caseInfo.id, {
    subject: `تحديث جلسة في قضيتك: ${caseInfo.title}`,
    heading: "تم تسجيل محضر جلسة جديد",
    lines: [
      `القضية: ${caseInfo.title} (${caseInfo.caseNumber})`,
      `قرار الجلسة: ${parsed.data.decision}`,
      ...(nextSessionAt ? [`الجلسة القادمة: ${formatDateTime(nextSessionAt)}`] : []),
    ],
  });

  revalidatePath("/hearings");
  revalidatePath("/litigation");
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  revalidatePath(`/cases/${caseInfo.id}`);
  revalidatePath(`/portal/cases/${caseInfo.id}`);
  return { ok: true, success: "تم حفظ محضر الجلسة وإنشاء المتابعات المطلوبة" };
}

export async function deleteHearingMinuteFormAction(formData: FormData) {
  const actor = await guard();
  if ("ok" in actor) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const minute = await prisma.hearingMinute.findUnique({
    where: { id },
    select: { id: true, caseId: true },
  });
  if (!minute) return;
  await prisma.hearingMinute.delete({ where: { id } });
  await audit({
    action: "hearing.minute.delete",
    userId: actor.id,
    entity: "HearingMinute",
    entityId: id,
    ip: await getClientIp(),
  });
  revalidatePath("/hearings");
  revalidatePath(`/cases/${minute.caseId}`);
}
