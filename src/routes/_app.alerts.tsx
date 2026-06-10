import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Alert, type AlertStatus } from "@/lib/api";
import { onNewAlert } from "@/lib/useAlertStream";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: "Alerts — SecureWatch" }] }),
  component: AlertsPage,
});

const STATUSES: AlertStatus[] = ["new", "under_review", "resolved", "false_alarm"];

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<AlertStatus | "all">("all");

  useEffect(() => {
    api.alerts().then(setAlerts);
    const off = onNewAlert(a => setAlerts(prev => [a, ...prev]));
    return () => { off(); };
  }, []);

  async function setStatus(id: string, status: AlertStatus) {
    const a = await api.updateAlert(id, status);
    setAlerts(prev => prev.map(x => x.id === id ? a : x));
    toast.success(`Marked as ${status.replace("_", " ")}`);
  }

  const shown = alerts.filter(a => filter === "all" || a.status === filter);

  return (
    <div className="p-8">
      <PageHeader
        title="Detection Alerts"
        subtitle="Review, triage, and resolve incoming detection events."
        actions={
          <div className="flex gap-1 bg-card border border-border rounded-md p-1">
            {(["all", ...STATUSES] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "all" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map(a => (
          <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-video bg-black relative">
              <img src={a.screenshot_url} alt={a.alert_type} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2"><StatusBadge status={a.status} /></div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[11px] font-mono">
                {(a.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{a.alert_type}</div>
                  <div className="text-xs text-muted-foreground">{a.camera_name}</div>
                </div>
                <div className="text-[11px] text-muted-foreground text-right">
                  {new Date(a.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => setStatus(a.id, "under_review")}
                  className="px-2 py-1 text-[11px] rounded bg-warn/15 text-warn hover:bg-warn/25">Under Review</button>
                <button onClick={() => setStatus(a.id, "resolved")}
                  className="px-2 py-1 text-[11px] rounded bg-success/15 text-success hover:bg-success/25">Resolved</button>
                <button onClick={() => setStatus(a.id, "false_alarm")}
                  className="px-2 py-1 text-[11px] rounded bg-muted text-muted-foreground hover:bg-accent">False Alarm</button>
              </div>
            </div>
          </div>
        ))}
        {!shown.length && (
          <div className="col-span-full text-center py-16 text-sm text-muted-foreground">No alerts match this filter.</div>
        )}
      </div>
    </div>
  );
}
