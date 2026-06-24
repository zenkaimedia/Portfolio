"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, DragEndEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, parseISO } from "date-fns";
import { useAdminTaskStore } from "@/store/adminTaskStore";
import type { AdminTask, TaskStatus, Priority, Category } from "@/types/adminTask";
import type { AdminUserRow } from "../users/actions";
import {
  createTaskAction, updateTaskAction, updateTaskStatusAction,
  deleteTaskAction,
} from "./actions";

/* ── Config ──────────────────────────────────────────────────────────────── */
const COLUMNS: { id: TaskStatus; label: string; color: string; accent: string }[] = [
  { id: "todo",       label: "To Do",       color: "bg-slate-50 border-slate-200",   accent: "bg-slate-400" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-50 border-blue-200",    accent: "bg-blue-500" },
  { id: "done",       label: "Done",         color: "bg-green-50 border-green-200",  accent: "bg-green-500" },
];

const PRIORITY_CFG: Record<Priority, { label: string; cls: string; dot: string }> = {
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-700 border-red-200",      dot: "bg-red-500" },
  high:   { label: "High",   cls: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500 border-slate-200",  dot: "bg-slate-400" },
};

const CAT_CFG: Record<Category, string> = {
  design:      "bg-purple-100 text-purple-700",
  development: "bg-blue-100 text-blue-700",
  marketing:   "bg-pink-100 text-pink-700",
  general:     "bg-slate-100 text-slate-600",
};

function fmtIST(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDate(d: string) {
  const date = parseISO(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return format(date, "MMM d");
}

/* ── Stats bar ───────────────────────────────────────────────────────────── */
function StatsBar() {
  const tasks = useAdminTaskStore((s) => s.tasks);
  const now = new Date();
  const stats = {
    total:      tasks.length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done:       tasks.filter((t) => t.status === "done").length,
    overdue:    tasks.filter((t) => t.due_date && t.status !== "done" && new Date(t.due_date) < now).length,
  };
  const items = [
    { label: "Total",       value: stats.total,      color: "text-slate-700",  bg: "bg-white border-slate-200" },
    { label: "In Progress", value: stats.inProgress, color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
    { label: "Completed",   value: stats.done,        color: "text-green-600",  bg: "bg-green-50 border-green-200" },
    { label: "Overdue",     value: stats.overdue,     color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`rounded-xl border p-4 ${item.bg}`}>
          <p className="text-xs font-medium text-slate-500">{item.label}</p>
          <p className={`mt-0.5 text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Task Card ───────────────────────────────────────────────────────────── */
function TaskCard({ task, canEditDelete, userNames, onEdit, onDelete }: {
  task: AdminTask; canEditDelete: boolean; userNames: { id: string; name: string }[];
  onEdit: (t: AdminTask) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const p = PRIORITY_CFG[task.priority];
  const isDone = task.status === "done";
  const overdue = task.due_date && !isDone && isPast(parseISO(task.due_date));
  const [menu, setMenu] = useState(false);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`group relative select-none rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing ${
        task.status === "in_progress" ? "border-l-[3px] border-l-blue-500" : "border-slate-200"
      } ${isDone ? "opacity-60" : ""}`}
    >
      {/* Badges row */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${p.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />{p.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_CFG[task.category]}`}>
          {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
        </span>
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold leading-snug text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{task.description}</p>
      )}

      {/* Progress bar */}
      {task.status === "in_progress" && task.progress > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Progress</span><span>{task.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between gap-2">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
              {task.assignee.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[11px] text-slate-400">{task.assignee.name.split(" ")[0]}</span>
          </div>
        ) : <span />}
        {task.due_date && (
          <span className={`text-[11px] font-medium ${overdue ? "text-red-600" : "text-slate-400"}`}>
            {overdue ? "⚠ " : ""}{fmtDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Creator / Assigned-by attribution — always visible */}
      {(() => {
        const creator = userNames.find(u => u.id === task.user_id);
        if (!creator) return null;
        const isAssignedByOther = task.assigned_to && task.assigned_to !== task.user_id;
        return (
          <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-400">
            {isAssignedByOther ? "Assigned by" : "Created by"}{" "}
            <span className="font-semibold text-slate-600">{creator.name}</span>
            {" · "}{fmtIST(task.created_at)}
          </div>
        );
      })()}

      {/* 3-dot admin menu */}
      {canEditDelete && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500">
            ⋯
          </button>
          {menu && (
            <div onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 z-50 min-w-[120px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              <button onClick={(e) => { e.stopPropagation(); setMenu(false); onEdit(task); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">✏️ Edit</button>
              <button onClick={(e) => { e.stopPropagation(); setMenu(false); onDelete(task.id); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">🗑 Delete</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Task Modal ──────────────────────────────────────────────────────────── */
function TaskModal({ open, onClose, editTask, isAdmin, canAssign, users, currentUserId }: {
  open: boolean; onClose: () => void;
  editTask: AdminTask | null; isAdmin: boolean; canAssign: boolean;
  users: AdminUserRow[]; currentUserId: string;
}) {
  const { addTask, updateTask: storeUpdate } = useAdminTaskStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title); setDesc(editTask.description ?? "");
      setPriority(editTask.priority); setAssignedTo(editTask.assigned_to ?? "");
      setDue(editTask.due_date ?? "");
    } else {
      setTitle(""); setDesc(""); setPriority("medium");
      setAssignedTo(isAdmin ? "" : currentUserId); setDue("");
    }
    setErr("");
  }, [editTask, open, isAdmin, currentUserId]);

  if (!open) return null;

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white text-slate-800 placeholder:text-slate-400";

  async function save() {
    if (!title.trim()) { setErr("Title is required."); return; }
    if (!due) { setErr("Due date is required."); return; }
    setSaving(true); setErr("");

    if (editTask) {
      const res = await updateTaskAction({
        id: editTask.id, title: title.trim(), description: desc.trim() || "",
        priority, category: editTask.category, status: editTask.status,
        assigned_to: assignedTo, due_date: due, progress: editTask.progress,
      });
      if ("error" in res) { setErr(res.error); setSaving(false); return; }
      const assigneeUser = users.find(u => u.id === assignedTo);
      storeUpdate(editTask.id, {
        title: title.trim(), description: desc.trim() || null,
        priority, assigned_to: assignedTo || null, due_date: due || null,
        assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name, email: assigneeUser.email } : null,
      });
    } else {
      const res = await createTaskAction({
        title: title.trim(), description: desc.trim() || "",
        priority, category: "general", status: "todo",
        assigned_to: isAdmin ? assignedTo : currentUserId, due_date: due, progress: 0,
      });
      if ("error" in res) { setErr(res.error); setSaving(false); return; }
      if ("task" in res) {
        const assigneeUser = users.find(u => u.id === res.task.assigned_to);
        addTask({ ...res.task, assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name, email: assigneeUser.email } : null });
      }
    }
    setSaving(false); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{editTask ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

        <div className="space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title *" className={input} autoFocus />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Description (optional)" className={input} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={input}>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Due Date <span className="text-red-500">*</span></label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} required className={input} />
            </div>
          </div>

          {/* Assign To — admin or users with task_assign permission */}
          {canAssign && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Assign To</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={input}>
                <option value="">— Assign to self —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
          )}
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          {editTask ? "" : isAdmin ? "Task will be created in To Do." : "Task will be added to your To Do list."}
        </p>

        <div className="mt-4 flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : editTask ? "Save" : "Add Task"}
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Column ──────────────────────────────────────────────────────────────── */
function KanbanColumn({ col, tasks, isAdmin, currentUserId, userNames, onAdd, onEdit, onDelete }: {
  col: typeof COLUMNS[0]; tasks: AdminTask[]; isAdmin: boolean; currentUserId: string; userNames: { id: string; name: string }[];
  onAdd: (s: TaskStatus) => void; onEdit: (t: AdminTask) => void; onDelete: (id: string) => void;
}) {
  // Make the column itself a drop target so empty columns accept drops
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex w-full flex-col sm:w-72 xl:flex-1">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${col.accent}`} />
          <span className="text-sm font-bold text-slate-700">{col.label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{tasks.length}</span>
        </div>
        <button onClick={() => onAdd(col.id)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
          + Add
        </button>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef}
          className={`flex min-h-[200px] flex-1 flex-col gap-3 rounded-2xl border p-3 transition-colors ${col.color} ${isOver ? "ring-2 ring-blue-400 ring-inset bg-blue-50/60" : ""}`}>
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center py-8 text-center">
              <p className="text-sm text-slate-400">{isOver ? "Release to drop" : "Drop tasks here"}</p>
            </div>
          )}
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} userNames={userNames}
              canEditDelete={isAdmin || task.user_id === currentUserId}
              onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

/* ── Mobile task card (no drag, status buttons) ─────────────────────────── */
function MobileTaskCard({ task, canEditDelete, userNames, onEdit, onDelete, onStatusChange }: {
  task: AdminTask; canEditDelete: boolean; userNames: { id: string; name: string }[];
  onEdit: (t: AdminTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const p = PRIORITY_CFG[task.priority];
  const isDone = task.status === "done";
  const overdue = task.due_date && !isDone && isPast(parseISO(task.due_date));

  const nextStatus: Record<TaskStatus, { label: string; status: TaskStatus; cls: string } | null> = {
    todo:        { label: "Start →",   status: "in_progress", cls: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" },
    in_progress: { label: "Done ✓",   status: "done",        cls: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" },
    done:        { label: "Reopen",   status: "todo",        cls: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" },
  };
  const next = nextStatus[task.status];

  return (
    <div className={`rounded-xl border bg-white p-4 ${isDone ? "opacity-60" : "border-slate-200"} ${task.status === "in_progress" ? "border-l-[3px] border-l-blue-500" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${p.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />{p.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_CFG[task.category]}`}>
              {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
            </span>
          </div>
          <p className={`text-sm font-semibold text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>{task.title}</p>
          {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>}
        </div>
        {canEditDelete && (
          <div className="flex shrink-0 gap-1">
            <button onClick={() => onEdit(task)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-gold">✏</button>
            <button onClick={() => onDelete(task.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">🗑</button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
              {task.assignee.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {task.due_date && (
            <span className={`text-[11px] font-medium ${overdue ? "text-red-600" : "text-slate-400"}`}>
              {overdue ? "⚠ " : ""}{fmtDate(task.due_date)}
            </span>
          )}
        </div>
        {next && (
          <button
            onClick={() => onStatusChange(task.id, next.status)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${next.cls}`}
          >
            {next.label}
          </button>
        )}
      </div>

      {task.status === "in_progress" && task.progress > 0 && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {/* Creator / Assigned-by attribution — always visible */}
      {(() => {
        const creator = userNames.find(u => u.id === task.user_id);
        if (!creator) return null;
        const isAssignedByOther = task.assigned_to && task.assigned_to !== task.user_id;
        return (
          <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-400">
            {isAssignedByOther ? "Assigned by" : "Created by"}{" "}
            <span className="font-semibold text-slate-600">{creator.name}</span>
            {" · "}{fmtIST(task.created_at)}
          </div>
        );
      })()}
    </div>
  );
}

/* ── Mobile board (tabs + list, no DnD) ──────────────────────────────────── */
function MobileBoard({ isAdmin, currentUserId, userNames, onAdd, onEdit, onDelete, onStatusChange }: {
  isAdmin: boolean; currentUserId: string; userNames: { id: string; name: string }[];
  onAdd: (s: TaskStatus) => void;
  onEdit: (t: AdminTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const byStatus = useAdminTaskStore((s) => s.byStatus);
  const [activeTab, setActiveTab] = useState<TaskStatus>("todo");

  const tabItems = COLUMNS.map(col => ({
    ...col,
    count: byStatus(col.id).length,
  }));

  const tasks = byStatus(activeTab);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tabs */}
      <div className="mb-3 flex shrink-0 rounded-xl border border-slate-200 bg-white p-1">
        {tabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition ${
              activeTab === tab.id ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-400">No tasks here</p>
          </div>
        ) : (
          tasks.map(task => (
            <MobileTaskCard
              key={task.id}
              task={task}
              canEditDelete={isAdmin || task.user_id === currentUserId}
              userNames={userNames}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>

      {/* Add task FAB */}
      <button
        onClick={() => onAdd(activeTab)}
        className="mt-4 w-full shrink-0 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
      >
        + Add Task
      </button>
    </div>
  );
}

/* ── Main Panel ──────────────────────────────────────────────────────────── */
export default function TasksPanel({
  initialTasks, users, userNames, currentUserId, isAdmin, canAssign,
}: {
  initialTasks: AdminTask[];
  users: AdminUserRow[];
  userNames: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
  canAssign: boolean;
}) {
  const { setTasks, moveTask, removeTask, filter, search, setFilter, setSearch } = useAdminTaskStore();
  const byStatus = useAdminTaskStore((s) => s.byStatus);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const fn = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>("todo");
  const [editTask, setEditTask] = useState<AdminTask | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const tasks = useAdminTaskStore(s => s.tasks);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks, setTasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

  function getTargetStatus(overId: string): TaskStatus | null {
    if (STATUSES.includes(overId as TaskStatus)) return overId as TaskStatus;
    return tasks.find(t => t.id === overId)?.status ?? null;
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const targetStatus = getTargetStatus(String(over.id));
    if (!targetStatus) return;
    const activeTask = tasks.find(t => t.id === String(active.id));
    if (activeTask && activeTask.status !== targetStatus) {
      moveTask(String(active.id), targetStatus);
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const targetStatus = getTargetStatus(String(over.id));
    if (!targetStatus) return;
    // Persist to DB regardless (covers both same-column reorder and cross-column)
    updateTaskStatusAction(String(active.id), targetStatus);
  }

  async function handleDelete(id: string) {
    await deleteTaskAction(id);
    removeTask(id);
    setConfirmDel(null);
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    moveTask(id, status);
    await updateTaskStatusAction(id, status);
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const FILTERS = [
    { key: "all",    label: "All" },
    { key: "urgent", label: "🔴 Urgent" },
    { key: "high",   label: "🟠 High" },
    { key: "medium", label: "🟡 Medium" },
    { key: "low",    label: "⚪ Low" },
    { key: "due",    label: "📅 Due" },
  ];

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Stats */}
      <div className="mb-5 shrink-0"><StatsBar /></div>

      {/* Filters + search */}
      <div className="mb-4 shrink-0">
        {/* Filter chips — horizontal scroll on mobile, wrap on desktop */}
        <div className="flex overflow-x-auto gap-1.5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === f.key ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>
              {f.label}
            </button>
          ))}
        </div>
        {/* Search — desktop only */}
        <div className="hidden sm:flex sm:justify-end sm:mt-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
        </div>
      </div>

      {/* Board — mobile tabs or desktop Kanban */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <MobileBoard
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            userNames={userNames}
            onAdd={(s) => { setModalStatus(s); setEditTask(null); setModalOpen(true); }}
            onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
            onDelete={(id) => setConfirmDel(id)}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners}
            onDragStart={({ active }) => setActiveId(String(active.id))}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full flex-row gap-4 overflow-x-auto overflow-y-hidden pb-4">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id} col={col} tasks={byStatus(col.id)}
                  isAdmin={isAdmin} currentUserId={currentUserId} userNames={userNames}
                  onAdd={(s) => { setModalStatus(s); setEditTask(null); setModalOpen(true); }}
                  onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
                  onDelete={(id) => setConfirmDel(id)}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 150 }}>
              {activeTask && (
                <div className="rotate-2 scale-105 shadow-2xl">
                  <TaskCard task={activeTask} canEditDelete={false} users={[]} onEdit={() => {}} onDelete={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setConfirmDel(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 font-bold text-slate-800">Delete task?</h3>
            <p className="mb-5 text-sm text-slate-500">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(confirmDel)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTask(null); }}
        editTask={editTask}
        isAdmin={isAdmin}
        canAssign={canAssign}
        userNames={userNames}
        currentUserId={currentUserId}
      />
    </div>
  );
}
