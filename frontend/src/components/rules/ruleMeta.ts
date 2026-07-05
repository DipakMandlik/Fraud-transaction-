import type { Tone } from "@/components/ui/Badge";

interface ConfigFieldMeta {
  label: string;
  unit?: string;
  step: number;
  min: number;
}

/** Human labels for the config keys read by backend/app/services/rule_engine.py.
 * Presentation metadata only — the actual values always come from the API. */
const CONFIG_FIELD_META: Record<string, ConfigFieldMeta> = {
  multiplier: { label: "Multiplier", unit: "x avg. transaction", step: 0.5, min: 1 },
  amount_threshold: { label: "Amount Threshold", unit: "₹", step: 1000, min: 0 },
  max_speed_kmh: { label: "Max Plausible Speed", unit: "km/h", step: 10, min: 0 },
  count: { label: "Trigger Count", unit: "occurrences", step: 1, min: 1 },
  window_seconds: { label: "Time Window", unit: "seconds", step: 5, min: 1 },
  window_minutes: { label: "Time Window", unit: "minutes", step: 1, min: 1 },
  dormant_days: { label: "Dormant Period", unit: "days", step: 1, min: 1 },
  threshold: { label: "Reporting Threshold", unit: "₹", step: 1000, min: 0 },
  account_count: { label: "Account Count", unit: "accounts", step: 1, min: 1 },
};

export function configFieldMeta(key: string): ConfigFieldMeta {
  return (
    CONFIG_FIELD_META[key] ?? {
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      step: 1,
      min: 0,
    }
  );
}

export const CATEGORY_TONE: Record<string, Tone> = {
  AMOUNT: "amber",
  DEVICE: "purple",
  LOCATION: "blue",
  VELOCITY: "orange",
  BENEFICIARY: "green",
  MERCHANT: "red",
  NETWORK: "purple",
  BEHAVIOR: "blue",
  PATTERN: "orange",
  AUTH: "slate",
};

export function categoryTone(category: string): Tone {
  return CATEGORY_TONE[category] ?? "slate";
}
