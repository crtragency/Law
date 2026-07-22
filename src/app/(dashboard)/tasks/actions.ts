"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensurePermission, AuthError } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { taskSchema, commentSchema } from "@/lib/validation";
import { verifySameOrigin, getClientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notifications";

export interface ActionResult {
  ok: boolean;
  error?: string;
  success?: string;
}

export async function saveTaskAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("tasks.manage");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = taskSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") ?? "",
    caseId: formData.get("caseId") ?? "",
    assignedToId: formData.get("assignedToId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات خاطئة" };
  }

  // من لا يملك صلاحية إسناد للآخرين، يُسنِد لنفسه فقط.
  let assignedToId = parsed.data.assignedToId || null;
  if (
    assignedToId &&
    assignedToId !== actor.id &&
    !hasPermission(actor, "tasks.assignOthers")
  ) {
    return { ok: false, error: "لا تملك صلاحية إسناد المهام لموظفين آخرين" };
  }

  const data = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    caseId: parsed.data.caseId || null,
    assignedToId,
  };

  const ip = await getClientIp();
  if (parsed.data.id) {
    await prisma.task.update({ where: { id: parsed.data.id }, data });
    await audit({
      action: "task.update",
      userId: actor.id,
      entity: "Task",
      entityId: parsed.data.id,
      ip,
    });
  } else {
    const created = await prisma.task.create({
      data: { ...data, createdById: actor.id },
    });
    await audit({
      action: "task.create",
      userId: actor.id,
      entity: "Task",
      entityId: created.id,
      ip,
    });
  }

  // أشعر الموظف المُسنَدة إليه المهمة (إن كان غير مُنشئها).
  if (assignedToId && assignedToId !== actor.id) {
    await notify({
      userId: assignedToId,
      type: "task.assigned",
      title: "تم إسناد مهمة إليك",
      body: `${actor.name}: ${parsed.data.title}`,
      link: "/tasks",
    });
  }

  revalidatePath("/tasks");
  return { ok: true, success: parsed.data.id ? "تم حفظ المهمة" : "تمت إضافة المهمة" };
}

/** تغيير حالة المهمة بسرعة (متاح للمُسنَد إليه أيضاً). */
export async function updateTaskStatusAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("tasks.view");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const valid = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
  if (!id || !valid.includes(status)) {
    return { ok: false, error: "قيمة غير صالحة" };
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "المهمة غير موجودة" };

  // يُسمح بالتغيير للمُسنَد إليه، أو المنشئ، أو من يملك صلاحية الإدارة.
  const allowed =
    task.assignedToId === actor.id ||
    task.createdById === actor.id ||
    hasPermission(actor, "tasks.manage");
  if (!allowed) {
    return { ok: false, error: "لا تملك صلاحية تعديل هذه المهمة" };
  }

  await prisma.task.update({
    where: { id },
    data: { status: status as "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED" },
  });
  await audit({
    action: "task.status",
    userId: actor.id,
    entity: "Task",
    entityId: id,
    ip: await getClientIp(),
    details: { status },
  });

  revalidatePath("/tasks");
  return { ok: true };
}

export async function addTaskCommentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await verifySameOrigin())) return { ok: false, error: "طلب غير صالح" };
  let actor;
  try {
    actor = await ensurePermission("tasks.view");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const taskId = String(formData.get("taskId") ?? "");
  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!taskId || !parsed.success) {
    return { ok: false, error: "اكتب تعليقاً صحيحاً" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { title: true, assignedToId: true, createdById: true },
  });

  await prisma.taskComment.create({
    data: { taskId, body: parsed.data.body, authorId: actor.id },
  });

  // أشعر المُسنَد إليه ومُنشئ المهمة (عدا كاتب التعليق).
  if (task) {
    await notifyMany(
      [task.assignedToId, task.createdById].filter((id) => id !== actor.id),
      {
        type: "task.comment",
        title: "تعليق جديد على مهمة",
        body: `${actor.name} علّق على: ${task.title}`,
        link: "/tasks",
      }
    );
  }

  revalidatePath("/tasks");
  return { ok: true, success: "تمت إضافة التعليق" };
}
