import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { dashboardApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const AUTO_HIDE_MS = 5000;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function WelcomeBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get, enabled: visible });
  const health = data?.kpis.system_health;

  useEffect(() => {
    if (sessionStorage.getItem("justLoggedIn") === "1") {
      sessionStorage.removeItem("justLoggedIn");
      setVisible(true);
      const hideTimer = setTimeout(() => setClosing(true), AUTO_HIDE_MS);
      return () => clearTimeout(hideTimer);
    }
  }, []);

  useEffect(() => {
    if (!closing) return;
    const removeTimer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(removeTimer);
  }, [closing]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 to-white px-6 py-4 shadow-card transition-all duration-300",
        closing ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
      )}
      role="status"
    >
      <div>
        <p className="text-base font-semibold text-slate-900">
          {greeting()}, {user?.full_name ?? "Investigator"}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">All fraud detection services are operational.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
        <StatusItem ok={health?.rule_engine ?? true} label="Rule Engine Online" />
        <StatusItem ok={health?.risk_engine ?? true} label="AI Risk Engine Online" />
        <StatusItem ok={health?.streaming ?? true} label="Streaming Active" />
      </div>
    </div>
  );
}

function StatusItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <CheckCircle2 className={cn("h-4 w-4", ok ? "text-success" : "text-slate-300")} />
      {label}
    </span>
  );
}
