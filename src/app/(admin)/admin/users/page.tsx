import { requireAccess, getCurrentUser } from "@/lib/auth";
import { fetchUsersAction } from "./actions";
import UsersPanel from "./UsersPanel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAccess("admin");
  const [users, me] = await Promise.all([fetchUsersAction(), getCurrentUser()]);

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">User Management</h1>
        <p className="text-sm leading-relaxed text-muted">
          Add team members, set their roles and permissions, and manage access.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <UsersPanel initialUsers={users} currentUserId={me?.id ?? ""} iAmSuperAdmin={me?.is_super_admin ?? false} />
      </div>
    </div>
  );
}
