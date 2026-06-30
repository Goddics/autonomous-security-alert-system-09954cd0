import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { api, type Alert } from "@/lib/api";
import { onNewAlert } from "@/lib/useAlertStream";
import PageHeader from "@/components/PageHeader";
import { Play, Square, Camera as CamIcon, Activity, Cpu, Wifi } from "lucide-react";

export const Route = createFileRoute("/_app/monitoring")({
  head: () => ({ meta: [{ title: "Live Monitoring — SecureWatch" }] }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const cams = api.cameras();
  const [camId, setCamId] = useState(cams[0].id);
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<Alert[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    api.alerts().then((a) => setFeed(a.slice(0, 8)));
    const off = onNewAlert((a) => setFeed((prev) => [a, ...prev].slice(0, 10)));
    return () => {
      off();
    };
  }, []);

  // Animated placeholder "video" with simulated bounding box overlay
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let t = 0;
    function draw() {
      t += 1;
      const w = c!.width,
        h = c!.height;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0b1220");
      grad.addColorStop(1, "#1a2540");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // scanlines
      ctx.fillStyle = "rgba(120, 160, 255, 0.04)";
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      // moving "subject"
      const x = (Math.sin(t / 60) * 0.3 + 0.5) * w;
      const y = h * 0.55 + Math.sin(t / 40) * 10;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x, y - 50, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 22, y - 30, 44, 60);
      // bounding box if running
      if (running) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
        ctx.lineWidth = 2;
        const bx = x - 36,
          by = y - 76,
          bw = 72,
          bh = 116;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.fillRect(bx, by - 18, 110, 18);
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.fillText(`person  ${(0.82 + Math.sin(t / 30) * 0.05).toFixed(2)}`, bx + 6, by - 5);
      }
      // timestamp
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px monospace";
      ctx.fillText(new Date().toLocaleTimeString(), 10, 18);
      ctx.fillText(`CAM ${camId.toString().padStart(2, "0")}`, w - 70, 18);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [running, camId]);

  return (
    <div className="p-8">
      <PageHeader
        title="Live Monitoring"
        subtitle="YOLOv8n inference stream with bounding box overlay."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="aspect-video bg-none relative">
              {/* <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full" /> */}
              {running && (
                <img
                  src={api.liveStream(camId)}
                  alt="Live camera feed"
                  className="w-full h-full object-cover"
                />
              )}
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Camera stopped
                </div>
              )}
            </div>
            <div className="p-4 flex flex-wrap items-center gap-3 border-t border-border">
              <div className="flex items-center gap-2">
                <CamIcon className="h-4 w-4 text-muted-foreground" />
                <select
                  value={camId}
                  onChange={(e) => setCamId(Number(e.target.value))}
                  className="bg-input border border-border rounded-md text-sm px-2 py-1.5"
                >
                  {cams.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={async () => {
                  await api.startCamera(camId);
                  setRunning(true);
                }}
                disabled={running}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
              >
                <Play className="h-4 w-4" /> Start Camera
              </button>
              <button
                onClick={async () => {
                  await api.stopCamera(camId);
                  setRunning(false);
                }}
                disabled={!running}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm disabled:opacity-50"
              >
                <Square className="h-4 w-4" /> Stop Camera
              </button>
              <div className="ml-auto text-xs text-muted-foreground">
                Model: YOLOv8n · 30 FPS · 640×640
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-threat" /> Live Threat Feed
            </h2>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {feed.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-threat/60 pl-3">
                  <div className="font-medium">{a.alert_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.camera_name} · {(a.confidence * 100).toFixed(0)}% ·{" "}
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </div>
                </li>
              ))}
              {!feed.length && <li className="text-xs text-muted-foreground">Awaiting events…</li>}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">System Status</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" /> Inference
                </span>
                <span className="text-success text-xs">Healthy</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" /> WebSocket
                </span>
                <span className="text-success text-xs">Streaming</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CamIcon className="h-4 w-4 text-muted-foreground" /> Cameras Online
                </span>
                <span className="text-xs">
                  {cams.length}/{cams.length}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
