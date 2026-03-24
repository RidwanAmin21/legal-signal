"use client";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useClientId } from "@/hooks/useClientId";
import { useScores } from "@/hooks/useScores";

const ENGINE_ABBR: Record<string, string> = { perplexity: "P", chatgpt: "G", gemini: "Ge" };

function ScoreDelta({ score, prev }: { score: number | null; prev: number | null }) {
  if (score === null || prev === null) return <span className="text-muted text-xs">—</span>;
  const delta = score - prev;
  if (delta === 0) return <span className="text-muted text-xs">—</span>;
  return (
    <span className={`text-xs font-medium ${delta > 0 ? "text-success" : "text-error"}`}>
      {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}
    </span>
  );
}

export default function AuditsPage() {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: async () => {
      const res = await fetch("/api/client");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: audits, isLoading } = useQuery({
    queryKey: ["audits", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/audits?client_id=${encodeURIComponent(clientId)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: scores } = useScores(clientId);

  const firmName = client?.firm_name ?? "Your Firm";
  const latestScore = scores?.[0]?.overall_score ?? null;
  const oldestScore = scores ? scores[scores.length - 1]?.overall_score ?? null : null;
  const trend = latestScore !== null && oldestScore !== null ? latestScore - oldestScore : null;

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-8 py-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Audit History</h1>
            <p className="mt-1 text-sm text-muted">Weekly AI visibility audits across ChatGPT, Perplexity, and Gemini.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            {
              label: "Current Score",
              value: latestScore !== null ? `${latestScore}/100` : "—",
              sub: scores?.[0]?.week_date ? `as of ${new Date(scores[0].week_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "no data yet",
            },
            {
              label: "Score Trend",
              value: trend !== null ? (trend >= 0 ? `+${trend}` : String(trend)) : "—",
              sub: scores && scores.length > 1 ? `over ${scores.length} audits` : "need more audits",
              color: trend !== null ? (trend >= 0 ? "text-success" : "text-error") : undefined,
            },
            {
              label: "Total Audits Run",
              value: audits?.length ?? "—",
              sub: "completed",
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-lg border border-border bg-bg-card p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className={`mt-2 font-display text-3xl font-semibold ${color ?? "text-foreground"}`}>{value}</p>
              <p className="mt-1 text-xs text-muted">{sub}</p>
            </div>
          ))}
        </div>

        {/* Audit list */}
        <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-medium text-foreground">All Audits</h2>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-border" />
              ))}
            </div>
          ) : !audits || audits.length === 0 ? (
            <p className="px-5 py-8 text-xs text-muted text-center">No audits yet. Run the pipeline to see results.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Score</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Change</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Queries</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Mentions</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {audits.map((audit: any) => (
                  <tr key={audit.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground text-sm">
                      {audit.week_date
                        ? new Date(audit.week_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : new Date(audit.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold text-foreground">
                          {audit.overall_score ?? "—"}
                        </span>
                        {audit.overall_score && <span className="text-xs text-muted">/100</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ScoreDelta score={audit.overall_score} prev={audit.prev_score} />
                    </td>
                    <td className="px-5 py-3.5 text-secondary">{audit.prompts_sent ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-foreground font-medium">{audit.mentions_extracted ?? "—"}</span>
                      {audit.prompts_sent && (
                        <span className="text-muted text-xs ml-1">/{audit.prompts_sent}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        audit.status === "completed" || audit.status === "delivered"
                          ? "bg-success/10 text-success"
                          : audit.status === "running"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-error/10 text-error"
                      }`}>
                        {audit.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/audits/${audit.id}`}
                        className="text-xs text-accent hover:text-accent-muted transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
