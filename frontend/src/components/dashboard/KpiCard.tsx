import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "fraud" | "slate";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-success-light text-green-700",
  warning: "bg-warning-light text-orange-700",
  fraud: "bg-fraud-light text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

const toneStroke: Record<Tone, string> = {
  primary: "#2563EB",
  success: "#16A34A",
  warning: "#EA580C",
  fraud: "#DC2626",
  slate: "#64748B",
};

interface KpiCardProps {
  label: string;
  /** Raw numeric value — animated with a smooth count-up on every update. */
  value: number;
  /** Formats the animated numeric value for display. Defaults to a plain rounded integer. */
  format?: (value: number) => string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  /** Optional recent-history series rendered as a compact sparkline. */
  trend?: number[];
  /** Marks the metric as continuously live-updating (adds a soft pulse to the icon badge). */
  live?: boolean;
  durationMs?: number;
}

export function KpiCard({
  label,
  value,
  format = (v) => Math.round(v).toLocaleString("en-IN"),
  icon: Icon,
  tone = "primary",
  hint,
  trend,
  live = false,
  durationMs = 900,
}: KpiCardProps) {
  const animated = useCountUp(value, durationMs);
  const hasTrend = trend && trend.length > 1;
  const delta = hasTrend ? trend![trend!.length - 1] - trend![trend!.length - 2] : 0;

  return (
    <Card interactive className="group relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 transition-colors">{format(animated)}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {hint && <p className="text-xs text-slate-400">{hint}</p>}
            {hasTrend && delta !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                  delta > 0 ? "text-success" : "text-fraud"
                )}
              >
                {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(delta).toFixed(0)}
              </span>
            )}
          </div>
        </div>
        <div
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
            toneClasses[tone]
          )}
        >
          {live && <span className="absolute inset-0 rounded-xl bg-current opacity-0 animate-pulse-ring-soft" />}
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {hasTrend && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend!.map((v) => ({ v }))} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneStroke[tone]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={toneStroke[tone]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={toneStroke[tone]}
                strokeWidth={1.5}
                fill={`url(#spark-${label.replace(/\s+/g, "")})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
