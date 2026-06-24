"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { taskSupabase } from "@/lib/supabase";
import { useTaskStore } from "@/store/taskStore";
import type { TaskCard, TaskStatus } from "@/types/task";
import KanbanColumn from "@/components/tasks/KanbanColumn";
import TaskCardComponent from "@/components/tasks/TaskCard";
import TaskModal from "@/components/tasks/TaskModal";
import StatsBar from "@/components/tasks/StatsBar";

const COLUMNS: TaskStatus[] = ["todo", "inprogress", "done"];

/* ── Login Form ──────────────────────────────────────────────────────────── */
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    const { error } = await taskSupabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
  }

  const inputCls = "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">Task Manager</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to access your board</p>
        {err && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</p>}
        <form onSubmit={login} className="space-y-4">
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Email" className={inputCls} />
          <div className="relative">
            <input value={password} onChange={e => setPassword(e.target.value)} type={show ? "text" : "password"} required placeholder="Password" className={`${inputCls} pr-16`} />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600">{show ? "Hide" : "Show"}</button>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Main Board ──────────────────────────────────────────────────────────── */
export default function TasksPage() {
  const { tasks, currentUser, setTasks, setProfiles, setCurrentUser, setFilter, setSearchQuery,
    tasksByStatus, moveTask, filter, searchQuery } = useTaskStore();

  const [session, setSession] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>("todo");
  const [editTask, setEditTask] = useState<TaskCard | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Auth check
  useEffect(() => {
    taskSupabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });
    const { data: { subscription } } = taskSupabase.auth.onAuthStateChange((_e, s) => {
      setSession(!!s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    const { data: { user } } = await taskSupabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: profiles }, { data: tasksData }] = await Promise.all([
      taskSupabase.from("profiles").select("*").eq("id", user.id).single(),
      taskSupabase.from("profiles").select("*").order("full_name"),
      taskSupabase.from("task_cards").select("*, profile:profiles(*)").order("created_at", { ascending: false }),
    ]);

    if (profile) setCurrentUser(profile);
    if (profiles) setProfiles(profiles);
    if (tasksData) setTasks(tasksData as TaskCard[]);
  }, [setCurrentUser, setProfiles, setTasks]);

  useEffect(() => {
    if (!session) return;
    loadData();

    // Real-time subscription
    const channel = taskSupabase
      .channel("task_cards")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_cards" }, () => {
        loadData();
      })
      .subscribe();

    return () => { taskSupabase.removeChannel(channel); };
  }, [session, loadData]);

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const overStatus = over.id as TaskStatus;
    if (COLUMNS.includes(overStatus)) {
      // Dropped on a column
      const task = tasks.find(t => t.id === active.id);
      if (task && task.status !== overStatus) {
        moveTask(String(active.id), overStatus);
        taskSupabase.from("task_cards").update({ status: overStatus }).eq("id", active.id);
      }
    }
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const overId = over.id as string;
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && overTask.status !== tasks.find(t => t.id === active.id)?.status) {
      moveTask(String(active.id), overTask.status);
    }
  }

  if (session === null) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!session) return <LoginForm />;

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const isAdmin = currentUser?.role === "admin";

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "my", label: "My Tasks" },
    { key: "high", label: "High Priority" },
    { key: "design", label: "Design" },
    { key: "development", label: "Development" },
    { key: "marketing", label: "Marketing" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-screen-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Task Board</h1>
              <p className="text-sm text-slate-500">{currentUser?.full_name} · {currentUser?.role}</p>
            </div>
            <button
              onClick={() => taskSupabase.auth.signOut()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-6 py-6">
        {/* Stats */}
        <div className="mb-6"><StatsBar /></div>

        {/* Filters + Search */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === f.key ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks…"
            className="ml-auto w-56 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Kanban Board */}
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:overflow-x-auto sm:pb-4">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col}
                status={col}
                tasks={tasksByStatus(col)}
                onAddTask={(status) => { setModalStatus(status); setEditTask(null); setModalOpen(true); }}
                onEdit={(task) => { setEditTask(task); setModalOpen(true); }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <div className="rotate-2 opacity-90"><TaskCardComponent task={activeTask} /></div>}
          </DragOverlay>
        </DndContext>
      </div>

      {isAdmin && (
        <TaskModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditTask(null); }}
          editTask={editTask}
          defaultStatus={modalStatus}
        />
      )}
    </div>
  );
}
