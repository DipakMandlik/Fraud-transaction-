import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { playAlertChime } from "@/lib/sound";
import { useLiveEvents } from "@/hooks/useWebSocket";
import type { Alert, WsEvent } from "@/types";

interface ToastItem extends Alert {
  toastId: string;
}

interface NotificationsContextValue {
  alerts: Alert[];
  unreadCount: number;
  toasts: ToastItem[];
  markAllRead: () => void;
  dismissToast: (toastId: string) => void;
  onTransaction: (cb: (txn: unknown) => void) => () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const MAX_ALERTS = 30;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [txnListeners] = useState<Set<(txn: unknown) => void>>(() => new Set());

  const handleEvent = useCallback(
    (event: WsEvent) => {
      if (event.type === "alert.created") {
        const alert = event.payload as Alert;
        setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
        setUnreadCount((prev) => prev + 1);
        const toastId = `${alert.id}-${Date.now()}`;
        setToasts((prev) => [...prev, { ...alert, toastId }].slice(-4));
        playAlertChime();
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
        }, 7000);
      } else if (event.type === "alert.updated") {
        const alert = event.payload as Alert;
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
      } else if (event.type === "transaction.created") {
        txnListeners.forEach((cb) => cb(event.payload));
      }
    },
    [txnListeners]
  );

  useLiveEvents(handleEvent);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      alerts,
      unreadCount,
      toasts,
      markAllRead: () => setUnreadCount(0),
      dismissToast: (toastId: string) => setToasts((prev) => prev.filter((t) => t.toastId !== toastId)),
      onTransaction: (cb) => {
        txnListeners.add(cb);
        return () => txnListeners.delete(cb);
      },
    }),
    [alerts, unreadCount, toasts, txnListeners]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
