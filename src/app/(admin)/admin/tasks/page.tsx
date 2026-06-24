import { requireAccess } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { fetchTasksAction } from "./actions";
import { fetchUsersAction, fetchUserNamesAction } from "../users/actions";
import TasksPanel from "./TasksPanel";
import type { AdminTask } from "@/types/adminTask";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireAccess(PERMISSIONS.TASKS);

  const [tasks, users, userNames] = await Promise.all([
    fetchTasksAction().catch(() => [] as AdminTask[]),
    fetchUsersAction().catch(() => []),          // full list (admin only, for assign dropdown)
    fetchUserNamesAction().catch(() => []),      // id+name only (all users, for attribution)
  ]);

  return (
    <div className="flex h-full flex-col bg-slate-50 px-5 pt-6 md:px-8">
      <div className="shrink-0 pb-5">
        <p className="mb-0.5 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="font-display text-2xl font-bold text-bone sm:text-3xl">Task Board</h1>
        <p className="text-sm text-muted">{user.name} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-6">
        <TasksPanel
          initialTasks={tasks}
          users={users}
          userNames={userNames}
          currentUserId={user.id}
          isAdmin={user.role === "admin"}
          canAssign={user.role === "admin" || user.permissions.includes(PERMISSIONS.TASK_ASSIGN as Permission)}
        />
      </div>
    </div>
  );
}
