import type { AlertStatus } from "@/lib/api";

const cfg: Record<AlertStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-threat/15 text-threat border-threat/30" },
  under_review: { label: "Under Review", cls: "bg-warn/15 text-warn border-warn/30" },
  resolved: { label: "Resolved", cls: "bg-success/15 text-success border-success/30" },
  false_alarm: { label: "False Alarm", cls: "bg-muted text-muted-foreground border-border" },
};

export default function StatusBadge({ status }: { status: AlertStatus }) {
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${c.cls}`}>
      {c.label}
    </span>
  );
}
