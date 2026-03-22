"use client";
import type { VisibilityScore } from "@/lib/types";

interface PlatformBreakdownProps {
  current: VisibilityScore;
  previous?: VisibilityScore;
}

const PLATFORMS = [
  { key: "chatgpt_score" as const, label: "ChatGPT" },
  { key: "perplexity_score" as const, label: "Perplexity" },
  { key: "gemini_score" as const, label: "Gemini" },
];

export default function PlatformBreakdown({ current, previous }: PlatformBreakdownProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {PLATFORMS.map(({ key, label }) => {
        const score = current[key];
        const prevScore = previous?.[key] ?? null;
        const delta =
          score !== null && prevScore !== null ? score - prevScore : null;

        return (
          <div key={key} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-widest text-muted">
              {label}
            </p>
            {score !== null ? (
              <>
                <p className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {score}
                </p>
                {delta !== null && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      delta > 0
                        ? "text-green-600"
                        : delta < 0
                        ? "text-red-600"
                        : "text-muted"
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta === 0 ? "No change" : delta} vs last week
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">No data</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
