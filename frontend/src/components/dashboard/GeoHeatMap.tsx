import { useEffect, useMemo, useRef, useState } from "react";

import { Globe2, MapPin, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import type { GeoPoint, Transaction } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

const PING_LIFETIME_MS = 2600;
const VIEW_W = 100;
const VIEW_H = 62.5; // 16:10 aspect ratio to match the container
const PAD = 9; // inner padding (in viewBox units) so bubbles never touch the edge

type RiskBand = "high" | "medium" | "low";

function riskBand(score: number): RiskBand {
  if (score >= 61) return "high";
  if (score >= 31) return "medium";
  return "low";
}

const BAND_COLOR: Record<RiskBand, string> = {
  high: "#DC2626",
  medium: "#EA580C",
  low: "#2563EB",
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Fit the projection to the *bulk* of the data (10th–90th percentile of
 * coordinates) rather than the raw min/max. A handful of far-flung foreign
 * transactions would otherwise stretch the bounds and squeeze every domestic
 * city into one dense blob; here the dense cluster spreads across the canvas
 * and the rare outliers are simply clamped to the map edge. */
function makeProjection(points: GeoPoint[]) {
  const lats = points.map((p) => p.latitude).sort((a, b) => a - b);
  const lons = points.map((p) => p.longitude).sort((a, b) => a - b);

  let minLat = percentile(lats, 0.2);
  let maxLat = percentile(lats, 0.8);
  let minLon = percentile(lons, 0.2);
  let maxLon = percentile(lons, 0.8);

  // Guard against a zero-width/height span (single city, or all-identical).
  if (!isFinite(minLat) || maxLat - minLat < 0.5) {
    const mid = isFinite(minLat) ? (minLat + maxLat) / 2 : 22;
    minLat = mid - 5;
    maxLat = mid + 5;
  }
  if (!isFinite(minLon) || maxLon - minLon < 0.5) {
    const mid = isFinite(minLon) ? (minLon + maxLon) / 2 : 80;
    minLon = mid - 5;
    maxLon = mid + 5;
  }

  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  return (lat: number, lon: number) => {
    const x = PAD + ((lon - minLon) / lonSpan) * (VIEW_W - 2 * PAD);
    const y = PAD + (1 - (lat - minLat) / latSpan) * (VIEW_H - 2 * PAD);
    return { x: clamp(x, 1, VIEW_W - 1), y: clamp(y, 1, VIEW_H - 1) };
  };
}

interface FraudPing {
  id: number;
  x: number;
  y: number;
}

export function GeoHeatMap({ data }: { data: GeoPoint[] }) {
  const { onTransaction } = useNotifications();
  const [pings, setPings] = useState<FraudPing[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const project = useMemo(() => makeProjection(data), [data]);
  const maxCount = useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data]);

  const totals = useMemo(() => {
    const txns = data.reduce((s, d) => s + d.count, 0);
    const fraud = data.reduce((s, d) => s + d.fraud_count, 0);
    return { txns, fraud, cities: data.length };
  }, [data]);

  // Highest-fraud locations first; break ties by transaction volume.
  const hotspots = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.fraud_count - a.fraud_count || b.count - a.count)
        .slice(0, 6),
    [data]
  );

  useEffect(() => {
    const unsubscribe = onTransaction((incoming) => {
      const txn = incoming as Transaction;
      if (!txn.is_fraud) return;
      const { x, y } = project(txn.latitude, txn.longitude);
      setPings((prev) => [...prev, { id: txn.id, x, y }]);
      const timer = setTimeout(() => {
        setPings((prev) => prev.filter((p) => p.id !== txn.id));
      }, PING_LIFETIME_MS);
      timersRef.current.push(timer);
    });
    return () => {
      unsubscribe();
      timersRef.current.forEach(clearTimeout);
    };
  }, [onTransaction, project]);

  const keyOf = (p: GeoPoint) => `${p.city}-${p.country}`;
  const active = data.find((p) => keyOf(p) === activeKey) ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Geographic Transaction Heat Map</CardTitle>
            <CardDescription>
              Bubble size = volume &middot; color = average risk &middot; pulses = live fraud
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-right">
            <SummaryStat label="Locations" value={formatNumber(totals.cities)} />
            <SummaryStat label="Transactions" value={formatNumber(totals.txns)} />
            <SummaryStat label="Fraud" value={formatNumber(totals.fraud)} tone="fraud" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={Globe2} title="No geographic data yet" description="Live transactions will appear here as they are processed." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            {/* Map */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200/70 bg-[radial-gradient(circle_at_50%_35%,#eef4ff,#f1f5f9_70%)]">
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 h-full w-full"
                onMouseLeave={() => setActiveKey(null)}
              >
                <defs>
                  {(["high", "medium", "low"] as RiskBand[]).map((band) => (
                    <radialGradient key={band} id={`bubble-${band}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={BAND_COLOR[band]} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={BAND_COLOR[band]} stopOpacity={0.12} />
                    </radialGradient>
                  ))}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="0.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* graticule */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <line key={`v${i}`} x1={(i * VIEW_W) / 6} y1={0} x2={(i * VIEW_W) / 6} y2={VIEW_H} stroke="#cbd5e1" strokeWidth={0.1} strokeDasharray="0.6 0.9" />
                ))}
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={`h${i}`} x1={0} y1={(i * VIEW_H) / 4} x2={VIEW_W} y2={(i * VIEW_H) / 4} stroke="#cbd5e1" strokeWidth={0.1} strokeDasharray="0.6 0.9" />
                ))}

                {/* location bubbles */}
                {data.map((point) => {
                  const { x, y } = project(point.latitude, point.longitude);
                  const band = riskBand(point.risk_score_avg);
                  // sqrt scaling so a few very-high-volume cities don't balloon
                  // into overlapping blobs that hide the rest.
                  const radius = 1.2 + Math.sqrt(point.count / maxCount) * 2.6;
                  const key = keyOf(point);
                  const isActive = key === activeKey;
                  return (
                    <g
                      key={key}
                      className="cursor-pointer"
                      onMouseEnter={() => setActiveKey(key)}
                      onClick={() => setActiveKey((k) => (k === key ? null : key))}
                    >
                      {/* generous invisible hit area for hover/tap */}
                      <circle cx={x} cy={y} r={Math.max(radius, 3)} fill="transparent" />
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill={`url(#bubble-${band})`}
                        stroke={BAND_COLOR[band]}
                        strokeWidth={isActive ? 0.5 : 0.25}
                        strokeOpacity={isActive ? 1 : 0.6}
                        filter={band === "high" ? "url(#glow)" : undefined}
                      />
                      <circle cx={x} cy={y} r={0.7} fill={BAND_COLOR[band]} />
                    </g>
                  );
                })}

                {/* live fraud pings */}
                {pings.map((ping) => (
                  <g key={ping.id} style={{ transformOrigin: `${ping.x}px ${ping.y}px` }}>
                    <circle cx={ping.x} cy={ping.y} r={1.4} fill="#DC2626" className="animate-ping" style={{ transformOrigin: `${ping.x}px ${ping.y}px` }} />
                    <circle cx={ping.x} cy={ping.y} r={1.6} fill="none" stroke="#DC2626" strokeWidth={0.35} opacity={0.8} />
                  </g>
                ))}
              </svg>

              {/* hover/tap detail card */}
              {active && (
                <div className="pointer-events-none absolute left-3 top-3 max-w-[220px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <MapPin className="h-3.5 w-3.5 text-primary-600" />
                    {active.city}
                  </div>
                  <p className="text-[11px] text-slate-400">{active.country}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <DetailRow label="Transactions" value={formatNumber(active.count)} />
                    <DetailRow label="Fraud" value={formatNumber(active.fraud_count)} tone={active.fraud_count > 0 ? "fraud" : undefined} />
                    <DetailRow label="Avg risk" value={String(Math.round(active.risk_score_avg))} tone={riskBand(active.risk_score_avg)} />
                    <DetailRow label="Fraud rate" value={`${active.count ? Math.round((active.fraud_count / active.count) * 100) : 0}%`} />
                  </div>
                </div>
              )}
            </div>

            {/* Top hotspots list */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ShieldAlert className="h-3.5 w-3.5 text-fraud" />
                Top Fraud Hotspots
              </p>
              <ul className="space-y-1">
                {hotspots.map((point) => {
                  const key = keyOf(point);
                  const band = riskBand(point.risk_score_avg);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveKey(key)}
                        onMouseLeave={() => setActiveKey(null)}
                        onClick={() => setActiveKey((k) => (k === key ? null : key))}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                          key === activeKey ? "bg-white shadow-sm" : "hover:bg-white/70"
                        )}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: BAND_COLOR[band] }} />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{point.city}</span>
                        <span className="shrink-0 text-[11px] font-semibold text-fraud">{formatNumber(point.fraud_count)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <LegendDot color={BAND_COLOR.low} label="Low risk (0–30)" />
          <LegendDot color={BAND_COLOR.medium} label="Medium risk (31–60)" />
          <LegendDot color={BAND_COLOR.high} label="High risk (61+)" />
          <span className="ml-auto text-slate-400">{formatNumber(totals.txns)} transactions mapped</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "fraud" }) {
  return (
    <div>
      <p className={cn("text-lg font-bold leading-none", tone === "fraud" ? "text-fraud" : "text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function DetailRow({ label, value, tone }: { label: string; value: string; tone?: RiskBand | "fraud" }) {
  const color =
    tone === "fraud" ? "text-fraud" : tone ? { high: "text-red-600", medium: "text-orange-600", low: "text-primary-600" }[tone] : "text-slate-700";
  return (
    <div>
      <span className="text-slate-400">{label}</span>
      <span className={cn("ml-1 font-semibold", color)}>{value}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
