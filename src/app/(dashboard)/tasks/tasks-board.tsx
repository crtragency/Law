"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveTaskAction,
  updateTaskStatusAction,
  addTaskCommentAction,
  type ActionResult,
} from "./actions";
import { Badge } from "@/components/ui";
import {
  IconPlus,
  IconUser,
  IconFolder,
  IconClock,
  IconMessage,
} from "@/components/icons";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  formatDate,
  formatDateTime,
} from "@/lib/labels";

const EMPTY: ActionResult = { ok: false };
const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

interface Option {
  id: string;
  name: string;
}
interface Comment {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}
interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  caseId: string | null;
  caseTitle: string | null;
  assignedToId: string | null;
  assignedName: string | null;
  createdName: string | null;
  comments: Comment[];
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export function TasksBoard({
  tasks,
  users,
  cases,
  canManage,
  canAssignOthers,
  currentUserId,
}: {
  tasks: TaskItem[];
  users: Option[];
  cases: Option[];
  canManage: boolean;
  canAssignOthers: boolean;
  currentUserId: string;
}) {
  const [showNew, setShowNew] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = tasks.filter((t) => {
    if (mineOnly && t.assignedToId !== currentUserId) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <button onClick={() => setShowNew((v) => !v)} className="btn-primary">
            {showNew ? (
              "إغلاق النموذج"
            ) : (
              <>
                <IconPlus className="h-4 w-4" /> مهمة جديدة
              </>
            )}
          </button>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
          />
          مهامي فقط
        </label>
        <select
          className="field max-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">كل الحالات</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {showNew && canManage && (
        <TaskForm
          users={canAssignOthers ? users : users.filter((u) => u.id === currentUserId)}
          cases={cases}
          onDone={() => setShowNew(false)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="card text-center text-sm text-gray-500">
          لا توجد مهام مطابقة
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskForm({
  users,
  cases,
  onDone,
}: {
  users: Option[];
  cases: Option[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveTaskAction, EMPTY);
  useEffect(() => {
    if (state.ok && state.success) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
  }, [state, onDone]);

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-bold">مهمة جديدة</h3>
      {state.error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.ok && state.success && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </div>
      )}
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">عنوان المهمة *</label>
          <input name="title" required className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">الوصف</label>
          <textarea name="description" rows={2} className="field" />
        </div>
        <div>
          <label className="label">إسناد إلى</label>
          <select name="assignedToId" className="field" defaultValue="">
            <option value="">— غير مُسندة —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">مرتبطة بقضية</label>
          <select name="caseId" className="field" defaultValue="">
            <option value="">— لا شيء —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الأولوية</label>
          <select name="priority" className="field" defaultValue="MEDIUM">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">تاريخ الاستحقاق</label>
          <input name="dueDate" type="date" className="field" dir="ltr" />
        </div>
        <input type="hidden" name="status" value="TODO" />
        <div className="flex gap-3 sm:col-span-2">
          <Submit label="إضافة" />
          <button type="button" onClick={onDone} className="btn-secondary">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskCard({ task }: { task: TaskItem }) {
  const [, statusAction] = useActionState(updateTaskStatusAction, EMPTY);
  const [commentState, commentAction] = useActionState(
    addTaskCommentAction,
    EMPTY
  );
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-bold text-ink">{task.title}</h3>
        <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>
      {task.description && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
          {task.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <IconUser className="h-3.5 w-3.5 text-gray-400" />
          {task.assignedName ?? "غير مُسندة"}
        </span>
        {task.caseTitle && (
          <span className="inline-flex items-center gap-1.5">
            <IconFolder className="h-3.5 w-3.5 text-gray-400" />
            {task.caseTitle}
          </span>
        )}
        {task.dueDate && (
          <span className="inline-flex items-center gap-1.5">
            <IconClock className="h-3.5 w-3.5 text-gray-400" />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <form action={statusAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={task.id} />
          <select
            name="status"
            defaultValue={task.status}
            className="field !py-1 !text-xs"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </form>
        <Badge className={TASK_STATUS_COLORS[task.status]}>
          {TASK_STATUS_LABELS[task.status]}
        </Badge>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
        >
          <IconMessage className="h-3.5 w-3.5" />
          التعليقات ({task.comments.length})
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {task.comments.map((c) => (
            <div key={c.id} className="rounded bg-gray-50 p-2 text-sm">
              <p className="whitespace-pre-wrap text-gray-800">{c.body}</p>
              <p className="mt-1 text-xs text-gray-400">
                {c.authorName ?? "—"} — {formatDateTime(c.createdAt)}
              </p>
            </div>
          ))}
          <form action={commentAction} className="flex gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <input
              name="body"
              required
              className="field !py-1 text-sm"
              placeholder="اكتب تعليقاً..."
            />
            <button type="submit" className="btn-primary !py-1 text-xs">
              إرسال
            </button>
          </form>
          {commentState.error && (
            <p className="text-xs text-red-600">{commentState.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
