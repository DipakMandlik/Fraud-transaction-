import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { COMPONENTS, LAYERS } from "@/data/architecture";
import { cn } from "@/lib/utils";
import type { SystemHealth } from "@/types";

export function LayersView({
  selectedId,
  onSelect,
  health,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  health?: SystemHealth;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(layerId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {LAYERS.map((layer, layerIndex) => {
        const members = COMPONENTS.filter((c) => c.layer === layer.id);
        const isCollapsed = collapsed.has(layer.id);

        return (
          <div key={layer.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <button
              onClick={() => toggle(layer.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 text-[11px] font-bold text-primary-600">
                  {layerIndex + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{layer.label}</p>
                  <p className="text-xs text-slate-500">{layer.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-slate-400 sm:inline">
                  {members.length} component{members.length === 1 ? "" : "s"}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", !isCollapsed && "rotate-180")} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 p-4 sm:grid-cols-3 lg:grid-cols-4">
                    {members.map((component) => {
                      const isSelected = selectedId === component.id;
                      const healthy = component.healthKey && health ? health[component.healthKey] : true;
                      return (
                        <button
                          key={component.id}
                          onClick={() => onSelect(component.id)}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover",
                            isSelected ? "border-primary bg-primary-50/40 ring-1 ring-primary/30" : "border-slate-200 bg-white"
                          )}
                        >
                          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <component.icon className="h-4 w-4" />
                            {!healthy && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-fraud ring-1 ring-white" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-800">{component.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">{component.tagline}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
