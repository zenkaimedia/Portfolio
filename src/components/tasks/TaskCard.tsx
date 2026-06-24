"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, parseISO } from "date-fns";
import type { TaskCard as TaskCardType } from "@/types/task";
import { useTaskStore } from "@/store/taskStore";
import { taskSupabase } from "@/lib/supabase";
import { useState } from "react";

const PRIORITY_CFG = {
  high:   { label: "High",   cls: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  low:    { label: "Low",    cls: "bg-green-100 text-green-700 border-green-200" },
};

const CATEGORY_CFG = {
  design:      { cls: "bg-purple-100 text-purple-700" },
  development: { cls: "bg-blue-100 text-blue-700" },
  marketing:   { cls: "bg-pink-100 text-pink-700" },
};

interface Props {
  task: TaskCardType;
  onEdit?: (task: TaskCardType) => void;
}

export default function TaskCard({ task, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const currentUser = useTaskStore((s) => s.currentUser);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const isAdmin = currentUser?.role === "admin";
  const isDone = task.status === "done";
  const isOverdue = task.due_date && !isDone && isPast(parseISO(task.due_date));
  const [menuOpen, setMenuOpen] = useState(false);

  const priority = PRIORITY_CFG[task.priority];
  const category = CATEGORY_CFG[task.category];

  async function handleDelete() {
    setMenuOpen(false);
    await taskSupabase.from("task_cards").delete().eq("id", task.id);
    deleteTask(task.id);
  }

  const initials = task.profile?.avatar_initials ?? task.profile?.full_name?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative select-none rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isDone ? "opacity-60" : ""
      } ${task.status === "inprogress" ? "border-l-4 border-l-blue-500 border-r border-t border-b border-slate-200" : "border-slate-200"}`}
    >
      {/* 3-dot menu (admin only) */}
      {isAdmin && (
        <div className="absolute right-3 top-3">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-0 top-7 z-50 min-w-[130px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(task); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                ✏️ Edit
              </button>
              <button onClick={handleDelete}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${priority.cls}`}>
          {priority.label}
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${category.cls}`}>
          {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
        </span>
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold leading-snug text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>
      )}

      {/* Progress bar (inprogress only) */}
      {task.status === "inprogress" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Progress</span><span>{task.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        {/* Avatar */}
        {task.profile && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600" title={task.profile.full_name}>
            {initials}
          </div>
        )}
        {!task.profile && <span />}

        {/* Due date */}
        {task.due_date && (
          <span className={`text-[11px] font-medium ${isOverdue ? "text-red-600" : "text-slate-400"}`}>
            {isOverdue ? "⚠ " : "📅 "}
            {format(parseISO(task.due_date), "MMM d")}
          </span>
        )}
      </div>
    </div>
  );
}
