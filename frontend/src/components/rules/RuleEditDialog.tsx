import { RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { configFieldMeta } from "@/components/rules/ruleMeta";
import { cn } from "@/lib/utils";
import type { Rule } from "@/types";

export interface RuleUpdatePayload {
  weight: number;
  priority: number;
  config: Record<string, number>;
}

interface RuleEditDialogProps {
  rule: Rule | null;
  onClose: () => void;
  onSave: (payload: RuleUpdatePayload) => void;
  isSaving: boolean;
}

function toFormState(rule: Rule) {
  return {
    weight: String(rule.weight),
    priority: String(rule.priority),
    config: Object.fromEntries(Object.entries(rule.config).map(([k, v]) => [k, String(v)])),
  };
}

export function RuleEditDialog({ rule, onClose, onSave, isSaving }: RuleEditDialogProps) {
  const [form, setForm] = useState(() => (rule ? toFormState(rule) : { weight: "", priority: "", config: {} }));

  useEffect(() => {
    if (rule) setForm(toFormState(rule));
  }, [rule?.id]);

  if (!rule) return null;
  const currentRule = rule;

  const weightChanged = Number(form.weight) !== rule.weight;
  const priorityChanged = Number(form.priority) !== rule.priority;
  const changedConfigKeys = Object.keys(form.config).filter((k) => Number(form.config[k]) !== (rule.config[k] as number));
  const hasChanges = weightChanged || priorityChanged || changedConfigKeys.length > 0;

  const weightValid = form.weight !== "" && Number(form.weight) >= 0;
  const priorityValid = form.priority !== "" && Number.isInteger(Number(form.priority)) && Number(form.priority) >= 1;
  const configValid = Object.keys(form.config).every((k) => {
    const val = Number(form.config[k]);
    return form.config[k] !== "" && !Number.isNaN(val) && val >= configFieldMeta(k).min;
  });
  const isValid = weightValid && priorityValid && configValid;

  function resetToDefault() {
    setForm({
      weight: String(currentRule.default_weight),
      priority: String(currentRule.default_priority),
      config: Object.fromEntries(Object.entries(currentRule.default_config).map(([k, v]) => [k, String(v)])),
    });
  }

  const isAtDefault =
    Number(form.weight) === rule.default_weight &&
    Number(form.priority) === rule.default_priority &&
    Object.keys(form.config).every((k) => Number(form.config[k]) === (rule.default_config[k] as number));

  return (
    <Dialog open={rule !== null} onOpenChange={(open) => !open && onClose()} title={rule.name} description={rule.description}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge tone="slate">{rule.category}</Badge>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{rule.code}</code>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight" hint="Added to the risk score when this rule triggers" changed={weightChanged}>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              className={cn(!weightValid && "border-fraud focus:border-fraud")}
            />
          </Field>
          <Field label="Priority" hint="Lower runs first" changed={priorityChanged}>
            <Input
              type="number"
              min={1}
              step={1}
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className={cn(!priorityValid && "border-fraud focus:border-fraud")}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Detection Parameters</p>
          {Object.keys(form.config).length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              This rule has no tunable parameters — it triggers on the presence of the condition alone.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(form.config).map((key) => {
                const meta = configFieldMeta(key);
                const changed = changedConfigKeys.includes(key);
                const val = Number(form.config[key]);
                const valid = form.config[key] !== "" && !Number.isNaN(val) && val >= meta.min;
                return (
                  <Field key={key} label={meta.label} hint={meta.unit} changed={changed}>
                    <Input
                      type="number"
                      min={meta.min}
                      step={meta.step}
                      value={form.config[key]}
                      onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, [key]: e.target.value } }))}
                      className={cn(!valid && "border-fraud focus:border-fraud")}
                    />
                  </Field>
                );
              })}
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary-600">Pending Changes</p>
            <ul className="space-y-0.5 text-xs text-slate-700">
              {weightChanged && <li>Weight: <span className="font-mono">{rule.weight}</span> → <span className="font-mono font-semibold">{form.weight}</span></li>}
              {priorityChanged && <li>Priority: <span className="font-mono">{rule.priority}</span> → <span className="font-mono font-semibold">{form.priority}</span></li>}
              {changedConfigKeys.map((k) => (
                <li key={k}>
                  {configFieldMeta(k).label}: <span className="font-mono">{String(rule.config[k])}</span> →{" "}
                  <span className="font-mono font-semibold">{form.config[k]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={resetToDefault} disabled={isAtDefault}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset to Default
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!hasChanges || !isValid || isSaving}
            loading={isSaving}
            onClick={() =>
              onSave({
                weight: Number(form.weight),
                priority: Number(form.priority),
                config: Object.fromEntries(Object.entries(form.config).map(([k, v]) => [k, Number(v)])),
              })
            }
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  changed,
  children,
}: {
  label: string;
  hint?: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
        {label}
        {changed && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
