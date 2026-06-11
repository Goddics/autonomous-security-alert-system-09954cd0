import { useEffect, useRef, useState } from "react";
import { WS_URL, api, enrichAlert, type Alert, type AlertPayload } from "./api";

export type ConnState = "connected" | "reconnecting" | "offline";

type Listener = (a: Alert) => void;
const listeners = new Set<Listener>();
export function onNewAlert(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(a: Alert) { listeners.forEach(l => l(a)); }

// Singleton mock interval if WS is unavailable
let mockStarted = false;
function startMockStream() {
  if (mockStarted || typeof window === "undefined") return;
  mockStarted = true;
  setInterval(() => {
    if (Math.random() > 0.6) {
      const a = api._makeMockAlert(0);
      a.status = "new";
      api._pushMockAlert(a);
      emit(a);
    }
  }, 15000);
}

export function useAlertStream() {
  const [state, setState] = useState<ConnState>("reconnecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        setState("reconnecting");
        ws.onopen = () => { attempt = 0; setState("connected"); };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === "NEW_ALERT" && msg.data) emit(msg.data as Alert);
          } catch { /* noop */ }
        };
        ws.onclose = () => {
          if (cancelled) return;
          setState(attempt > 2 ? "offline" : "reconnecting");
          attempt++;
          if (attempt > 3) { startMockStream(); setState("offline"); return; }
          reconnectTimer = setTimeout(connect, 2000 * attempt);
        };
        ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
      } catch {
        startMockStream();
        setState("offline");
      }
    }
    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, []);

  return state;
}
