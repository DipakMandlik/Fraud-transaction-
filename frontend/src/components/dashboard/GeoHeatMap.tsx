import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Globe2, MapPin, ShieldAlert, Plus, Minus, Crosshair } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import worldTopo from "world-atlas/countries-110m.json";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useNotifications } from "@/hooks/useNotifications";
import type { GeoPoint, Transaction } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

// Country outlines come from a bundled world-atlas topojson — no map tiles and
// no runtime network requests, so the map renders identically on GitHub Pages,
// offline, or behind a strict CSP.
const GEOGRAPHY = worldTopo as unknown as Parameters<typeof Geographies>[0]["geography"];

const MAP_W = 820;
const MAP_H = 460;
const WORLD_VIEW = { coordinates: [34, 22] as [number, number], zoom: 1 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 26;
const PING_LIFETIME_MS = 2600;

type View = { coordinates: [number, number]; zoom: number };
type RiskBand = "high" | "medium" | "low";

const BAND_COLOR: Record<RiskBand, string> = {
  high: "#DC2626",
  medium: "#EA580C",
  low: "#2563EB",
};

function riskBand(score: number): RiskBand {
  if (score >= 61) return "high";
  if (score >= 31) return "medium";
  return "low";
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface FraudPing {
  id: number;
  coordinates: [number, number];
}

export function GeoHeatMap({ data }: { data: GeoPoint[] }) {
  const { onTransaction } = useNotifications();
  const [view, setView] = useState<View>(WORLD_VIEW);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pings, setPings] = useState<FraudPing[]>([]);

  const viewRef = useRef<View>(WORLD_VIEW);
  const rafRef = useRef<number | undefined>(undefined);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current ?? 0);
      timersRef.current.forEach(clearTimeout);
    },
    []
  );

  // Smoothly tween center/zoom over ~720ms — this is what turns a click into a
  // "fly in" rather than an instant jump.
  const animateTo = useCallback((target: View) => {
    cancelAnimationFrame(rafRef.current ?? 0);
    const start = viewRef.current;
    const t0 = performance.now();
    const duration = 720;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = easeInOut(p);
      const next: View = {
        coordinates: [
          lerp(start.coordinates[0], target.coordinates[0], e),
          lerp(start.coordinates[1], target.coordinates[1], e),
        ],
        zoom: lerp(start.zoom, target.zoom, e),
      };
      viewRef.current = next;
      setView(next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const keyOf = (p: GeoPoint) => `${p.city}-${p.country}`;

  const flyTo = useCallback(
    (point: GeoPoint) => {
      setSelected(keyOf(point));
      animateTo({ coordinates: [point.longitude, point.latitude], zoom: 6 });
    },
    [animateTo]
  );

  const resetView = useCallback(() => {
    setSelected(null);
    animateTo(WORLD_VIEW);
  }, [animateTo]);

  const zoomBy = useCallback(
    (factor: number) => {
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewRef.current.zoom * factor));
      animateTo({ coordinates: viewRef.current.coordinates, zoom: z });
    },
    [animateTo]
  );

  const maxCount = useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data]);
  const totals = useMemo(
    () => ({
      cities: data.length,
      txns: data.reduce((s, d) => s + d.count, 0),
      fraud: data.reduce((s, d) => s + d.fraud_count, 0),
    }),
    [data]
  );
  const hotspots = useMemo(
    () => [...data].sort((a, b) => b.fraud_count - a.fraud_count || b.count - a.count).slice(0, 6),
    [data]
  );

  // Live fraud pings — a red pulse appears at the real location of each incoming
  // fraudulent transaction, then fades. Keeps the map feeling alive.
  useEffect(() => {
    const unsubscribe = onTransaction((incoming) => {
      const txn = incoming as Transaction;
      if (!txn.is_fraud) return;
      setPings((prev) => [...prev, { id: txn.id, coordinates: [txn.longitude, txn.latitude] }]);
      const timer = setTimeout(() => {
        setPings((prev) => prev.filter((p) => p.id !== txn.id));
      }, PING_LIFETIME_MS);
      timersRef.current.push(timer);
    });
    return () => unsubscribe();
  }, [onTransaction]);

  const activeKey = hovered ?? selected;
  const active = data.find((p) => keyOf(p) === activeKey) ?? null;
  const z = view.zoom;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Geographic Transaction Heat Map</CardTitle>
            <CardDescription>
              Bubble size = volume &middot; color = average risk &middot; scroll to zoom, click a point to fly in
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
            <div className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-[radial-gradient(circle_at_50%_30%,#eaf2ff,#dce7f5_70%)]">
              <ComposableMap
                projection="geoMercator"
                width={MAP_W}
                height={MAP_H}
                projectionConfig={{ scale: 130 }}
                style={{ width: "100%", height: "auto" }}
              >
                <ZoomableGroup
                  center={view.coordinates}
                  zoom={view.zoom}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  onMoveEnd={(pos) => setView({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom })}
                >
                  <Geographies geography={GEOGRAPHY}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#eef2f7"
                          stroke="#c2ccd9"
                          strokeWidth={0.4}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: "#e0e8f4", outline: "none" },
                            pressed: { fill: "#e0e8f4", outline: "none" },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {/* Location bubbles */}
                  {data.map((point) => {
                    const band = riskBand(point.risk_score_avg);
                    const color = BAND_COLOR[band];
                    const baseR = 3 + Math.sqrt(point.count / maxCount) * 9;
                    const r = baseR / z; // keep bubbles a stable screen size at any zoom
                    const key = keyOf(point);
                    const isActive = key === activeKey;
                    return (
                      <Marker
                        key={key}
                        coordinates={[point.longitude, point.latitude]}
                        onMouseEnter={() => setHovered(key)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => flyTo(point)}
                        style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: { cursor: "pointer" } }}
                      >
                        {band === "high" && (
                          <circle r={r} fill={color} opacity={0.35}>
                            <animate attributeName="r" values={`${r};${r * 2.3};${r}`} dur="2.4s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle
                          r={r}
                          fill={color}
                          fillOpacity={isActive ? 0.4 : 0.26}
                          stroke={color}
                          strokeWidth={(isActive ? 1.6 : 1) / z}
                          strokeOpacity={isActive ? 1 : 0.6}
                        />
                        <circle r={Math.max(0.8, r * 0.32)} fill={color} />
                      </Marker>
                    );
                  })}

                  {/* Live fraud pings */}
                  {pings.map((ping) => {
                    const pr = 6 / z;
                    return (
                      <Marker key={ping.id} coordinates={ping.coordinates}>
                        <circle r={pr} fill="none" stroke="#DC2626" strokeWidth={1.4 / z}>
                          <animate attributeName="r" values={`${pr * 0.5};${pr * 2.4}`} dur="1.3s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.9;0" dur="1.3s" repeatCount="indefinite" />
                        </circle>
                        <circle r={2 / z} fill="#DC2626" />
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>

              {/* Zoom controls */}
              <div className="absolute right-3 top-3 flex flex-col gap-1.5">
                <Button size="icon" variant="outline" aria-label="Zoom in" className="h-8 w-8 shadow-sm" onClick={() => zoomBy(1.6)}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" aria-label="Zoom out" className="h-8 w-8 shadow-sm" onClick={() => zoomBy(1 / 1.6)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" aria-label="Reset view" className="h-8 w-8 shadow-sm" onClick={resetView}>
                  <Crosshair className="h-4 w-4" />
                </Button>
              </div>

              {/* Active-location detail card */}
              {active && (
                <div className="pointer-events-none absolute bottom-3 left-3 max-w-[230px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
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
                        onMouseEnter={() => setHovered(key)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => flyTo(point)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                          key === selected ? "bg-primary-50 ring-1 ring-primary/30" : "hover:bg-white/70"
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
              <p className="mt-3 border-t border-slate-200/70 pt-2 text-[10px] leading-relaxed text-slate-400">
                Click any hotspot to fly the map to it. Use the crosshair to return to the world view.
              </p>
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
