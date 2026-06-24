import { create } from "zustand";
import type { AdminTask, TaskStatus } from "@/types/adminTask";

interface AdminTaskStore {
  tasks: AdminTask[];
  filter: string;
  search: string;
  userFilter: string; // user id or "all"
  setTasks: (t: AdminTask[]) => void;
  addTask: (t: AdminTask) => void;
  updateTask: (id: string, u: Partial<AdminTask>) => void;
  removeTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  setFilter: (f: string) => void;
  setSearch: (s: string) => void;
  setUserFilter: (id: string) => void;
  byStatus: (status: TaskStatus) => AdminTask[];
  stats: () => { total: number; inProgress: number; done: number; overdue: number };
}

export const useAdminTaskStore = create<AdminTaskStore>((set, get) => ({
  tasks: [],
  filter: "all",
  search: "",
  userFilter: "all",

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, u) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...u } : t) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  moveTask: (id, status) => set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status } : t) })),
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setUserFilter: (userFilter) => set({ userFilter }),

  byStatus: (status) => {
    const { tasks, filter, search, userFilter } = get();
    return tasks
      .filter((t) => t.status === status)
      .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "due") return !!t.due_date && t.status !== "done" && new Date(t.due_date) < new Date();
        return t.priority === filter;
      })
      .filter((t) => {
        if (userFilter === "all") return true;
        // Task belongs to whoever needs to do it:
        // assigned_to if set, otherwise the creator (user_id)
        const owner = t.assigned_to || t.user_id;
        return owner === userFilter;
      })
      .sort((a, b) => {
        const p = { urgent: 0, high: 1, medium: 2, low: 3 };
        return p[a.priority] - p[b.priority] || a.sort_order - b.sort_order;
      });
  },

  stats: () => {
    const { tasks } = get();
    const now = new Date();
    return {
      total: tasks.length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
      overdue: tasks.filter((t) => t.due_date && t.status !== "done" && new Date(t.due_date) < now).length,
    };
  },
}));
