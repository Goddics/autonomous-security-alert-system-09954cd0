// Simple API client. Falls back to mock data when backend unreachable.
// Configure backend URL via VITE_API_URL.

export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
export const WS_URL = (import.meta.env.VITE_WS_URL as string) || "ws://localhost:8000/ws/alerts/";

const TOKEN_KEY = "sas_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}

// ---------- Types ----------
// Matches backend contract exactly.
export type AlertStatus = "new" | "under_review" | "resolved" | "false_alarm";

// Wire shape from REST + WebSocket NEW_ALERT.data
export interface AlertPayload {
  id: string;
  camera_id: number;
  alert_type: string;
  timestamp: string;
  confidence: number;
  screenshot_url: string;
  status?: AlertStatus;
}

// UI-enriched alert (adds camera_name + default status for rendering)
export interface Alert extends AlertPayload {
  camera_name: string;
  status: AlertStatus;
}

export function enrichAlert(a: AlertPayload): Alert {
  const cam = cameras.find(c => c.id === a.camera_id);
  return {
    ...a,
    camera_name: cam?.name ?? `Camera ${a.camera_id}`,
    status: a.status ?? "new",
  };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  created_at: string;
}

export interface DashboardStats {
  total_today: number;
  pending: number;
  false_alarm_rate: number;
  active_cameras: number;
  recent_alerts: Alert[];
  series: { hour: string; alerts: number }[];
}

// ---------- Mock fallback ----------
const cameras = [
  { id: 1, name: "Library Entrance" },
  { id: 2, name: "Lecture Hall A" },
  { id: 3, name: "Computer Lab 1" },
  { id: 4, name: "Faculty Parking" },
];

const alertTypes = ["Loitering", "Bag Theft", "Suspicious Object", "Unauthorized Access"];

function rand<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }

function makeAlert(i = 0): Alert {
  const cam = rand(cameras);
  return {
    id: `a_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
    alert_type: rand(alertTypes),
    camera_id: cam.id,
    camera_name: cam.name,
    timestamp: new Date(Date.now() - i * 1000 * 60 * Math.random() * 20).toISOString(),
    confidence: 0.7 + Math.random() * 0.29,
    screenshot_url: `https://picsum.photos/seed/${Math.random()}/640/360`,
    status: rand(["new", "under_review", "resolved", "false_alarm"] as AlertStatus[]),
  };
}

let mockAlerts: Alert[] = Array.from({ length: 12 }, (_, i) => makeAlert(i));
let mockIncidents: Incident[] = [
  {
    id: "i_1",
    title: "Reported laptop theft — CS Lab",
    description: "Student reported missing laptop at 14:32. CCTV reviewed.",
    severity: "high",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

async function tryOrMock<T>(fn: () => Promise<T>, mock: () => T): Promise<T> {
  try { return await fn(); } catch { return mock(); }
}

// ---------- API ----------
export const api = {
  cameras: () => cameras,

  login: (username: string, password: string) =>
    tryOrMock(
      () => request<{ token: string; role: string; username: string }>("/api/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
      () => {
        if (!username) throw new Error("Username required");
        const role = username.toLowerCase().includes("admin") ? "admin" : "security";
        return { token: `demo_${Math.random().toString(36).slice(2)}`, role, username };
      }
    ),

  dashboard: () =>
    tryOrMock<DashboardStats>(
      () => request<DashboardStats>("/api/dashboard/"),
      () => {
        const today = mockAlerts.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString());
        const series = Array.from({ length: 12 }, (_, i) => ({
          hour: `${(i * 2).toString().padStart(2, "0")}:00`,
          alerts: Math.floor(Math.random() * 8),
        }));
        return {
          total_today: today.length,
          pending: mockAlerts.filter(a => a.status === "new" || a.status === "under_review").length,
          false_alarm_rate: Math.round((mockAlerts.filter(a => a.status === "false_alarm").length / mockAlerts.length) * 100),
          active_cameras: cameras.length,
          recent_alerts: [...mockAlerts].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 5),
          series,
        };
      }
    ),

  alerts: () =>
    tryOrMock<Alert[]>(
      async () => {
        const raw = await request<AlertPayload[]>("/api/alerts/");
        return raw.map(enrichAlert);
      },
      () => [...mockAlerts].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    ),

  updateAlert: (id: string, status: AlertStatus) =>
    tryOrMock<Alert>(
      async () => {
        const raw = await request<AlertPayload>(`/api/alerts/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        return enrichAlert({ ...raw, status });
      },
      () => {
        mockAlerts = mockAlerts.map(a => (a.id === id ? { ...a, status } : a));
        return mockAlerts.find(a => a.id === id)!;
      }
    ),

  startCamera: (camera_id: number) =>
    tryOrMock<{ ok: true; camera_id: number }>(
      () => request("/api/start-camera/", { method: "POST", body: JSON.stringify({ camera_id }) }),
      () => ({ ok: true, camera_id })
    ),

  stopCamera: (camera_id: number) =>
    tryOrMock<{ ok: true; camera_id: number }>(
      () => request("/api/stop-camera/", { method: "POST", body: JSON.stringify({ camera_id }) }),
      () => ({ ok: true, camera_id })
    ),

  uploadVideo: (file: File, camera_id?: number) =>
    tryOrMock<{ ok: true; filename: string }>(
      async () => {
        const fd = new FormData();
        fd.append("video", file);
        if (camera_id != null) fd.append("camera_id", String(camera_id));
        const token = getToken();
        const res = await fetch(`${API_URL}/api/upload-video/`, {
          method: "POST",
          headers: token ? { Authorization: `Token ${token}` } : {},
          body: fd,
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      },
      () => ({ ok: true, filename: file.name })
    ),

  incidents: () =>
    tryOrMock<Incident[]>(
      () => request<Incident[]>("/api/incidents/"),
      () => [...mockIncidents]
    ),

  createIncident: (data: Omit<Incident, "id" | "created_at">) =>
    tryOrMock<Incident>(
      () => request<Incident>("/api/incidents/", { method: "POST", body: JSON.stringify(data) }),
      () => {
        const inc: Incident = { ...data, id: `i_${Date.now()}`, created_at: new Date().toISOString() };
        mockIncidents = [inc, ...mockIncidents];
        return inc;
      }
    ),

  resetDemo: () =>
    tryOrMock<{ ok: true }>(
      () => request<{ ok: true }>("/api/alerts/reset/", { method: "POST" }),
      () => {
        mockAlerts = Array.from({ length: 12 }, (_, i) => makeAlert(i));
        mockIncidents = [];
        return { ok: true };
      }
    ),

  // For mock injection of incoming WS alerts
  _pushMockAlert: (a: Alert) => { mockAlerts = [a, ...mockAlerts]; },
  _makeMockAlert: makeAlert,
};
