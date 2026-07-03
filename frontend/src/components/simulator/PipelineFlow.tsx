import { Check, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/types";

interface PipelineFlowProps {
  activeIndex: number;
  stoppedAt: number | null;
  latencies: number[];
}

export function PipelineFlow({ activeIndex, stoppedAt, latencies }: PipelineFlowProps) {
  return (
    <div className="flex flex-col gap-1">
      {PIPELINE_STAGES.map((stage, i) => {
        const isBlocked = stoppedAt !== null && i === stoppedAt;
        const isDone = stoppedAt !== null ? i < stoppedAt : i < activeIndex;
        const isActive = stoppedAt !== null ? false : i === activeIndex;
        const isPending = stoppedAt !== null ? i > stoppedAt : i > activeIndex;

        return (
          <div key={stage} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isDone && "border-success bg-success text-white",
                  isActive && "border-primary bg-primary-50 text-primary animate-pulse",
                  isBlocked && "border-fraud bg-fraud text-white",
                  isPending && "border-slate-200 bg-white text-slate-300"
                )}
              >
                {isDone && <Check className="h-4 w-4" />}
                {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
                {isBlocked && <XCircle className="h-4 w-4" />}
                {isPending && <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 transition-colors duration-300",
                    isDone ? "bg-success" : isBlocked ? "bg-fraud" : "bg-slate-200"
                  )}
                  style={{ minHeight: 18 }}
                />
              )}
            </div>
            <div className={cn("flex flex-1 items-center justify-between pb-4", i === PIPELINE_STAGES.length - 1 && "pb-0")}>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isDone && "text-slate-700",
                  isActive && "text-primary-700 font-semibold",
                  isBlocked && "text-fraud font-semibold",
                  isPending && "text-slate-300"
                )}
              >
                {stage}
              </span>
              {isDone && latencies[i] !== undefined && (
                <span className="font-mono text-[11px] text-slate-400">{latencies[i].toFixed(0)} ms</span>
              )}
              {isBlocked && <span className="text-[11px] font-bold uppercase text-fraud">Halted</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
