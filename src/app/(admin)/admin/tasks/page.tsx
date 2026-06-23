import { requireAccess } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchTasksAction } from "./actions";
import TasksPanel from "./TasksPanel";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireAccess(PERMISSIONS.TASKS);
  const tasks = await fetchTasksAction().catch(() => []);

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">
          {user.name}&apos;s Tasks
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Your personal task board — only you can see these.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <TasksPanel initialTasks={tasks} />
      </div>
    </div>
  );
}
