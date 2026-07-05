import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileCode2, Info, Network, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { COMPONENT_MAP, LAYERS, type ArchComponent } from "@/data/architecture";
import type { SystemHealth } from "@/types";

const METHOD_TONE: Record<string, "blue" | "green" | "amber" | "slate"> = {
  GET: "blue",
  POST: "green",
  PATCH: "amber",
  WS: "slate",
};

interface DetailPanelProps {
  component: ArchComponent | null;
  health?: SystemHealth;
  ruleCount?: { total: number; enabled: number };
  onSelect: (id: string) => void;
  onClose: () => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</h3>;
}

export function DetailPanel({ component, health, ruleCount, onSelect, onClose }: DetailPanelProps) {
  return (
    <AnimatePresence>
      {component && (
        <motion.aside
          key={component.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <component.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{component.name}</p>
                <p className="text-xs text-slate-500">{component.tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <div>
              <SectionTitle>Overview</SectionTitle>
              <p className="text-sm leading-relaxed text-slate-700">{component.overview}</p>
            </div>

            {component.implementationNote && (
              <div className="flex gap-2 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
                <p className="text-xs leading-relaxed text-primary-800">{component.implementationNote}</p>
              </div>
            )}

            <div>
              <SectionTitle>Responsibilities</SectionTitle>
              <ul className="space-y-1.5">
                {component.responsibilities.map((r, i) => (
                  <li key={i} className="flex animate-rise items-start gap-2 text-sm text-slate-700" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionTitle>Inputs</SectionTitle>
                <ul className="space-y-1.5">
                  {component.inputs.map((v, i) => (
                    <li key={i} className="text-xs leading-relaxed text-slate-600">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <SectionTitle>Outputs</SectionTitle>
                <ul className="space-y-1.5">
                  {component.outputs.length === 0 ? (
                    <li className="text-xs italic leading-relaxed text-slate-400">Terminal node — no further hop</li>
                  ) : (
                    component.outputs.map((v, i) => (
                      <li key={i} className="text-xs leading-relaxed text-slate-600">
                        {v}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {component.id === "rules" && ruleCount && (
              <div>
                <SectionTitle>Live Rule Configuration</SectionTitle>
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                    <p className="text-lg font-bold tabular-nums text-slate-900">{ruleCount.total}</p>
                    <p className="text-[11px] text-slate-500">Rules Defined</p>
                  </div>
                  <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                    <p className="text-lg font-bold tabular-nums text-success">{ruleCount.enabled}</p>
                    <p className="text-[11px] text-slate-500">Currently Enabled</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  Pulled live from <code className="rounded bg-slate-100 px-1 py-0.5">GET /api/rules</code> — this number updates the moment an
                  analyst tunes the rule set on the Rule Engine page.
                </p>
              </div>
            )}

            <div>
              <SectionTitle>Source Files</SectionTitle>
              <div className="space-y-1.5">
                {component.sourceFiles.map((f) => (
                  <div key={f} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                    <FileCode2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <code className="truncate text-[11px] text-slate-600">{f}</code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle>API Endpoints</SectionTitle>
              <div className="space-y-1.5">
                {component.apiEndpoints.map((ep) => (
                  <div key={ep.method + ep.path} className="flex items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-2">
                    <Badge tone={METHOD_TONE[ep.method]} className="mt-0.5 shrink-0 font-mono text-[10px]">
                      {ep.method}
                    </Badge>
                    <div className="min-w-0">
                      <code className="block truncate text-[11px] font-semibold text-slate-800">{ep.path}</code>
                      <p className="text-[11px] leading-snug text-slate-500">{ep.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {component.dependencies.length > 0 && (
              <div>
                <SectionTitle>Dependencies</SectionTitle>
                <div className="flex flex-col gap-1.5">
                  {component.dependencies.map((depId) => {
                    const dep = COMPONENT_MAP[depId];
                    if (!dep) return null;
                    return (
                      <button
                        key={depId}
                        onClick={() => onSelect(depId)}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50/50"
                      >
                        <Network className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        Feeds into <span className="font-semibold text-primary-700">{dep.name}</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-50 to-white px-3 py-2.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              <p className="text-[11px] text-slate-500">
                Part of the <span className="font-semibold text-slate-700">{LAYERS.find((l) => l.id === component.layer)?.label}</span>
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
