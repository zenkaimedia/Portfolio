"use client";

import { useRef, useState } from "react";
import type { Task, Priority, Status } from "./actions";
import { createTaskAction, updateTaskAction, updateTaskStatusAction, deleteTaskAction } from "./actions";

/* ── Config ──────────────────────────────────────────────────────────────── */
const PRIORITIES: { key: Priority; label: string; dot: string; text: string }[] = [
  { key: "urgent", label: "Urgent", dot: "bg-ember",      text: "text-ember" },
  { key: "high",   label: "High",   dot: "bg-orange-400", text: "text-orange-400" },
  { key: "medium", label: "Medium", dot: "bg-gold",       text: "text-gold" },
  { key: "low",    label: "Low",    dot: "bg-muted/60",   text: "text-muted" },
];

function PriorityDot({ priority }: { priority: Priority }) {
  const cfg = PRIORITIES.find(p => p.key === priority)!;
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} title={cfg.label} />;
}

function isOverdue(due: string | null, status: Status) {
  if (!due || status === "done") return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function fmtDate(d: string) {
  const date = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type Filter = "all" | "active" | "done";

/* ── Quick-add bar ───────────────────────────────────────────────────────── */
function QuickAdd({ onAdd, busy }: { onAdd: (title: string, priority: Priority, due: string) => void; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!title.trim()) return;
    onAdd(title.trim(), priority, due);
    setTitle(""); setDue("");
    inputRef.current?.focus();
  }

  return (
    <div className="mb-5 flex items-center gap-2 rounded-2xl border border-line bg-ink-2/40 p-3">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); }}
        placeholder="Add a task… (press Enter)"
        className="flex-1 bg-transparent text-sm text-bone outline-none placeholder:text-muted/50"
      />

      {/* Priority selector */}
      <div className="flex items-center gap-1">
        {PRIORITIES.map(p => (
          <button
            key={p.key}
            onClick={() => setPriority(p.key)}
            title={p.label}
            className={`h-5 w-5 rounded-full border-2 transition-all ${p.dot} ${priority === p.key ? "border-white/60 scale-110" : "border-transparent opacity-40 hover:opacity-70"}`}
          />
        ))}
      </div>

      {/* Due date */}
      <input
        type="date"
        value={due}
        onChange={e => setDue(e.target.value)}
        className="w-[130px] rounded-lg border border-line bg-ink px-2 py-1 font-mono text-[11px] text-bone outline-none focus:border-gold"
      />

      <button
        onClick={submit}
        disabled={busy || !title.trim()}
        className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}

/* ── Inline edit row ─────────────────────────────────────────────────────── */
function EditRow({ task, onSave, onCancel }: {
  task: Task;
  onSave: (title: string, desc: string, priority: Priority, due: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(task.due_date ?? "");

  return (
    <div className="rounded-xl border border-gold/30 bg-ink-2/60 p-4 space-y-3">
      <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent text-sm font-medium text-bone outline-none border-b border-line pb-1 focus:border-gold" autoFocus />
      <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Description (optional)" className="w-full bg-transparent text-sm text-muted outline-none resize-none placeholder:text-muted/40" />
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {PRIORITIES.map(p => (
            <button key={p.key} onClick={() => setPriority(p.key)} title={p.label}
              className={`h-5 w-5 rounded-full border-2 transition-all ${p.dot} ${priority === p.key ? "border-white/60 scale-110" : "border-transparent opacity-40 hover:opacity-70"}`} />
          ))}
        </div>
        <input type="date" value={due} onChange={e => setDue(e.target.value)} className="rounded-lg border border-line bg-ink px-2 py-1 font-mono text-[11px] text-bone outline-none focus:border-gold" />
        <div className="ml-auto flex gap-2">
          <button onClick={() => onSave(title, desc, priority, due)} disabled={!title.trim()} className="font-mono text-[11px] text-gold hover:text-gold/80">Save</button>
          <button onClick={onCancel} className="font-mono text-[11px] text-muted hover:text-bone">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Task row ────────────────────────────────────────────────────────────── */
function TaskRow({ task, onToggle, onEdit, onDelete }: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "done";
  const overdue = isOverdue(task.due_date, task.status);
  const priorityCfg = PRIORITIES.find(p => p.key === task.priority)!;

  return (
    <div className={`group flex items-start gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.03] ${done ? "opacity-50" : ""}`}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${
          done ? "border-gold bg-gold text-ink" : "border-line hover:border-gold/60"
        }`}
      >
        {done && <span className="text-[10px] font-bold">✓</span>}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PriorityDot priority={task.priority} />
          <span className={`text-sm font-medium ${done ? "line-through text-muted" : "text-bone"}`}>
            {task.title}
          </span>
          {!done && task.priority === "urgent" && (
            <span className="rounded-full bg-ember/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-ember">Urgent</span>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted/70">{task.description}</p>
        )}
        {task.due_date && (
          <p className={`mt-0.5 font-mono text-[10px] ${overdue ? "text-ember" : "text-muted/60"}`}>
            {overdue ? "⚠ " : ""}{fmtDate(task.due_date)}
          </p>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onEdit} className="rounded px-2 py-1 font-mono text-[10px] text-muted hover:text-gold">Edit</button>
        <button onClick={onDelete} className="rounded px-1.5 py-1 font-mono text-[11px] text-muted hover:text-ember">×</button>
      </div>
    </div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function TasksPanel({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<Filter>("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = tasks
    .filter(t => filter === "all" ? true : filter === "active" ? t.status !== "done" : t.status === "done")
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });

  const activeCount = tasks.filter(t => t.status !== "done").length;
  const urgentCount = tasks.filter(t => t.priority === "urgent" && t.status !== "done").length;

  async function handleAdd(title: string, priority: Priority, due: string) {
    setBusy(true);
    const res = await createTaskAction({ title, description: "", priority, due_date: due });
    setBusy(false);
    if ("ok" in res) setTasks(prev => [res.task, ...prev]);
  }

  async function handleToggle(task: Task) {
    const next: Status = task.status === "done" ? "todo" : "done";
    const res = await updateTaskStatusAction(task.id, next);
    if ("ok" in res) setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
  }

  async function handleEdit(id: string, title: string, desc: string, priority: Priority, due: string) {
    const task = tasks.find(t => t.id === id)!;
    const res = await updateTaskAction({ id, title, description: desc, priority, status: task.status, due_date: due });
    if ("ok" in res) {
      setTasks(prev => prev.map(t => t.id === id ? res.task : t));
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteTaskAction(id);
    if ("ok" in res) setTasks(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Quick add */}
      <QuickAdd onAdd={handleAdd} busy={busy} />

      {/* Filter + stats */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-line bg-panel/40 p-0.5">
          {([["active", "Active"], ["all", "All"], ["done", "Done"]] as [Filter, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${filter === v ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"}`}>
              {l}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-muted">{activeCount} remaining</span>
        {urgentCount > 0 && (
          <span className="font-mono text-[11px] text-ember">❗ {urgentCount} urgent</span>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-line">
        {filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted">
              {filter === "done" ? "No completed tasks." : "No tasks — add one above!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/40">
            {filtered.map(task =>
              editingId === task.id ? (
                <div key={task.id} className="px-2 py-2">
                  <EditRow
                    task={task}
                    onSave={(title, desc, priority, due) => handleEdit(task.id, title, desc, priority, due)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggle(task)}
                  onEdit={() => setEditingId(task.id)}
                  onDelete={() => handleDelete(task.id)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex shrink-0 items-center gap-4">
        {PRIORITIES.map(p => (
          <span key={p.key} className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
            <span className={`h-2 w-2 rounded-full ${p.dot}`} />{p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
