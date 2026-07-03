import { Globe2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GeoPoint } from "@/types";
import { formatNumber } from "@/lib/utils";

const LON_RANGE: [number, number] = [-20, 145];
const LAT_RANGE: [number, number] = [-5, 60];

function project(lat: number, lon: number) {
  const x = ((lon - LON_RANGE[0]) / (LON_RANGE[1] - LON_RANGE[0])) * 100;
  const y = 100 - ((lat - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * 100;
  return { x, y };
}

function riskColor(score: number): string {
  if (score >= 61) return "#DC2626";
  if (score >= 31) return "#EA580C";
  return "#2563EB";
}

export function GeoHeatMap({ data }: { data: GeoPoint[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Geographic Transaction Heat Map</CardTitle>
          <CardDescription>Bubble size = volume &middot; Color = average risk</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={Globe2} title="No geographic data yet" />
        ) : (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-b from-primary-50 via-slate-50 to-slate-50">
            <svg viewBox="0 0 100 56" className="absolute inset-0 h-full w-full">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 12.5} y1={0} x2={i * 12.5} y2={56} stroke="#E2E8F0" strokeWidth={0.15} />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 11.2} x2={100} y2={i * 11.2} stroke="#E2E8F0" strokeWidth={0.15} />
              ))}
              {data.map((point) => {
                const { x, y } = project(point.latitude, point.longitude);
                const radius = 1.2 + (point.count / maxCount) * 3.2;
                return (
                  <g key={`${point.city}-${point.country}`}>
                    <circle
                      cx={x}
                      cy={y * 0.56}
                      r={radius}
                      fill={riskColor(point.risk_score_avg)}
                      fillOpacity={0.28}
                      stroke={riskColor(point.risk_score_avg)}
                      strokeWidth={0.3}
                    >
                      <title>
                        {point.city}, {point.country} &middot; {point.count} txns &middot; avg risk{" "}
                        {point.risk_score_avg}
                      </title>
                    </circle>
                    <circle cx={x} cy={y * 0.56} r={0.6} fill={riskColor(point.risk_score_avg)} />
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <LegendDot color="#2563EB" label="Low risk" />
          <LegendDot color="#EA580C" label="Medium risk" />
          <LegendDot color="#DC2626" label="High risk" />
          <span className="ml-auto text-slate-400">{formatNumber(data.reduce((s, d) => s + d.count, 0))} transactions mapped</span>
        </div>
      </CardContent>
    </Card>
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
