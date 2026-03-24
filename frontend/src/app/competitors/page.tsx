"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { useClientId } from "@/hooks/useClientId";
import { useCompetitors } from "@/hooks/useCompetitors";
import { useScores } from "@/hooks/useScores";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

export default function CompetitorsPage() {
  const [selected, setSelected] = useState<string | null>(null);
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

  const { data: competitors, isLoading: compLoading } = useCompetitors(clientId);
  const { data: scores } = useScores(clientId);

  const firmName = client?.firm_name ?? "Your Firm";
  const latestScore = scores?.[0];

  // Build sorted list including "Your Firm" at the correct position
  const allFirms = [
    ...(latestScore ? [{ canonical_name: firmName, score: latestScore.overall_score, you: true }] : []),
    ...(competitors ?? []).map((c) => ({ ...c, you: false })),
  ].sort((a, b) => b.score - a.score);

  const selectedComp = allFirms.find((c) => c.canonical_name === selected && !c.you) ?? null;

  // Radar: Your firm vs market leader
  const leader = allFirms.find((c) => !c.you);
  const radarData = latestScore && leader ? [
    { subject: "ChatGPT",     you: latestScore.chatgpt_score ?? 0,     leader: 0 },
    { subject: "Perplexity",  you: latestScore.perplexity_score ?? 0,  leader: 0 },
    { subject: "Gemini",      you: latestScore.gemini_score ?? 0,      leader: 0 },
    { subject: "Mention %",   you: Math.round((latestScore.mention_rate ?? 0) * 100), leader: 0 },
    { subject: "#1 Position", you: Math.round((latestScore.first_position_rate ?? 0) * 100), leader: 0 },
    { subject: "Sentiment",   you: Math.round((latestScore.positive_sentiment_rate ?? 0) * 100), leader: leader.score },
  ] : [];

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">Competitor Tracking</h1>
          <p className="mt-1 text-sm text-muted">How your AI visibility stacks up against competitors in your market.</p>
        </div>

        {/* Competitor table */}
        <div className="mb-8 rounded-lg border border-border bg-bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-medium text-foreground">
              Visibility Rankings — {client?.market_key?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Your Market"}
            </h2>
          </div>
          {compLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-border" />
              ))}
            </div>
          ) : allFirms.length === 0 ? (
            <p className="px-5 py-8 text-xs text-muted text-center">No competitor data yet. Run the pipeline to see rankings.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Rank</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Firm</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">Score</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted">vs. You</th>
                </tr>
              </thead>
              <tbody>
                {allFirms.map((comp, i) => {
                  const gap = latestScore ? comp.score - latestScore.overall_score : null;
                  return (
                    <tr
                      key={comp.canonical_name}
                      onClick={() => !comp.you && setSelected(selected === comp.canonical_name ? null : comp.canonical_name)}
                      className={`border-b border-border last:border-0 transition-colors ${
                        comp.you
                          ? "bg-accent/[0.03]"
                          : "hover:bg-white/[0.02] cursor-pointer"
                      } ${selected === comp.canonical_name ? "bg-white/[0.03]" : ""}`}
                    >
                      <td className="px-5 py-3.5 text-muted font-mono text-xs">{i + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {comp.you && (
                            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">You</span>
                          )}
                          <span className={`text-sm font-medium ${comp.you ? "text-foreground" : "text-secondary"}`}>
                            {comp.you ? "Your Firm" : comp.canonical_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-display text-lg font-semibold ${comp.you ? "text-accent" : "text-foreground"}`}>
                            {comp.score}
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${comp.score}%`, background: comp.you ? "#C9A84C" : "#2A2D36" }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {comp.you ? (
                          <span className="text-xs text-muted">—</span>
                        ) : gap !== null ? (
                          <span className={`text-xs font-medium ${gap > 0 ? "text-error" : "text-success"}`}>
                            {gap > 0 ? `+${gap} ahead` : `${Math.abs(gap)} behind`}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left: radar chart (3/5) */}
          <div className="lg:col-span-3">
            {latestScore && radarData.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <h2 className="mb-1 text-sm font-medium text-foreground">Your Signal Breakdown</h2>
                <p className="mb-4 text-[11px] text-muted">Your scores across each visibility signal</p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#1E2230" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <Radar name="You" dataKey="you" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.2} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right: competitor detail (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedComp ? (
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-foreground">{selectedComp.canonical_name}</h2>
                  <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Overall Score", value: `${selectedComp.score}/100` },
                    { label: "Gap to close", value: latestScore ? `${Math.abs(selectedComp.score - latestScore.overall_score)} points` : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-muted">{label}</span>
                      <span className="text-xs font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-card p-5 flex items-center justify-center">
                <p className="text-xs text-muted py-4">Click a competitor row to see details</p>
              </div>
            )}

            {latestScore && (
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <h2 className="mb-4 text-sm font-medium text-foreground">Your Platform Scores</h2>
                <div className="space-y-3">
                  {[
                    { label: "ChatGPT", value: latestScore.chatgpt_score },
                    { label: "Perplexity", value: latestScore.perplexity_score },
                    { label: "Gemini", value: latestScore.gemini_score },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-muted">{label}</span>
                      <span className="text-xs font-medium text-foreground">{value ?? "—"}</span>
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
