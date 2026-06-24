"use client";

import { useEffect, useState } from "react";
import type { TaskCard, Priority, Category, TaskStatus, Profile } from "@/types/task";
import { taskSupabase } from "@/lib/supabase";
import { useTaskStore } from "@/store/taskStore";

interface Props {
  open: boolean;
  onClose: () => void;
  editTask?: TaskCard | null;
  defaultStatus?: TaskStatus;
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

export default function TaskModal({ open, onClose, editTask, defaultStatus = "todo" }: Props) {
  const { profiles, currentUser, addTask, updateTask } = useTaskStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<Category>("development");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDesc(editTask.description ?? "");
      setPriority(editTask.priority);
      setCategory(editTask.category);
      setStatus(editTask.status);
      setAssignedTo(editTask.assigned_to ?? "");
      setDueDate(editTask.due_date ?? "");
      setProgress(editTask.progress);
    } else {
      setTitle(""); setDesc(""); setPriority("medium"); setCategory("development");
      setStatus(defaultStatus); setAssignedTo(""); setDueDate(""); setProgress(0);
    }
    setErr("");
  }, [editTask, open, defaultStatus]);

  if (!open) return null;

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    if (!currentUser) return;
    setSaving(true); setErr("");

    const payload = {
      title: title.trim(), description: desc.trim() || null,
      priority, category, status,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      progress,
    };

    if (editTask) {
      const { data, error } = await taskSupabase
        .from("task_cards").update(payload).eq("id", editTask.id).select("*, profile:profiles(*)").single();
      if (error) { setErr(error.message); setSaving(false); return; }
      updateTask(editTask.id, data as TaskCard);
    } else {
      const { data, error } = await taskSupabase
        .from("task_cards").insert({ ...payload, created_by: currentUser.id }).select("*, profile:profiles(*)").single();
      if (error) { setErr(error.message); setSaving(false); return; }
      addTask(data as TaskCard);
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{editTask ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className={inputCls} autoFocus />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Optional description" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category)} className={inputCls}>
                <option value="design">Design</option>
                <option value="development">Development</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inputCls}>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Assign To</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputCls}>
              <option value="">— Unassigned —</option>
              {profiles.map((p: Profile) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
              ))}
            </select>
          </div>

          {(status === "inprogress" || editTask?.status === "inprogress") && (
            <div>
              <label className={labelCls}>Progress: {progress}%</label>
              <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(+e.target.value)}
                className="w-full accent-blue-500" />
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : editTask ? "Save Changes" : "Create Task"}
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
