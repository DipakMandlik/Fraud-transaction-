import { CheckCircle2 } from "lucide-react";

import { COMPONENT_MAP, PIPELINE_ORDER } from "@/data/architecture";
import { cn } from "@/lib/utils";

/** Relative share of end-to-end processing time each stage represents. Illustrative
 * proportions, not measured per-stage telemetry — see the note rendered below. */
const STAGE_WEIGHT: Record<string, number> = {
  customer: 0,
  gateway: 0.05,
  auth: 0.05,
  validation: 0.2,
  rules: 0.25,
  risk: 0.1,
  decision: 0.05,
  alerts: 0.1,
  database: 0.1,
  stream: 0.05,
  dashboard: 0.05,
};

export function TimelineMode({ avgDetectionMs, onSelect }: { avgDetectionMs: number; onSelect: (id: string) => void }) {
  let cumulative = 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">A Transaction's Life</p>
          <p className="text-xs text-slate-500">Stage-by-stage journey from ingestion to dashboard</p>
        </div>
        <div className="rounded-lg bg-primary-50 px-3 py-1.5 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary-500">Live Avg. Detection Time</p>
          <p className="text-sm font-bold tabular-nums text-primary-700">{avgDetectionMs.toFixed(1)} ms</p>
        </div>
      </div>

      <ol className="relative space-y-4 border-l border-slate-200 pl-6">
        {PIPELINE_ORDER.map((id, index) => {
          const component = COMPONENT_MAP[id];
          cumulative += STAGE_WEIGHT[id] * avgDetectionMs;
          return (
            <li key={id} className="relative animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
              <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm ring-1 ring-slate-100">
                <CheckCircle2 className="h-3 w-3" />
              </span>
              <button
                onClick={() => onSelect(id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{component.name}</p>
                  <p className="text-xs text-slate-500">{component.tagline}</p>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold text-primary-600">+{cumulative.toFixed(1)} ms</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-400">
        Stage timings are illustrative — proportionally distributed from the live average end-to-end detection time above. The platform
        doesn't yet emit per-stage timing telemetry; only the total is measured.
      </p>
    </div>
  );
}
