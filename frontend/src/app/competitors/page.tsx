"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

const FIRM = "Mullen & Mullen Law Firm";

const COMPETITORS = [
  {
    name: "Your Firm",
    canonical: "Mullen & Mullen Law Firm",
    score: 34,
    mentions: 8,
    mentionRate: 0.19,
    chatgpt: 28,
    perplexity: 42,
    gemini: 31,
    you: true,
    trend: "+4",
    up: true,
  },
  {
    name: "Thompson Law",
    canonical: "Thompson Law",
    score: 72,
    mentions: 22,
    mentionRate: 0.52,
    chatgpt: 68,
    perplexity: 80,
    gemini: 65,
    you: false,
    trend: "+2",
    up: true,
  },
  {
    name: "Angel Reyes & Associates",
    canonical: "Angel Reyes & Associates",
    score: 61,
    mentions: 18,
    mentionRate: 0.43,
    chatgpt: 55,
    perplexity: 70,
    gemini: 58,
    you: false,
    trend: "-1",
    up: false,
  },
  {
    name: "The Callahan Law Firm",
    canonical: "The Callahan Law Firm",
    score: 48,
    mentions: 14,
    mentionRate: 0.33,
    chatgpt: 40,
    perplexity: 55,
    gemini: 48,
    you: false,
    trend: "+6",
    up: true,
  },
  {
    name: "Grossman Law Offices",
    canonical: "Grossman Law Offices",
    score: 31,
    mentions: 7,
    mentionRate: 0.17,
    chatgpt: 25,
    perplexity: 38,
    gemini: 29,
    you: false,
    trend: "—",
    up: null,
  },
];

const QUERY_OVERLAP = [
  { query: "best car accident lawyer Dallas",            thompson: true,  reyes: false, callahan: false, you: false },
  { query: "personal injury attorney Dallas TX",         thompson: true,  reyes: true,  callahan: true,  you: true  },
  { query: "wrongful death lawyer Dallas",               thompson: false, reyes: true,  callahan: true,  you: false },
  { query: "slip and fall attorney Dallas",              thompson: true,  reyes: false, callahan: false, you: true  },
  { query: "top rated PI firm in Dallas",                thompson: true,  reyes: true,  callahan: false, you: false },
  { query: "best personal injury lawyer near me Dallas", thompson: false, reyes: true,  callahan: true,  you: true  },
  { query: "car accident attorney fee Dallas",           thompson: true,  reyes: false, callahan: false, you: false },
  { query: "truck accident lawyer Dallas TX",            thompson: true,  reyes: true,  callahan: true,  you: true  },
];

const PLATFORM_CHART_DATA = COMPETITORS.map((c) => ({
  name: c.you ? "You" : c.name.split(" ")[0],
  ChatGPT: c.chatgpt,
  Perplexity: c.perplexity,
  Gemini: c.gemini,
  you: c.you,
}));

const RADAR_DATA = [
  { subject: "ChatGPT",     you: 28, leader: 68 },
  { subject: "Perplexity",  you: 42, leader: 80 },
  { subject: "Gemini",      you: 31, leader: 65 },
  { subject: "Mention %",   you: 19, leader: 52 },
  { subject: "#1 Position", you: 30, leader: 70 },
  { subject: "Sentiment",   you: 60, leader: 85 },
];

export default function CompetitorsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedComp = COMPETITORS.find((c) => c.canonical === selected && !c.you) ?? null;
  const sorted = [...COMPETITORS].sort((a, b) => b.score - a.score);

  return (
    <DashboardLayout firmName={FIRM}>
      <div className="px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">Competitor Tracking</h1>
          <p className="mt-1 text-sm text-muted">How your AI visibility stacks up against competitors in your market.</p>
        </div>

        {/* Competitor table */}
        <div className="mb-8 rounded-lg border border-border bg-bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-medium text-foreground">Visibility Rankings — Dallas PI</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Rank</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Firm</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Score</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Mentions</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">ChatGPT</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Perplexity</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Gemini</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((comp, i) => (
                <tr
                  key={comp.canonical}
                  onClick={() => !comp.you && setSelected(selected === comp.canonical ? null : comp.canonical)}
                  className={`border-b border-border last:border-0 transition-colors ${
                    comp.you
                      ? "bg-accent/[0.03]"
                      : "hover:bg-white/[0.02] cursor-pointer"
                  } ${selected === comp.canonical ? "bg-white/[0.03]" : ""}`}
                >
                  <td className="px-5 py-3.5 text-muted font-mono text-xs">{i + 1}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {comp.you && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">You</span>
                      )}
                      <span className={`text-sm font-medium ${comp.you ? "text-foreground" : "text-secondary"}`}>
                        {comp.you ? "Your Firm" : comp.name}
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
                  <td className="px-5 py-3.5 text-secondary text-xs">{comp.mentions}/42</td>
                  <td className="px-5 py-3.5 text-xs font-medium text-foreground">{comp.chatgpt}</td>
                  <td className="px-5 py-3.5 text-xs font-medium text-foreground">{comp.perplexity}</td>
                  <td className="px-5 py-3.5 text-xs font-medium text-foreground">{comp.gemini}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${
                      comp.up === true ? "text-success" : comp.up === false ? "text-error" : "text-muted"
                    }`}>
                      {comp.up === true && "↑ "}{comp.up === false && "↓ "}{comp.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">

          {/* Left: charts (3/5) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Platform breakdown chart */}
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h2 className="mb-4 text-sm font-medium text-foreground">Score by Platform</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={PLATFORM_CHART_DATA} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#14171F", border: "1px solid #1E2230", borderRadius: 6, fontSize: 11 }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="ChatGPT" name="ChatGPT" radius={[2, 2, 0, 0]}>
                    {PLATFORM_CHART_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.you ? "#C9A84C" : "#2A2D36"} />
                    ))}
                  </Bar>
                  <Bar dataKey="Perplexity" name="Perplexity" radius={[2, 2, 0, 0]}>
                    {PLATFORM_CHART_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.you ? "#A88A3A" : "#323540"} />
                    ))}
                  </Bar>
                  <Bar dataKey="Gemini" name="Gemini" radius={[2, 2, 0, 0]}>
                    {PLATFORM_CHART_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.you ? "#8A7030" : "#3A3D48"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Query overlap heatmap */}
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-medium text-foreground">Query Overlap</h2>
                <p className="mt-0.5 text-xs text-muted">Which firms appear for the same queries — gold = you</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background/30">
                      <th className="px-5 py-3 text-left font-medium text-muted">Query</th>
                      <th className="px-3 py-3 text-center font-medium text-accent text-[10px]">You</th>
                      <th className="px-3 py-3 text-center font-medium text-muted text-[10px]">Thompson</th>
                      <th className="px-3 py-3 text-center font-medium text-muted text-[10px]">Angel R.</th>
                      <th className="px-3 py-3 text-center font-medium text-muted text-[10px]">Callahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUERY_OVERLAP.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-5 py-2.5 text-secondary max-w-[200px] truncate">{row.query}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px] ${
                            row.you ? "bg-accent/20 text-accent" : "bg-border"
                          }`}>
                            {row.you ? "✓" : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block h-4 w-4 rounded-sm ${row.thompson ? "bg-white/10" : "bg-border"}`} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block h-4 w-4 rounded-sm ${row.reyes ? "bg-white/10" : "bg-border"}`} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block h-4 w-4 rounded-sm ${row.callahan ? "bg-white/10" : "bg-border"}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: radar + detail (2/5) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Radar */}
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h2 className="mb-1 text-sm font-medium text-foreground">You vs. Thompson Law</h2>
              <p className="mb-4 text-[11px] text-muted">Signal-by-signal vs. market leader</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#1E2230" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <Radar name="You" dataKey="you" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.15} strokeWidth={1.5} />
                  <Radar name="Leader" dataKey="leader" stroke="#3A3D48" fill="#3A3D48" fillOpacity={0.25} strokeWidth={1} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full inline-block bg-accent" />
                  <span className="text-muted">You</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full inline-block bg-border" />
                  <span className="text-muted">Thompson Law</span>
                </div>
              </div>
            </div>

            {/* Competitor detail */}
            {selectedComp ? (
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-foreground">{selectedComp.name}</h2>
                  <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Overall Score",  value: `${selectedComp.score}/100` },
                    { label: "Total Mentions", value: `${selectedComp.mentions}/42 queries` },
                    { label: "Mention Rate",   value: `${Math.round(selectedComp.mentionRate * 100)}%` },
                    { label: "ChatGPT",        value: selectedComp.chatgpt },
                    { label: "Perplexity",     value: selectedComp.perplexity },
                    { label: "Gemini",         value: selectedComp.gemini },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-muted">{label}</span>
                      <span className="text-xs font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md bg-bg-input p-3">
                  <p className="text-[11px] text-muted leading-relaxed">
                    Gap to close: <span className="text-foreground font-medium">{selectedComp.score - 34} points</span>.
                    They lead most on Perplexity ({selectedComp.perplexity} vs 42). Focus citation placement there first.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-card p-5 flex items-center justify-center">
                <p className="text-xs text-muted py-4">Click a competitor row to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
