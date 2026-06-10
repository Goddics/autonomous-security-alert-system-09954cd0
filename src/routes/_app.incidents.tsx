import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Incident } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/incidents")({
  head: () => ({ meta: [{ title: "Incidents — SecureWatch" }] }),
  component: IncidentsPage,
});

const SEV: Incident["severity"][] = ["low", "medium", "high", "critical"];
const sevColor: Record<Incident["severity"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/15 text-primary",
  high: "bg-warn/15 text-warn",
  critical: "bg-threat/15 text-threat",
};

function IncidentsPage() {
  const [list, setList] = useState<Incident[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Incident["severity"]>("medium");

  useEffect(() => { api.incidents().then(setList); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const i = await api.createIncident({ title: title.trim(), description: description.trim(), severity });
    setList(prev => [i, ...prev]);
    setTitle(""); setDescription(""); setSeverity("medium");
    toast.success("Incident logged");
  }

  return (
    <div className="p-8">
      <PageHeader title="Incident Reports" subtitle="Document and track security incidents linked to detection events." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={submit} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Plus className="h-4 w-4" /> New Incident</h2>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Severity</label>
            <select value={severity} onChange={e => setSeverity(e.target.value as Incident["severity"])}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm">
              {SEV.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Create Incident
          </button>
        </form>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border text-sm font-semibold">Recent Incidents</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2">Title</th>
                  <th className="text-left px-5 py-2">Severity</th>
                  <th className="text-left px-5 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {list.map(i => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <div className="font-medium">{i.title}</div>
                      {i.description && <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] capitalize ${sevColor[i.severity]}`}>{i.severity}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!list.length && (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-muted-foreground">No incidents recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
