import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChannelDistribution } from "@/types";
import { titleCase } from "@/lib/utils";
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = ["#2563EB", "#0EA5E9", "#16A34A", "#EA580C", "#7C3AED", "#DB2777", "#0891B2"];

export function ChannelDistributionChart({ data }: { data: ChannelDistribution[] }) {
  const chartData = data.map((d) => ({ ...d, label: titleCase(d.channel) }));

  return (
    <Card interactive>
      <CardHeader>
        <CardTitle>Channel Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState icon={PieChartIcon} title="No channel data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF2F7" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={90}
                tick={{ fontSize: 12, fill: "#475569" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 12px 28px -8px rgba(15,23,42,0.16)" }}
              />
              <Bar dataKey="count" name="Transactions" radius={[0, 6, 6, 0]} barSize={16} animationDuration={800} animationEasing="ease-out">
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
