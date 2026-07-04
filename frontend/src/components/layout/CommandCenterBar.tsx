import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Database, Radio, ShieldCheck, Timer, Zap } from "lucide-react";

import { useCountUp } from "@/hooks/useCountUp";
import { dashboardApi } from "@/lib/api";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { SystemHealth } from "@/types";

function HealthDot({ label, ok, icon: Icon }: { label: string; ok: boolean; icon: typeof Database }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <span className="text-slate-400">{label}</span>
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-success" : "bg-fraud")} />
      <span className={cn("text-[11px] font-semibold", ok ? "text-green-700" : "text-red-700")}>
        {ok ? "ONLINE" : "DOWN"}
      </span>
    </div>
  );
}

export function CommandCenterBar() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    refetchInterval: 5000,
  });

  const kpis = data?.kpis;
  const health: SystemHealth | undefined = kpis?.system_health;

  const moneySaved = useCountUp(kpis?.fraud_prevented_amount ?? 0, 1200);
  const txnsToday = useCountUp(kpis?.transactions_today ?? 0, 800);

  return (
    <div className="flex h-10 shrink-0 items-center gap-6 overflow-x-auto border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 text-xs text-slate-300 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.04)]">
      <div className="flex shrink-0 items-center gap-2 font-semibold tracking-wide text-white">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fraud opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-fraud" />
        </span>
        LIVE MONITORING
      </div>

      <Metric icon={Activity} label="Txns Today" value={formatNumber(Math.round(txnsToday))} />
      <Metric icon={ShieldCheck} label="Money Protected Today" value={formatCurrency(moneySaved)} accent="text-success" />
      <Metric icon={Timer} label="Avg Detection Time" value={`${(kpis?.average_detection_time_ms ?? 0).toFixed(1)} ms`} />
      <Metric icon={Zap} label="Throughput" value={`${kpis?.transactions_per_minute ?? 0}/min`} />

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <HealthDot label="DB" ok={health?.database ?? false} icon={Database} />
        <HealthDot label="Rule Engine" ok={health?.rule_engine ?? false} icon={Cpu} />
        <HealthDot label="AI Engine" ok={health?.risk_engine ?? false} icon={Cpu} />
        <HealthDot label="Streaming" ok={health?.streaming ?? false} icon={Radio} />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 transition-colors">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="text-slate-500">{label}:</span>
      <span className={cn("font-semibold tabular-nums text-white", accent)}>{value}</span>
    </div>
  );
}
