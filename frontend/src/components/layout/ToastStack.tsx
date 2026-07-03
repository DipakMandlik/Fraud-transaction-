import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { severityTone } from "@/components/ui/Badge";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const toneBorder: Record<string, string> = {
  red: "border-l-fraud",
  orange: "border-l-warning",
  blue: "border-l-primary",
  slate: "border-l-slate-400",
};

const toneIconBg: Record<string, string> = {
  red: "bg-fraud-light text-fraud",
  orange: "bg-warning-light text-warning",
  blue: "bg-primary-50 text-primary",
  slate: "bg-slate-100 text-slate-500",
};

export function ToastStack() {
  const { toasts, dismissToast } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="fixed right-5 top-5 z-[60] flex w-96 flex-col gap-2.5" role="region" aria-label="Live fraud alerts">
      {toasts.map((toast) => {
        const tone = severityTone(toast.severity);
        return (
          <div
            key={toast.toastId}
            role="alert"
            className={cn(
              "animate-slide-in rounded-xl border-l-4 bg-white p-4 shadow-elevated",
              toneBorder[tone]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneIconBg[tone])}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {toast.severity} Risk Alert &middot; {toast.customer_name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{toast.reason_summary}</p>
                  <button
                    className="mt-2 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    onClick={() => {
                      dismissToast(toast.toastId);
                      navigate(`/alerts/${toast.id}`);
                    }}
                  >
                    Investigate Now
                  </button>
                </div>
              </div>
              <button
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => dismissToast(toast.toastId)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
