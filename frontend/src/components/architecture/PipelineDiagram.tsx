import { motion } from "framer-motion";

import { PIPELINE_ORDER, COMPONENT_MAP } from "@/data/architecture";
import { cn } from "@/lib/utils";
import type { SystemHealth } from "@/types";

type NodeStatus = "healthy" | "issue" | "processing";

interface PipelineDiagramProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  health?: SystemHealth;
  /** Index into PIPELINE_ORDER currently "lit up" by a live transaction, or null when idle. */
  pulseIndex: number | null;
  highlightId?: string | null;
}

function statusFor(id: string, health: SystemHealth | undefined, isPulsing: boolean): NodeStatus {
  if (isPulsing) return "processing";
  const key = COMPONENT_MAP[id].healthKey;
  if (!key) return "healthy";
  if (!health) return "healthy";
  return health[key] ? "healthy" : "issue";
}

const STATUS_DOT: Record<NodeStatus, string> = {
  healthy: "bg-success",
  issue: "bg-fraud",
  processing: "bg-primary",
};

export function PipelineDiagram({ selectedId, onSelect, health, pulseIndex, highlightId }: PipelineDiagramProps) {
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max items-center gap-0 px-1 py-6">
        {PIPELINE_ORDER.map((id, index) => {
          const component = COMPONENT_MAP[id];
          const isSelected = selectedId === id;
          const isHighlighted = highlightId === id;
          const isPulsing = pulseIndex === index;
          const status = statusFor(id, health, isPulsing);
          const Icon = component.icon;

          return (
            <div key={id} className="flex items-center">
              <motion.button
                type="button"
                onClick={() => onSelect(id)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                animate={isPulsing ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group relative flex w-[132px] shrink-0 flex-col items-center gap-2 rounded-2xl border bg-white px-3 py-4 text-center shadow-card transition-shadow duration-300",
                  isSelected
                    ? "border-primary shadow-glow-primary ring-2 ring-primary/30"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-card-hover",
                  isHighlighted && !isSelected && "border-primary/60 ring-2 ring-primary/20"
                )}
              >
                <span
                  className={cn(
                    "absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full",
                    STATUS_DOT[status],
                    status === "processing" && "animate-pulse"
                  )}
                  title={status === "issue" ? "Reporting an issue" : status === "processing" ? "Processing now" : "Healthy"}
                />
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    isSelected ? "bg-primary text-white" : "bg-primary-50 text-primary-600 group-hover:bg-primary-100"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[12px] font-semibold leading-tight text-slate-800">{component.name}</span>
                <span className="text-[10px] leading-tight text-slate-400">{component.tagline}</span>
              </motion.button>

              {index < PIPELINE_ORDER.length - 1 && (
                <div className="relative h-0.5 w-10 shrink-0 self-center bg-slate-200 sm:w-14">
                  <span
                    className="absolute -top-[3px] h-2 w-2 animate-flow-dot rounded-full bg-primary shadow-[0_0_6px_rgba(37,99,235,0.6)]"
                    style={{ animationDelay: `${index * 0.18}s` }}
                  />
                  {pulseIndex !== null && pulseIndex === index + 1 && (
                    <span className="absolute -top-[3px] left-0 h-2 w-2 animate-[flow-dot_0.6s_linear_forwards] rounded-full bg-fraud shadow-[0_0_8px_rgba(220,38,38,0.7)]" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
