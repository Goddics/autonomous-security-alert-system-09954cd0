import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type DashboardStats } from "@/lib/api";
import { onNewAlert } from "@/lib/useAlertStream";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { BellRing, Camera, AlertTriangle, ShieldAlert } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SecureWatch" }] }),
  component: DashboardPage,
});

function Stat({ icon: Icon, label, value, accent }: { icon: typeof BellRing; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${accent} opacity-20 blur-2xl`} />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-3xl font-semibold mt-2">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg ${accent} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let on = true;
    api.dashboard().then(d => { if (on) setData(d); });
    const off = onNewAlert(() => { api.dashboard().then(d => { if (on) setData(d); }); });
    return () => { on = false; off(); };
  }, []);

  return (
    <div className="p-8">
      <PageHeader title="Operations Dashboard" subtitle="Real-time overview of detection activity across all facilities." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={BellRing} label="Total Alerts Today" value={data?.total_alerts_today ?? "—"} accent="bg-primary/15 text-primary" />
        <Stat icon={AlertTriangle} label="Pending Reviews" value={data?.pending_review_count ?? "—"} accent="bg-warn/15 text-warn" />
        <Stat icon={ShieldAlert} label="False Alarm Rate" value={data ? `${data.false_alarm_rate_percent}%` : "—"} accent="bg-threat/15 text-threat" />
        <Stat icon={Camera} label="Active Cameras" value={data?.active_camera_feeds ?? "—"} accent="bg-success/15 text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Alert Activity (last 24h)</h2>
            <span className="text-xs text-muted-foreground">Auto-refresh on new events</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series ?? []}>
                <defs>
                  <linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Area type="monotone" dataKey="alerts" stroke="var(--primary)" fill="url(#a)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Alerts</h2>
            <Link to="/alerts" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {(data?.recent_alerts ?? []).map(a => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <div className="h-9 w-9 rounded-md bg-threat/10 text-threat flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.alert_type}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.camera_name} · {new Date(a.timestamp).toLocaleTimeString()}</div>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
            {!data?.recent_alerts?.length && <li className="text-xs text-muted-foreground">No alerts yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
