"use client";

import { useTaskStore } from "@/store/taskStore";

export default function StatsBar() {
  const stats = useTaskStore((s) => s.stats());

  const items = [
    { label: "Total Tasks",  value: stats.total,      color: "text-slate-700",  bg: "bg-slate-50",  border: "border-slate-200" },
    { label: "In Progress",  value: stats.inProgress, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
    { label: "Completed",    value: stats.completed,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
    { label: "Overdue",      value: stats.overdue,    color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`rounded-xl border ${item.border} ${item.bg} p-4`}>
          <p className="text-sm font-medium text-slate-500">{item.label}</p>
          <p className={`mt-1 text-3xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
