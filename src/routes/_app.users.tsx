import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, type ManagedUser, type UserRole } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { UserPlus, KeyRound, Power, ShieldCheck, ShieldOff, X } from "lucide-react";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "User Management — SecureWatch" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") navigate({ to: "/dashboard" });
  }, [user, navigate]);

  function refresh() { api.listUsers().then(setUsers); }
  useEffect(() => { refresh(); }, []);

  async function toggleActive(u: ManagedUser) {
    await api.setUserActive(u.id, !u.is_active);
    toast.success(`${u.username} ${u.is_active ? "deactivated" : "activated"}`);
    refresh();
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="p-8">
      <PageHeader
        title="User Management"
        subtitle="Create and manage authorized personnel accounts."
        actions={
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90">
            <UserPlus className="h-4 w-4" /> Create User
          </button>
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Created Date</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-primary/15 text-primary capitalize">
                    {u.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                    {u.role === "admin" ? "Administrator" : "Security Personnel"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                    u.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                  {u.must_change_password && (
                    <span className="ml-2 text-[11px] text-warn">password reset pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => setResetTarget(u)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-warn/15 text-warn hover:bg-warn/25">
                    <KeyRound className="h-3.5 w-3.5" /> Reset Password
                  </button>
                  <button onClick={() => toggleActive(u)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
                      u.is_active ? "bg-threat/15 text-threat hover:bg-threat/25" : "bg-success/15 text-success hover:bg-success/25"
                    }`}>
                    <Power className="h-3.5 w-3.5" /> {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { refresh(); setShowCreate(false); }} />}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => { refresh(); setResetTarget(null); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("security");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim().length < 3) return toast.error("Username too short");
    if (password.length < 6) return toast.error("Temporary password must be at least 6 characters");
    setBusy(true);
    try {
      await api.createUser({ username: username.trim(), password, role });
      toast.success("User created. Share the temporary password securely.");
      onCreated();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create user");
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Create User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username">
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus required
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm" />
        </Field>
        <Field label="Temporary Password">
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} required
            placeholder="At least 6 characters"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm font-mono" />
        </Field>
        <Field label="Role">
          <select value={role} onChange={e => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm">
            <option value="security">Security Personnel</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
        <p className="text-[11px] text-muted-foreground">
          The user will be required to change this password on first login.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm">Cancel</button>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50">
            {busy ? "Creating…" : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose, onDone }: { user: ManagedUser; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      await api.resetUserPassword(user.id, password);
      toast.success(`Temporary password set for ${user.username}`);
      onDone();
    } catch { toast.error("Reset failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Reset password — ${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New Temporary Password">
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} required autoFocus
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm font-mono" />
        </Field>
        <p className="text-[11px] text-muted-foreground">
          User will be required to set a new password on next login.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm">Cancel</button>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-warn text-white text-sm disabled:opacity-50">
            {busy ? "Saving…" : "Reset Password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1 text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
