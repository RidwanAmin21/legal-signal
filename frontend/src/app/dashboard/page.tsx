"use client";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useClientId } from "@/hooks/useClientId";
import { useScores } from "@/hooks/useScores";
import { useCompetitors } from "@/hooks/useCompetitors";
import { createClient } from "@/lib/supabase-browser";

const ENGINE_ICON: Record<string, string> = {
  perplexity: "P", chatgpt: "G", gemini: "Ge",
};

export default function DashboardPage() {
  const { clientId, loading: clientLoading } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: async () => {
      const res = await fetch("/api/client");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const { data: scores } = useScores(clientId);
  const { data: competitors } = useCompetitors(clientId);

  const { data: audits } = useQuery({
    queryKey: ["audits", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/audits?client_id=${encodeURIComponent(clientId)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const latestRunId = audits?.[0]?.id;

  const { data: recentResponses } = useQuery({
    queryKey: ["responses", latestRunId],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("monitoring_responses")
        .select("id, platform, firms_mentioned, prompts(text)")
        .eq("run_id", latestRunId)
        .limit(8);
      return data ?? [];
    },
    enabled: !!latestRunId,
  });

  const firmName = client?.firm_name ?? "Your Firm";
  const latestScore = scores?.[0];
  const prevScore = scores?.[1];
  const latestRun = audits?.[0];

  const scoreDelta = latestScore && prevScore
    ? latestScore.overall_score - prevScore.overall_score
    : null;

  // Build competitor bar chart data — include "Your Firm" as first bar
  const competitorChartData = [
    { name: "Your Firm", score: latestScore?.overall_score ?? 0, you: true },
    ...(competitors ?? []).slice(0, 4).map((c) => ({
      name: c.canonical_name.split(" ")[0],
      score: c.score,
      you: false,
    })),
  ];

  // Metrics derived from real data
  const topCompetitor = competitors?.[0];
  const competitorGap = topCompetitor && latestScore
    ? topCompetitor.score - latestScore.overall_score
    : null;

  // Number of queries where YOUR firm was mentioned = mention_rate × prompts_sent
  const mentionedQueries = latestScore && latestRun?.prompts_sent
    ? Math.round((latestScore.mention_rate ?? 0) * latestRun.prompts_sent)
    : null;

  const loading = clientLoading;
  const hasAuditData = !!latestScore;
  const auditsLoaded = audits !== undefined;

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-8 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">{firmName}</h1>
            <p className="mt-1 text-sm text-muted">
              {client?.market_key?.replace("_", ", ") ?? "—"} · {client?.practice_areas?.[0] ?? "—"}
              {latestRun?.week_date ? ` · Last audit: ${new Date(latestRun.week_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
            </p>
          </div>
          <a href="/audits" className="rounded border border-border px-4 py-2 text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors">
            View Audits
          </a>
        </div>

        {/* ── Score hero ── */}
        <div className="mb-6 rounded-lg border border-border bg-bg-card p-8">
          {loading || !auditsLoaded ? (
            <div className="h-24 animate-pulse rounded bg-border" />
          ) : !hasAuditData ? (
            <div className="py-8 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">AI Visibility Score</p>
              <p className="mt-4 font-display text-5xl font-semibold text-muted">—</p>
              <p className="mt-4 text-sm text-secondary">
                No audit data yet. Run the pipeline to generate your first visibility score.
              </p>
              <p className="mt-2 text-xs text-muted">
                <code className="rounded bg-border px-2 py-1">make pipeline-client client=your_client</code>
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted">AI Visibility Score</p>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="font-display text-7xl font-semibold leading-none text-foreground">
                      {latestScore.overall_score}
                    </span>
                    <span className="mb-2 text-xl text-muted">/100</span>
                  </div>
                  <p className="mt-3 text-sm text-secondary">
                    Your firm appears in{" "}
                    <span className="text-foreground font-medium">
                      {mentionedQueries ?? "—"} of {latestRun?.prompts_sent ?? "—"}
                    </span>{" "}
                    tested AI queries across your practice areas.
                  </p>
                </div>
                {scoreDelta !== null && (
                  <div className="text-right">
                    <p className="text-xs text-muted">vs. last week</p>
                    <p className={`mt-1 font-display text-3xl font-semibold ${scoreDelta >= 0 ? "text-success" : "text-error"}`}>
                      {scoreDelta >= 0 ? "+" : ""}{scoreDelta}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${latestScore.overall_score}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>0</span><span>Invisible</span><span>Fair</span><span>Good</span><span>100</span>
              </div>
            </>
          )}
        </div>

        {/* ── Metric cards ── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "AI Mentions",
              value: mentionedQueries ?? "—",
              change: latestRun ? "queries mentioning you" : "",
              up: null,
            },
            {
              label: "Queries Tracked",
              value: latestRun?.prompts_sent ?? "—",
              change: "across AI engines",
              up: null,
            },
            {
              label: "Mention Rate",
              value: latestScore ? `${Math.round((latestScore.mention_rate ?? 0) * 100)}%` : "—",
              change: "of all queries",
              up: null,
            },
            {
              label: "Competitor Gap",
              value: competitorGap !== null ? (competitorGap > 0 ? `+${competitorGap}` : String(competitorGap)) : "—",
              change: topCompetitor?.canonical_name?.split(" ")[0] ?? "",
              up: competitorGap !== null ? competitorGap <= 0 : null,
            },
          ].map(({ label, value, change, up }) => (
            <div key={label} className="rounded-lg border border-border bg-bg-card p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</p>
              <p className={`mt-1 text-xs font-medium ${
                up === true ? "text-success" : up === false ? "text-error" : "text-secondary"
              }`}>
                {change}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">

          {/* ── Recent audit queries (3/5 cols) ── */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-sm font-medium text-foreground">Recent Audit Queries</h2>
                <a href="/audits" className="text-xs text-accent hover:text-accent-muted transition-colors">View all →</a>
              </div>
              {!recentResponses ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded bg-border" />
                  ))}
                </div>
              ) : recentResponses.length === 0 ? (
                <p className="px-5 py-8 text-xs text-muted text-center">No audit data yet. Run the pipeline to see results.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background/30">
                      <th className="px-5 py-3 text-left font-medium text-muted">Query</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">Engine</th>
                      <th className="px-3 py-3 text-left font-medium text-muted">You</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResponses.map((row: any) => {
                      const mentioned = (row.firms_mentioned ?? []).some(
                        (m: any) => m.canonical_name?.toLowerCase() === firmName.toLowerCase()
                      );
                      const topFirm = !mentioned
                        ? (row.firms_mentioned?.[0]?.canonical_name ?? null)
                        : null;
                      return (
                        <tr key={row.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 text-secondary max-w-[200px] truncate">
                            {(row.prompts as any)?.text ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                              {ENGINE_ICON[row.platform] ?? row.platform[0]?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {mentioned ? (
                              <span className="text-success">✓</span>
                            ) : (
                              <span className="text-muted text-xs truncate">{topFirm ?? "✗"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Right column (2/5 cols) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Competitor snapshot */}
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h2 className="mb-4 text-sm font-medium text-foreground">Competitor Visibility</h2>
              {!auditsLoaded ? (
                <div className="h-32 animate-pulse rounded bg-border" />
              ) : !competitors || competitors.length === 0 ? (
                <p className="py-6 text-xs text-muted text-center">No competitor data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={competitorChartData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#14171F", border: "1px solid #1E2230", borderRadius: 6, fontSize: 11 }}
                      formatter={(v) => [v, "Score"]}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                      {competitorChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.you ? "#C9A84C" : "#2A2D36"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <a href="/competitors" className="mt-3 block text-xs text-accent hover:text-accent-muted transition-colors">
                Full competitor analysis →
              </a>
            </div>

            {/* Platform scores */}
            {latestScore && (
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <h2 className="mb-4 text-sm font-medium text-foreground">Score by Platform</h2>
                <div className="space-y-3">
                  {[
                    { label: "ChatGPT", value: latestScore.chatgpt_score },
                    { label: "Perplexity", value: latestScore.perplexity_score },
                    { label: "Gemini", value: latestScore.gemini_score },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-secondary">{label}</span>
                        <span className="font-medium text-foreground">{value ?? "—"}</span>
                      </div>
                      {value !== null && value !== undefined && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-accent/60" style={{ width: `${value}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
