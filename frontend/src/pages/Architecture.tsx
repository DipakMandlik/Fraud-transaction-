import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, ListTree, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ArchitectureSearch } from "@/components/architecture/ArchitectureSearch";
import { DetailPanel } from "@/components/architecture/DetailPanel";
import { FeatureCardsGrid } from "@/components/architecture/FeatureCardsGrid";
import { LayersView } from "@/components/architecture/LayersView";
import { PipelineDiagram } from "@/components/architecture/PipelineDiagram";
import { TechStackSection } from "@/components/architecture/TechStackSection";
import { TimelineMode } from "@/components/architecture/TimelineMode";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { COMPONENT_MAP, PIPELINE_ORDER } from "@/data/architecture";
import { useNotifications } from "@/hooks/useNotifications";
import { dashboardApi, rulesApi } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

type ViewMode = "pipeline" | "layers";

export default function Architecture() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [showTimeline, setShowTimeline] = useState(false);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);

  const { onTransaction } = useNotifications();
  const runToken = useRef(0);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    refetchInterval: 5000,
  });
  const rulesQuery = useQuery({ queryKey: ["rules"], queryFn: rulesApi.list });

  const health = dashboardQuery.data?.kpis.system_health;
  const avgDetectionMs = dashboardQuery.data?.kpis.average_detection_time_ms ?? 24;
  const ruleCount = rulesQuery.data
    ? { total: rulesQuery.data.length, enabled: rulesQuery.data.filter((r) => r.enabled).length }
    : undefined;

  // Ambient "live" feel: every real transaction sends a wave through the pipeline.
  useEffect(() => {
    const unsubscribe = onTransaction(() => {
      const myToken = ++runToken.current;
      let step = 0;
      const tick = () => {
        if (runToken.current !== myToken) return;
        setPulseIndex(step);
        step += 1;
        if (step <= PIPELINE_ORDER.length) {
          window.setTimeout(tick, 150);
        } else {
          setPulseIndex(null);
        }
      };
      tick();
    });
    return unsubscribe;
  }, [onTransaction]);

  const selected = selectedId ? COMPONENT_MAP[selectedId] : null;

  return (
    <AppLayout
      title="Fraud Detection Platform Architecture"
      subtitle="Real-time processing pipeline — how every transaction is ingested, scored, and decided"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setViewMode("pipeline")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
              viewMode === "pipeline" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ListTree className="h-3.5 w-3.5" /> Pipeline
          </button>
          <button
            onClick={() => setViewMode("layers")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
              viewMode === "layers" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Layers
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <ArchitectureSearch onSelect={setSelectedId} />
          <Button variant={showTimeline ? "primary" : "outline"} size="sm" onClick={() => setShowTimeline((v) => !v)}>
            <Radio className="h-3.5 w-3.5" /> Timeline Mode
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Journey</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === "pipeline" ? (
                <PipelineDiagram selectedId={selectedId} onSelect={setSelectedId} health={health} pulseIndex={pulseIndex} />
              ) : (
                <LayersView selectedId={selectedId} onSelect={setSelectedId} health={health} />
              )}
            </CardContent>
          </Card>

          {showTimeline && <TimelineMode avgDetectionMs={avgDetectionMs} onSelect={setSelectedId} />}

          <div>
            <SectionLabel>Every Component</SectionLabel>
            <div className="mt-3">
              <FeatureCardsGrid selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>

          <div>
            <SectionLabel>Technology Stack</SectionLabel>
            <div className="mt-3">
              <TechStackSection />
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:col-span-1 xl:self-start">
          {selected ? (
            <div className="h-[calc(100vh-8rem)]">
              <DetailPanel component={selected} health={health} ruleCount={ruleCount} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Select any component</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Click a node in the pipeline, a card below, or search for a file/endpoint to see exactly what it does, what it depends on,
                and the real source files behind it.
              </p>
              {dashboardQuery.data && (
                <div className="mt-5 grid grid-cols-2 gap-2.5 text-left">
                  <MiniStat label="Txns Today" value={formatNumber(dashboardQuery.data.kpis.transactions_today)} />
                  <MiniStat label="Avg Detection" value={`${avgDetectionMs.toFixed(1)} ms`} />
                  <MiniStat label="Rules Active" value={ruleCount ? `${ruleCount.enabled}/${ruleCount.total}` : "—"} />
                  <MiniStat label="Fraud Detected" value={formatNumber(dashboardQuery.data.kpis.fraud_detected)} />
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</h2>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-bold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}
