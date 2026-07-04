import { useEffect, useRef } from "react";

import type { WsEvent } from "@/types";

export function useLiveEvents(onEvent: (event: WsEvent) => void): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByClient = false;

    const connect = () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      const wsBase = (import.meta.env.VITE_WS_BASE_URL as string | undefined) || undefined;
      const socketUrl = wsBase
        ? `${wsBase}/ws/events?token=${encodeURIComponent(token)}`
        : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/events?token=${encodeURIComponent(token)}`;
      socket = new WebSocket(socketUrl);

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WsEvent;
          handlerRef.current(parsed);
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        if (!closedByClient) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      closedByClient = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
