"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskCard as TaskCardType, TaskStatus } from "@/types/task";
import TaskCard from "./TaskCard";
import { useTaskStore } from "@/store/taskStore";

const COLUMN_CFG: Record<TaskStatus, { title: string; color: string; badge: string; dot: string }> = {
  todo:       { title: "To Do",       color: "border-slate-300",  badge: "bg-slate-100 text-slate-600",  dot: "bg-slate-400" },
  inprogress: { title: "In Progress", color: "border-blue-300",   badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  done:       { title: "Done",        color: "border-green-300",  badge: "bg-green-100 text-green-700",  dot: "bg-green-500" },
};

interface Props {
  status: TaskStatus;
  tasks: TaskCardType[];
  onAddTask: (status: TaskStatus) => void;
  onEdit: (task: TaskCardType) => void;
}

export default function KanbanColumn({ status, tasks, onAddTask, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const currentUser = useTaskStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === "admin";
  const cfg = COLUMN_CFG[status];

  return (
    <div className="flex h-full min-h-[400px] w-full flex-col sm:w-80 xl:flex-1">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <h3 className="text-sm font-bold text-slate-700">{cfg.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
            {tasks.length}
          </span>
        </div>
        {isAdmin && (
          <button
            onClick={() => onAddTask(status)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="text-base leading-none">+</span> Add
          </button>
        )}
      </div>

      {/* Droppable area */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-1 flex-col gap-3 rounded-2xl border-2 border-dashed p-3 transition-colors ${
            isOver ? `${cfg.color} bg-blue-50/40` : "border-transparent"
          }`}
        >
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-400">No tasks here</p>
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
