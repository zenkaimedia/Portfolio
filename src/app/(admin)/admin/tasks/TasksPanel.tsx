"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Task, Priority, Status } from "./actions";
import { createTaskAction, updateTaskAction, updateTaskStatusAction, deleteTaskAction } from "./actions";

/* ── Config ──────────────────────────────────────────────────────────────── */
const PRIORITY_CFG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  urgent: { label: "Urgent",  color: "text-ember",      bg: "bg-ember/10 border-ember/30",    dot: "bg-ember" },
  high:   { label: "High",    color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/30", dot: "bg-orange-400" },
  medium: { label: "Medium",  color: "text-gold",        bg: "bg-gold/10 border-gold/30",      dot: "bg-gold" },
  low:    { label: "Low",     color: "text-gold-soft/70", bg: "bg-line border-line",           dot: "bg-muted" },
};

const STATUS_CFG: Record<Status, { label: string; color: string; next: Status; nextLabel: string }> = {
  todo:        { label: "To Do",      color: "text-muted",     next: "in_progress", nextLabel: "Start →" },
  in_progress: { label: "In Progress", color: "text-gold",     next: "done",        nextLabel: "Complete ✓" },
  done:        { label: "Done",        color: "text-gold-soft", next: "todo",        nextLabel: "Reopen" },
};

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50 text-sm";

type FilterStatus = "all" | Status;

function isOverdue(due: string | null) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Confirm dialog ──────────────────────────────────────────────────────── */
function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl">
        <h3 className="mb-2 font-display text-lg font-bold text-bone">{title}</h3>
        <p className="mb-6 text-sm text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone">Cancel</button>
          <button onClick={onConfirm} className="rounded-full border border-ember/40 bg-ember/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ember hover:bg-ember/20">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Task form ───────────────────────────────────────────────────────────── */
function TaskForm({ initial, onSave, onCancel, busy }: {
  initial?: Partial<Task>;
  onSave: (data: { title: string; description: string; priority: Priority; status: Status; due_date: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [status, setStatus] = useState<Status>(initial?.status ?? "todo");
  const [due, setDue] = useState(initial?.due_date ?? "");
  const isEdit = !!initial?.id;

  return (
    <div className="rounded-2xl border border-gold/30 bg-ink-2/60 p-5 space-y-4">
      <h3 className="font-display text-base font-semibold text-bone">{isEdit ? "Edit Task" : "New Task"}</h3>

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" className={inputCls} autoFocus />
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Any details…" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
            {(["urgent","high","medium","low"] as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Status)} className={inputCls}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Due Date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={() => onSave({ title, description: desc, priority, status, due_date: due })}
          disabled={busy || !title.trim()}
          className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40">
          {busy ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
        </button>
        <button onClick={onCancel} className="font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-bone">Cancel</button>
      </div>
    </div>
  );
}

/* ── Task card ───────────────────────────────────────────────────────────── */
function TaskCard({ task, onEdit, onDelete, onStatusChange }: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: Status) => void;
}) {
  const p = PRIORITY_CFG[task.priority];
  const s = STATUS_CFG[task.status];
  const overdue = isOverdue(task.due_date) && task.status !== "done";
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl border bg-ink-2/40 p-5 transition-all ${task.status === "done" ? "opacity-60 border-line/40" : "border-line hover:border-line/80"}`}>
      <div className="flex items-start gap-3">
        {/* Priority dot */}
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={`font-display text-base font-semibold leading-tight ${task.status === "done" ? "text-muted line-through" : "text-bone"}`}>
              {task.title}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {/* Priority badge */}
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${p.bg} ${p.color}`}>
                {p.label}
              </span>
              {/* Status badge */}
              <span className={`font-mono text-[10px] ${s.color}`}>{s.label}</span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="mt-2">
              <p className={`text-sm leading-relaxed text-muted ${!expanded ? "line-clamp-2" : ""}`}>
                {task.description}
              </p>
              {task.description.length > 120 && (
                <button onClick={() => setExpanded(v => !v)} className="font-mono text-[10px] text-muted hover:text-bone">
                  {expanded ? "show less" : "show more"}
                </button>
              )}
            </div>
          )}

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {task.due_date && (
              <span className={`font-mono text-[10px] ${overdue ? "text-ember font-semibold" : "text-muted"}`}>
                {overdue ? "⚠ Overdue · " : "Due · "}{formatDate(task.due_date)}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted/50">
              {new Date(task.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onStatusChange(s.next)}
          className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
            task.status === "in_progress"
              ? "border-gold-soft/40 bg-gold-soft/10 text-gold-soft hover:bg-gold-soft/20"
              : task.status === "done"
                ? "border-line text-muted hover:text-bone"
                : "border-gold/40 bg-gold/5 text-gold hover:bg-gold/15"
          }`}
        >
          {s.nextLabel}
        </button>
        <button onClick={onEdit} className="rounded-full border border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted transition-colors hover:text-bone">Edit</button>
        <button onClick={onDelete} className="rounded-full border border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted transition-colors hover:text-ember hover:border-ember/40 ml-auto">Delete</button>
      </div>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function TasksPanel({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDel, setConfirmDel] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = tasks.filter(t => {
    const matchStatus = filter === "all" || t.status === filter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  // Sort: urgent/overdue first, then by priority, then by due date
  const sorted = [...filtered].sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    const pa = pOrder[a.priority], pb = pOrder[b.priority];
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1; if (b.due_date) return 1;
    return 0;
  });

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
  };
  const urgentCount = tasks.filter(t => t.priority === "urgent" && t.status !== "done").length;

  async function handleCreate(data: Parameters<typeof createTaskAction>[0]) {
    setBusy(true); setErr(null);
    const res = await createTaskAction(data);
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setTasks(prev => [res.task, ...prev]);
    setShowForm(false);
  }

  async function handleUpdate(data: Parameters<typeof updateTaskAction>[0]) {
    if (!editingTask) return;
    setBusy(true); setErr(null);
    const res = await updateTaskAction({ id: editingTask.id, ...data });
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setTasks(prev => prev.map(t => t.id === editingTask.id ? res.task : t));
    setEditingTask(null);
  }

  async function handleStatusChange(task: Task, status: Status) {
    const res = await updateTaskStatusAction(task.id, status);
    if ("error" in res) { setErr(res.error); return; }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t));
  }

  async function handleDelete(task: Task) {
    const res = await deleteTaskAction(task.id);
    if ("error" in res) { setErr(res.error); return; }
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setConfirmDel(null);
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
        {/* Status filter tabs */}
        <div className="flex gap-1 rounded-xl border border-line bg-panel/40 p-1">
          {([["all", "All"], ["todo", "To Do"], ["in_progress", "In Progress"], ["done", "Done"]] as [FilterStatus, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${filter === v ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"}`}>
              {label} {counts[v as keyof typeof counts] > 0 && <span className="ml-0.5 opacity-60">({counts[v as keyof typeof counts]})</span>}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | "all")}
          className="rounded-lg border border-line bg-ink px-3 py-1.5 font-mono text-[10px] text-bone outline-none focus:border-gold">
          <option value="all">All priorities</option>
          {(["urgent","high","medium","low"] as Priority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
          ))}
        </select>

        {urgentCount > 0 && (
          <span className="rounded-full border border-ember/40 bg-ember/10 px-3 py-1 font-mono text-[10px] text-ember">
            ❗ {urgentCount} urgent
          </span>
        )}

        {!showForm && !editingTask && (
          <button onClick={() => setShowForm(true)}
            className="ml-auto rounded-full border border-gold/40 bg-gold/10 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20">
            + New Task
          </button>
        )}
      </div>

      {err && <p className="mb-3 shrink-0 font-mono text-xs text-ember">{err}</p>}

      {/* Task list */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {showForm && (
          <TaskForm onSave={data => handleCreate(data as Parameters<typeof createTaskAction>[0])} onCancel={() => setShowForm(false)} busy={busy} />
        )}

        {sorted.length === 0 && !showForm && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
            <div>
              <p className="mb-1 font-display text-base font-semibold text-bone">
                {filter === "all" ? "No tasks yet" : `No ${STATUS_CFG[filter as Status]?.label.toLowerCase() ?? filter} tasks`}
              </p>
              <p className="text-sm text-muted">
                {filter === "all" ? "Create your first task to get started." : "Nothing here right now."}
              </p>
            </div>
          </div>
        )}

        {sorted.map(task =>
          editingTask?.id === task.id ? (
            <TaskForm
              key={task.id}
              initial={task}
              onSave={data => handleUpdate({ ...data, id: task.id } as Parameters<typeof updateTaskAction>[0])}
              onCancel={() => setEditingTask(null)}
              busy={busy}
            />
          ) : (
            <motion.div key={task.id} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
              <TaskCard
                task={task}
                onEdit={() => { setEditingTask(task); setShowForm(false); }}
                onDelete={() => setConfirmDel(task)}
                onStatusChange={(s) => handleStatusChange(task, s)}
              />
            </motion.div>
          )
        )}
      </div>

      <AnimatePresence>
        {confirmDel && (
          <ConfirmDialog
            title={`Delete "${confirmDel.title}"?`}
            message="This task will be permanently deleted."
            onConfirm={() => handleDelete(confirmDel)}
            onCancel={() => setConfirmDel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
