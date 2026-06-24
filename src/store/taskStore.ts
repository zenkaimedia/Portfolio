import { create } from "zustand";
import type { TaskCard, Profile, TaskStatus } from "@/types/task";

interface TaskStore {
  tasks: TaskCard[];
  profiles: Profile[];
  currentUser: Profile | null;
  filter: string;
  searchQuery: string;

  setTasks: (tasks: TaskCard[]) => void;
  setProfiles: (profiles: Profile[]) => void;
  setCurrentUser: (user: Profile | null) => void;
  setFilter: (filter: string) => void;
  setSearchQuery: (q: string) => void;

  addTask: (task: TaskCard) => void;
  updateTask: (id: string, updates: Partial<TaskCard>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;

  filteredTasks: () => TaskCard[];
  tasksByStatus: (status: TaskStatus) => TaskCard[];
  stats: () => { total: number; inProgress: number; completed: number; overdue: number };
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  profiles: [],
  currentUser: null,
  filter: "all",
  searchQuery: "",

  setTasks: (tasks) => set({ tasks }),
  setProfiles: (profiles) => set({ profiles }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, updates) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  moveTask: (id, status) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),

  filteredTasks: () => {
    const { tasks, filter, searchQuery, currentUser } = get();
    let result = [...tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case "my":
        result = result.filter((t) => t.assigned_to === currentUser?.id);
        break;
      case "high":
        result = result.filter((t) => t.priority === "high");
        break;
      case "design":
      case "development":
      case "marketing":
        result = result.filter((t) => t.category === filter);
        break;
    }
    return result;
  },

  tasksByStatus: (status) => get().filteredTasks().filter((t) => t.status === status),

  stats: () => {
    const { tasks } = get();
    const now = new Date();
    return {
      total: tasks.length,
      inProgress: tasks.filter((t) => t.status === "inprogress").length,
      completed: tasks.filter((t) => t.status === "done").length,
      overdue: tasks.filter(
        (t) =>
          t.due_date &&
          t.status !== "done" &&
          new Date(t.due_date) < now
      ).length,
    };
  },
}));
