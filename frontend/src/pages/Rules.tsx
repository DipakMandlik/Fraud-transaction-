import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { rulesApi } from "@/lib/api";
import type { Rule } from "@/types";

export default function Rules() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [weight, setWeight] = useState("");
  const [threshold, setThreshold] = useState("");

  const query = useQuery({ queryKey: ["rules"], queryFn: rulesApi.list });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => rulesApi.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rules"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { weight?: number; threshold?: number | null } }) =>
      rulesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      setEditing(null);
    },
  });

  function openEdit(rule: Rule) {
    setEditing(rule);
    setWeight(String(rule.weight));
    setThreshold(rule.threshold === null ? "" : String(rule.threshold));
  }

  return (
    <AppLayout title="Rule Engine Configuration" subtitle="Tune weights, thresholds and enable/disable detection rules">
      <Card>
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {query.data?.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-slate-50/70 ${
                  rule.enabled ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{rule.name}</p>
                    <Badge tone="slate">{rule.category}</Badge>
                    <Badge tone="blue">Weight {rule.weight}</Badge>
                    {rule.threshold !== null && <Badge tone="slate">Threshold {rule.threshold}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{rule.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(rule)}>
                    Edit
                  </Button>
                  <ToggleSwitch
                    checked={rule.enabled}
                    onChange={(enabled) => toggleMutation.mutate({ id: rule.id, enabled })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.name ?? ""}
        description="Adjust the scoring weight and trigger threshold for this rule."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Weight (added to risk score when triggered)</label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Threshold (optional)</label>
            <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="No threshold" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button
            disabled={updateMutation.isPending}
            onClick={() =>
              editing &&
              updateMutation.mutate({
                id: editing.id,
                payload: {
                  weight: Number(weight),
                  threshold: threshold === "" ? null : Number(threshold),
                },
              })
            }
          >
            Save Changes
          </Button>
        </div>
      </Dialog>
    </AppLayout>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 active:scale-95 ${
        checked ? "bg-primary" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-premium ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
