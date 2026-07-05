import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { RuleEditDialog, type RuleUpdatePayload } from "@/components/rules/RuleEditDialog";
import { categoryTone } from "@/components/rules/ruleMeta";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { rulesApi } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

export default function Rules() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [justSavedId, setJustSavedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["rules"], queryFn: rulesApi.list });
  const statsQuery = useQuery({ queryKey: ["rules", "stats"], queryFn: () => rulesApi.stats(24), refetchInterval: 15000 });

  const statsByCode = useMemo(() => Object.fromEntries((statsQuery.data ?? []).map((s) => [s.code, s])), [statsQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => rulesApi.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RuleUpdatePayload }) => rulesApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      setEditingId(null);
      setJustSavedId(id);
      window.setTimeout(() => setJustSavedId((cur) => (cur === id ? null : cur)), 2200);
    },
  });

  const rules = query.data ?? [];
  const categories = useMemo(() => Array.from(new Set(rules.map((r) => r.category))).sort(), [rules]);
  const maxWeight = Math.max(...rules.map((r) => r.weight), 1);
  const enabledCount = rules.filter((r) => r.enabled).length;
  const maxCombinedWeight = rules.filter((r) => r.enabled).reduce((sum, r) => sum + r.weight, 0);

  const filtered = rules.filter((r) => {
    if (activeCategory && r.category !== activeCategory) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  const editingRule = rules.find((r) => r.id === editingId) ?? null;

  return (
    <AppLayout title="Rule Engine Configuration" subtitle="Tune the parameters that actually drive fraud detection — live, no deploy required">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Rules" value={String(rules.length)} />
        <StatTile label="Enabled" value={`${enabledCount}/${rules.length}`} tone={enabledCount === rules.length ? "success" : "warning"} />
        <StatTile label="Max Combined Weight" value={maxCombinedWeight.toFixed(0)} hint="score is capped at 100" />
        <StatTile label="Evaluation Window" value="24h" hint="trigger stats below" />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search rules by name, code, description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
            {categories.map((cat) => (
              <FilterChip key={cat} label={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
            ))}
          </div>
        </div>
      </Card>

      <Card>
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No rules match your filters" description="Try a different search term or category." />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((rule) => {
              const stat = statsByCode[rule.code];
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 transition-all duration-300 hover:bg-slate-50/70",
                    !rule.enabled && "opacity-60",
                    justSavedId === rule.id && "bg-primary-50/60 ring-1 ring-inset ring-primary/20"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-800">{rule.name}</p>
                      <Badge tone={categoryTone(rule.category)}>{rule.category}</Badge>
                      <Badge tone="slate">Priority {rule.priority}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{rule.description}</p>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-premium"
                          style={{ width: `${(rule.weight / maxWeight) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-600">Weight {rule.weight}</span>
                      <span className="text-slate-300">·</span>
                      {stat ? (
                        <span className="text-xs text-slate-400">
                          Fired <span className="font-semibold text-slate-600">{stat.triggered_count}</span> of {stat.evaluated_count} txns
                          ({(stat.trigger_rate * 100).toFixed(1)}%) in 24h
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No transactions evaluated in 24h</span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">Updated {timeAgo(rule.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(rule.id)}>
                      Edit
                    </Button>
                    <ToggleSwitch checked={rule.enabled} onChange={(enabled) => toggleMutation.mutate({ id: rule.id, enabled })} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <RuleEditDialog
        rule={editingRule}
        onClose={() => setEditingId(null)}
        isSaving={updateMutation.isPending}
        onSave={(payload) => editingRule && updateMutation.mutate({ id: editingRule.id, payload })}
      />
    </AppLayout>
  );
}

function StatTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" | "warning" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1.5 text-xl font-bold tabular-nums", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </Card>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
        active ? "bg-primary text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {label}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-95",
        checked ? "bg-primary" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-premium",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
