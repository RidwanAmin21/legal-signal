"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VisibilityScore } from "@/lib/types";
import { formatWeekDate } from "@/lib/utils";

interface TrendChartProps {
  scores: VisibilityScore[];
}

export default function TrendChart({ scores }: TrendChartProps) {
  if (!scores || scores.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted">No trend data yet</p>
      </div>
    );
  }

  // Scores come in newest-first — reverse for chronological display
  const data = [...scores].reverse().map((s) => ({
    week: formatWeekDate(s.week_date),
    score: s.overall_score,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="mb-4 text-sm font-medium text-muted">Score Trend (12 weeks)</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b45309" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e7e5e4",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [value, "Score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#b45309"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#b45309" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
