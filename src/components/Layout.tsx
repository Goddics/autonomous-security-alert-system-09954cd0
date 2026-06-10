import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useAlertStream, onNewAlert, type ConnState } from "@/lib/useAlertStream";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield, LayoutDashboard, Video, BellRing, FileText, Settings, LogOut, Volume2, VolumeX,
} from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitoring", label: "Live Monitoring", icon: Video },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/incidents", label: "Incidents", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings, admin: true },
] as const;

function ConnDot({ state }: { state: ConnState }) {
  const map = {
    connected: { color: "bg-success", label: "Connected" },
    reconnecting: { color: "bg-warn animate-pulse", label: "Reconnecting" },
    offline: { color: "bg-threat", label: "Offline (demo mode)" },
  } as const;
  const v = map[state];
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${v.color}`} />
      <span>{v.label}</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const conn = useAlertStream();
  const [sound, setSound] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && !user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    const off = onNewAlert((a) => {
      toast.error(`New ${a.alert_type}`, { description: `${a.camera_name} — ${(a.confidence * 100).toFixed(0)}%` });
      if (sound) {
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.value = 880; o.type = "sine";
          o.connect(g); g.connect(ctx.destination);
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
          o.start(); o.stop(ctx.currentTime + 0.42);
        } catch { /* noop */ }
      }
    });
    return () => { off(); };
  }, [sound]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">SecureWatch</div>
            <div className="text-[11px] text-muted-foreground">Theft Detection AI</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => {
            if (item.admin && user.role !== "admin") return null;
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                }`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-3">
          <ConnDot state={conn} />
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <div className="font-medium">{user.username}</div>
              <div className="text-muted-foreground capitalize">{user.role}</div>
            </div>
            <button
              onClick={() => setSound(s => !s)}
              className="p-1.5 rounded hover:bg-sidebar-accent"
              title={sound ? "Mute alerts" : "Unmute alerts"}
            >
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="p-1.5 rounded hover:bg-sidebar-accent"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
