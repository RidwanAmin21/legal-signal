"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import { useClientId } from "@/hooks/useClientId";

const ENGINE_ICON: Record<string, string> = { perplexity: "P", chatgpt: "G", gemini: "Ge" };

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  const { data, isLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => {
      const res = await fetch(`/api/audits/${id}`);
      if (!res.ok) throw new Error("Audit not found");
      return res.json();
    },
    enabled: !!id,
  });

  const firmName = client?.firm_name ?? "Your Firm";
  const run = data?.run;
  const score = data?.score;
  const responses: any[] = data?.responses ?? [];

  const auditDate = run?.week_date ?? run?.created_at
    ? new Date(run?.week_date ?? run?.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  const mentionedCount = responses.filter((r) =>
    (r.firms_mentioned ?? []).some((m: any) => m.canonical_name?.toLowerCase() === firmName.toLowerCase())
  ).length;

  const firstPositionCount = responses.reduce((acc: number, r: any) => {
    const mine = (r.firms_mentioned ?? []).find(
      (m: any) => m.canonical_name?.toLowerCase() === firmName.toLowerCase()
    );
    return acc + (mine?.position === 1 ? 1 : 0);
  }, 0);

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/audits" className="hover:text-foreground transition-colors">Audits</Link>
          <span>/</span>
          <span className="text-secondary">{auditDate}</span>
        </nav>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-border" />
            ))}
          </div>
        ) : !run ? (
          <p className="text-sm text-muted">Audit not found.</p>
        ) : (
          <>
            {/* Page header */}
            <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Audit — {auditDate}</h1>
                <p className="mt-1 text-sm text-muted">
                  {run.prompts_sent ?? "—"} queries · {run.responses_received ?? "—"} responses
                </p>
              </div>
              {score && (
                <div className="text-right">
                  <p className="text-xs text-muted">Score</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-semibold text-foreground">{score.overall_score}</span>
                    <span className="text-sm text-muted">/100</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary cards */}
            {score && (
              <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {[
                  { label: "Queries Tested",  value: run.prompts_sent ?? "—",       sub: "across AI engines" },
                  { label: "Times Mentioned", value: mentionedCount,                 sub: "queries", color: "text-accent" },
                  { label: "Mention Rate",    value: `${Math.round((score.mention_rate ?? 0) * 100)}%`, sub: "of all queries" },
                  { label: "First-Position",  value: firstPositionCount,             sub: "times ranked #1", color: "text-success" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-5">
                    <p className="text-xs text-muted">{label}</p>
                    <p className={`mt-2 font-display text-3xl font-semibold ${color ?? "text-foreground"}`}>{value}</p>
                    <p className="mt-1 text-xs text-muted">{sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Query breakdown — scrollable table on mobile */}
            <div className="mb-8 rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-medium text-foreground">Query Breakdown</h2>
                <p className="mt-0.5 text-xs text-muted">Each query tested across every AI engine</p>
              </div>
              {responses.length === 0 ? (
                <p className="px-5 py-8 text-xs text-muted text-center">No response data available.</p>
              ) : (
                <table className="w-full min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background/30">
                      <th className="px-5 py-3 text-left font-medium text-muted">Query</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">Engine</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">Mentioned</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">Position</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">Sentiment</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">Top Firm (if not you)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((row) => {
                      const mine = (row.firms_mentioned ?? []).find(
                        (m: any) => m.canonical_name?.toLowerCase() === firmName.toLowerCase()
                      );
                      const mentioned = !!mine;
                      const topFirm = !mentioned ? row.firms_mentioned?.[0]?.canonical_name ?? "—" : null;
                      return (
                        <tr key={row.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 text-secondary max-w-[220px] truncate">
                            {(row.prompts as any)?.text ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                              {ENGINE_ICON[row.platform] ?? row.platform?.[0]?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {mentioned ? (
                              <span className="text-success font-medium">✓ Yes</span>
                            ) : (
                              <span className="text-muted">✗ No</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {mine?.position ? (
                              <span className={`font-medium ${mine.position === 1 ? "text-accent" : "text-foreground"}`}>
                                #{mine.position}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {mine?.sentiment ? (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                mine.sentiment === "positive" ? "bg-success/10 text-success" :
                                mine.sentiment === "negative" ? "bg-error/10 text-error" :
                                "bg-border text-muted"
                              }`}>
                                {mine.sentiment}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted">{topFirm ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Platform scores */}
            {score && (
              <div className="rounded-lg border border-border bg-card p-5 max-w-sm">
                <h2 className="mb-4 text-sm font-medium text-foreground">Platform Scores</h2>
                <div className="space-y-3">
                  {[
                    { label: "ChatGPT",    value: score.chatgpt_score },
                    { label: "Perplexity", value: score.perplexity_score },
                    { label: "Gemini",     value: score.gemini_score },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-muted">{label}</span>
                      <span className="text-xs font-medium text-foreground">{value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
