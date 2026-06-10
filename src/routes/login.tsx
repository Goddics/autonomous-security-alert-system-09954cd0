import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — SecureWatch" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.login(username.trim(), password);
      login({ username: r.username, role: r.role === "admin" ? "admin" : "security" }, r.token);
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Invalid credentials");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-threat/10 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center pulse-threat">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">SecureWatch</div>
            <div className="text-xs text-muted-foreground">Theft Detection AI · University Security</div>
          </div>
        </div>
        <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 shadow-2xl">
          <h1 className="text-lg font-semibold mb-1">Sign in</h1>
          <p className="text-xs text-muted-foreground mb-5">Authorized personnel only.</p>
          <label className="block text-xs mb-1 text-muted-foreground">Username</label>
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-md bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            placeholder="e.g. officer.kay" autoFocus required
          />
          <label className="block text-xs mb-1 text-muted-foreground">Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full mb-5 px-3 py-2 rounded-md bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            placeholder="••••••••" required
          />
          <button
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
          <p className="text-[11px] text-muted-foreground mt-4 text-center">
            Demo: any username works. Use one containing <span className="text-foreground">admin</span> for admin role.
          </p>
        </form>
      </div>
    </div>
  );
}
