import { Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge, severityTone } from "@/components/ui/Badge";
import { useNotifications } from "@/hooks/useNotifications";
import { cn, timeAgo } from "@/lib/utils";

export function NotificationBell() {
  const { alerts, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          unreadCount > 0 && "text-primary-600"
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) markAllRead();
        }}
      >
        <Bell className={cn("h-5 w-5 transition-transform", unreadCount > 0 && "animate-[wiggle_0.4s_ease-in-out]")} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fraud px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-96 origin-top-right animate-scale-in rounded-xl border border-slate-200 bg-white shadow-popover">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Fraud Alerts</p>
              <Badge tone="red">{alerts.length} recent</Badge>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {alerts.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">No alerts yet</p>}
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  className="flex w-full flex-col items-start gap-1 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/alerts/${alert.id}`);
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{alert.customer_name}</span>
                    <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <p className={cn("line-clamp-1 text-xs text-slate-500")}>{alert.reason_summary}</p>
                  <span className="text-[11px] text-slate-400">{timeAgo(alert.created_at)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
