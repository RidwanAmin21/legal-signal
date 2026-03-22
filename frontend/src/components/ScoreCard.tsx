"use client";
import type { VisibilityScore } from "@/lib/types";
import { getScoreBand } from "@/lib/types";
import { formatWeekDate } from "@/lib/utils";

interface ScoreCardProps {
  current: VisibilityScore;
  previous?: VisibilityScore;
}

export default function ScoreCard({ current, previous }: ScoreCardProps) {
  const band = getScoreBand(current.overall_score);
  const delta = previous ? current.overall_score - previous.overall_score : null;

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Visibility Score</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-6xl font-semibold leading-none text-foreground">
              {current.overall_score}
            </span>
            <span className="mb-1 text-base text-muted">/ 100</span>
          </div>
          <span
            className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${band.color} ${band.bgColor}`}
          >
            {band.label}
          </span>
        </div>

        {delta !== null && (
          <div className="text-right">
            <p className="text-xs text-muted">vs. last week</p>
            <p
              className={`mt-1 font-display text-2xl font-semibold ${
                delta > 0
                  ? "text-green-600"
                  : delta < 0
                  ? "text-red-600"
                  : "text-muted"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        Week of {formatWeekDate(current.week_date)}
      </p>
    </div>
  );
}
