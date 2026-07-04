import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TrendPoint } from "@/types";
import { Activity } from "lucide-react";

export function FraudTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card interactive>
      <CardHeader>
        <CardTitle>Transaction &amp; Fraud Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={Activity} title="No trend data yet" description="Data will appear as transactions stream in." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fraudGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: "#CBD5E1", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 12px 28px -8px rgba(15,23,42,0.16)" }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Transactions"
                stroke="#2563EB"
                fill="url(#totalGradient)"
                strokeWidth={2}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={900}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="fraud"
                name="Fraud Detected"
                stroke="#DC2626"
                fill="url(#fraudGradient)"
                strokeWidth={2}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
