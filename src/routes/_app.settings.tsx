import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Volume2, RotateCcw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — SecureWatch" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sound, setSound] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function doReset() {
    setBusy(true);
    try { await api.resetDemo(); toast.success("Demo data reset"); }
    catch { toast.error("Reset failed"); }
    finally { setBusy(false); setConfirm(false); }
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Settings" subtitle="Administrator controls." />

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/15 text-primary flex items-center justify-center">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-sm">Alert Sound</div>
              <div className="text-xs text-muted-foreground">Play an audio chime when a new alert arrives.</div>
            </div>
          </div>
          <button onClick={() => setSound(s => !s)}
            className={`relative h-6 w-11 rounded-full transition-colors ${sound ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${sound ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="bg-card border border-threat/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-md bg-threat/15 text-threat flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-sm">Reset Demo Data</div>
              <div className="text-xs text-muted-foreground">Clears all alerts and incidents and regenerates demo data.</div>
            </div>
          </div>
          <button onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-threat text-white text-sm hover:bg-threat/90">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Reset demo data?</h3>
            <p className="text-sm text-muted-foreground mb-5">All current alerts and incidents will be cleared. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm">Cancel</button>
              <button onClick={doReset} disabled={busy}
                className="px-3 py-1.5 rounded-md bg-threat text-white text-sm disabled:opacity-50">
                {busy ? "Resetting…" : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
