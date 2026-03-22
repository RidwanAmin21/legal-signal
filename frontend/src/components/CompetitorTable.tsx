"use client";
import { useState } from "react";
import type { Competitor } from "@/lib/types";
import { getScoreBand } from "@/lib/types";

interface CompetitorTableProps {
  competitors: Competitor[];
  clientFirmName?: string;
  clientScore?: number;
}

export default function CompetitorTable({
  competitors,
  clientFirmName,
  clientScore,
}: CompetitorTableProps) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const allFirms = [
    ...(clientFirmName && clientScore !== undefined
      ? [{ canonical_name: clientFirmName, score: clientScore, isClient: true }]
      : []),
    ...competitors.map((c) => ({ ...c, isClient: false })),
  ].sort((a, b) => sortDir === "desc" ? b.score - a.score : a.score - b.score);

  if (allFirms.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        No competitor data yet. Run the pipeline to populate this table.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted w-12">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
              Firm
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted cursor-pointer select-none hover:text-foreground transition-colors"
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
            >
              Score {sortDir === "desc" ? "↓" : "↑"}
            </th>
          </tr>
        </thead>
        <tbody>
          {allFirms.map((firm, i) => {
            const band = getScoreBand(firm.score);
            return (
              <tr
                key={firm.canonical_name}
                className={`border-b border-border last:border-0 ${
                  firm.isClient ? "bg-amber-50/60" : "hover:bg-background/40"
                }`}
              >
                <td className="px-4 py-3 text-muted font-medium">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      i === 0
                        ? "bg-accent text-white"
                        : "bg-border text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {firm.canonical_name}
                  {firm.isClient && (
                    <span className="ml-2 text-xs font-medium text-accent">
                      (your firm)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${band.color} ${band.bgColor}`}
                  >
                    {firm.score}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
