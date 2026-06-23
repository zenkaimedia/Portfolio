"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AdminUserRow } from "./actions";
import { createUserAction, updateUserAction, toggleUserActiveAction, deleteUserAction } from "./actions";
import { PERMISSIONS } from "@/lib/auth";

const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/50";

const ALL_PERMISSIONS = [
  { key: PERMISSIONS.PROJECTS,    label: "Manage Projects",     desc: "Add, edit, delete projects" },
  { key: PERMISSIONS.SHARE,       label: "Portfolio Sharing",    desc: "Access sharing page" },
  { key: PERMISSIONS.MESSAGES,    label: "Message Templates",    desc: "Manage message templates" },
  { key: PERMISSIONS.STORAGE,     label: "Storage",              desc: "View and clean storage" },
  { key: PERMISSIONS.COMPRESS,    label: "Compress Media",       desc: "Compress images" },
  { key: PERMISSIONS.BRAND_STORY, label: "Brand Story & FAQs",  desc: "Edit brand content" },
];

function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl">
        <h3 className="mb-2 font-display text-lg font-bold text-bone">{title}</h3>
        <p className="mb-6 text-sm leading-relaxed text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone">Cancel</button>
          <button onClick={onConfirm} className="rounded-full border border-ember/40 bg-ember/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ember hover:bg-ember/20">Confirm</button>
        </div>
      </motion.div>
    </div>
  );
}

function PermissionsCheckbox({ permissions, onChange, disabled }: {
  permissions: string[]; onChange: (p: string[]) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {ALL_PERMISSIONS.map(({ key, label, desc }) => (
        <label key={key} className={`flex items-start gap-3 rounded-lg border border-line p-3 transition-colors ${disabled ? "opacity-40" : "cursor-pointer hover:border-gold/30"}`}>
          <input
            type="checkbox"
            checked={permissions.includes(key)}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.checked) onChange([...permissions, key]);
              else onChange(permissions.filter(p => p !== key));
            }}
            className="mt-0.5 h-4 w-4 accent-gold"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-bone">{label}</p>
            <p className="font-mono text-[10px] text-muted">{desc}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, busy }: {
  initial?: Partial<AdminUserRow & { password: string }>;
  onSave: (data: { name: string; email: string; password: string; role: "admin" | "user"; permissions: string[]; newPassword?: string }) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">(initial?.role ?? "user");
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions ?? []);
  const isEdit = !!initial?.id;

  return (
    <div className="space-y-4 rounded-2xl border border-gold/30 bg-ink-2/60 p-5">
      <h3 className="font-display text-base font-semibold text-bone">{isEdit ? "Edit User" : "Add New User"}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className={inputCls} autoFocus />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jane@zenkai.in" className={inputCls} disabled={isEdit} />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{isEdit ? "New Password (leave blank to keep)" : "Password"}</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={isEdit ? "Leave blank to keep current" : "Set a password"} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Role</label>
          <select value={role} onChange={e => setRole(e.target.value as "admin" | "user")} className={inputCls}>
            <option value="admin">Admin — full access</option>
            <option value="user">User — permission-based</option>
          </select>
        </div>
      </div>

      {role === "user" && (
        <div>
          <label className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Permissions</label>
          <PermissionsCheckbox permissions={permissions} onChange={setPermissions} />
        </div>
      )}
      {role === "admin" && (
        <p className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 font-mono text-[11px] text-muted">
          Admin role grants full access to all features automatically.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onSave({ name, email, password, role, permissions, newPassword: isEdit && password ? password : undefined })}
          disabled={busy || !name.trim() || (!isEdit && (!email.trim() || !password))}
          className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-40"
        >
          {busy ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
        </button>
        <button onClick={onCancel} className="font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-bone">Cancel</button>
      </div>
    </div>
  );
}

function UserCard({ user, isSelf, onEdit, onToggle, onDelete }: {
  user: AdminUserRow; isSelf: boolean;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`rounded-2xl border bg-ink-2/40 p-5 transition-all ${user.is_active ? "border-line" : "border-line/40 opacity-60"}`}>
      <div className="flex items-start gap-4">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-[13px] font-bold ${user.role === "admin" ? "bg-gold/20 text-gold" : "bg-line text-muted"}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-semibold text-bone">{user.name}</span>
            {isSelf && <span className="rounded-full bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-gold">You</span>}
            <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${user.role === "admin" ? "bg-gold/15 text-gold" : "bg-line text-muted"}`}>{user.role}</span>
            {!user.is_active && <span className="rounded-full bg-ember/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ember">Inactive</span>}
          </div>
          <p className="font-mono text-[11px] text-muted">{user.email}</p>
          {user.last_login_at && (
            <p className="font-mono text-[10px] text-muted/60">
              Last login: {new Date(user.last_login_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {user.role === "user" && user.permissions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {user.permissions.map(p => (
                <span key={p} className="rounded bg-ink px-1.5 py-0.5 font-mono text-[9px] text-muted">{p}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.15em]">
            <button onClick={onEdit} className="text-muted hover:text-gold">Edit</button>
            {!isSelf && (
              <>
                <button onClick={onToggle} className={user.is_active ? "text-muted hover:text-gold" : "text-muted hover:text-gold-soft"}>
                  {user.is_active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={onDelete} className="text-muted hover:text-ember">Remove</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UsersPanel({ initialUsers, currentUserId }: {
  initialUsers: AdminUserRow[]; currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  async function handleCreate(data: Parameters<typeof createUserAction>[0]) {
    setBusy(true); setErr(null);
    const res = await createUserAction(data);
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setUsers(prev => [...prev, res.user]);
    setShowForm(false);
  }

  async function handleUpdate(data: { name: string; email: string; password: string; role: "admin" | "user"; permissions: string[]; newPassword?: string }) {
    if (!editingUser) return;
    setBusy(true); setErr(null);
    const res = await updateUserAction({
      id: editingUser.id,
      name: data.name,
      role: data.role,
      permissions: data.permissions,
      is_active: editingUser.is_active,
      newPassword: data.newPassword,
    });
    setBusy(false);
    if ("error" in res) { setErr(res.error); return; }
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: data.name, role: data.role, permissions: data.permissions } : u));
    setEditingUser(null);
  }

  function confirmToggle(user: AdminUserRow) {
    const next = !user.is_active;
    setConfirm({
      title: `${next ? "Activate" : "Deactivate"} ${user.name}?`,
      message: next
        ? `${user.name} will be able to log in again.`
        : `${user.name} will be immediately signed out and unable to log in.`,
      onConfirm: async () => {
        setConfirm(null);
        const res = await toggleUserActiveAction(user.id, next);
        if ("error" in res) { setErr(res.error); return; }
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: next } : u));
      },
    });
  }

  function confirmDelete(user: AdminUserRow) {
    setConfirm({
      title: `Remove ${user.name}?`,
      message: `This permanently removes ${user.name} (${user.email}) from the team. Their activity log is preserved.`,
      onConfirm: async () => {
        setConfirm(null);
        const res = await deleteUserAction(user.id);
        if ("error" in res) { setErr(res.error); return; }
        setUsers(prev => prev.filter(u => u.id !== user.id));
      },
    });
  }

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-muted">{users.length} team member{users.length !== 1 ? "s" : ""}</span>
        {!showForm && !editingUser && (
          <button onClick={() => setShowForm(true)}
            className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.22em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20">
            + Add User
          </button>
        )}
      </div>

      {err && <p className="mb-3 shrink-0 font-mono text-xs text-ember">{err}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {showForm && (
          <UserForm onSave={handleCreate} onCancel={() => setShowForm(false)} busy={busy} />
        )}

        {users.map(user =>
          editingUser?.id === user.id ? (
            <UserForm
              key={user.id}
              initial={user}
              onSave={handleUpdate}
              onCancel={() => setEditingUser(null)}
              busy={busy}
            />
          ) : (
            <motion.div key={user.id} layout transition={{ type: "spring", stiffness: 400, damping: 35 }}>
              <UserCard
                user={user}
                isSelf={user.id === currentUserId}
                onEdit={() => { setEditingUser(user); setShowForm(false); }}
                onToggle={() => confirmToggle(user)}
                onDelete={() => confirmDelete(user)}
              />
            </motion.div>
          )
        )}
      </div>

      <AnimatePresence>
        {confirm && (
          <ConfirmDialog
            title={confirm.title}
            message={confirm.message}
            onConfirm={confirm.onConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
