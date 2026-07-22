import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { TasksBoard } from "./tasks-board";

export const metadata = { title: "المهام — نظام مكتب المحاماة" };

export default async function TasksPage() {
  const user = await requirePermission("tasks.view");
  const canManage = hasPermission(user, "tasks.manage");
  const canAssignOthers = hasPermission(user, "tasks.assignOthers");

  const [tasks, users, cases] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        case: { select: { id: true, title: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.case.findMany({
      where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, caseNumber: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="المهام" subtitle="توزيع ومتابعة مهام الفريق" />
      <TasksBoard
        canManage={canManage}
        canAssignOthers={canAssignOthers}
        currentUserId={user.id}
        users={users}
        cases={cases.map((c) => ({
          id: c.id,
          name: `${c.caseNumber} — ${c.title}`,
        }))}
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() ?? null,
          caseId: t.caseId,
          caseTitle: t.case?.title ?? null,
          assignedToId: t.assignedToId,
          assignedName: t.assignedTo?.name ?? null,
          createdName: t.createdBy?.name ?? null,
          comments: t.comments.map((c) => ({
            id: c.id,
            body: c.body,
            authorName: c.author?.name ?? null,
            createdAt: c.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
