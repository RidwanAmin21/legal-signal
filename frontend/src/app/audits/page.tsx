"use client";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

const FIRM = "Mullen & Mullen Law Firm";

const AUDITS = [
  { id: "mar-15-2026", date: "Mar 15, 2026", score: 34, prev: 30, queries: 42, mentions: 8, engines: ["Perplexity", "ChatGPT", "Gemini"], status: "completed" },
  { id: "mar-08-2026", date: "Mar 8, 2026",  score: 30, prev: 27, queries: 42, mentions: 7, engines: ["Perplexity", "ChatGPT", "Gemini"], status: "completed" },
  { id: "mar-01-2026", date: "Mar 1, 2026",  score: 27, prev: 22, queries: 42, mentions: 6, engines: ["Perplexity", "ChatGPT", "Gemini"], status: "completed" },
  { id: "feb-22-2026", date: "Feb 22, 2026", score: 22, prev: 20, queries: 38, mentions: 5, engines: ["Perplexity", "ChatGPT", "Gemini"], status: "completed" },
  { id: "feb-15-2026", date: "Feb 15, 2026", score: 20, prev: 18, queries: 38, mentions: 4, engines: ["Perplexity", "ChatGPT"],           status: "completed" },
  { id: "feb-08-2026", date: "Feb 8, 2026",  score: 18, prev: 18, queries: 35, mentions: 4, engines: ["Perplexity", "ChatGPT"],           status: "completed" },
];

const ENGINE_ABBR: Record<string, string> = { Perplexity: "P", ChatGPT: "G", Gemini: "Ge" };

function ScoreDelta({ score, prev }: { score: number; prev: number }) {
  const delta = score - prev;
  if (delta === 0) return <span className="text-muted text-xs">—</span>;
  return (
    <span className={`text-xs font-medium ${delta > 0 ? "text-success" : "text-error"}`}>
      {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}
    </span>
  );
}

export default function AuditsPage() {
  return (
    <DashboardLayout firmName={FIRM}>
      <div className="px-8 py-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Audit History</h1>
            <p className="mt-1 text-sm text-muted">Weekly AI visibility audits across ChatGPT, Perplexity, and Gemini.</p>
          </div>
          <button className="rounded border border-border px-4 py-2 text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors">
            Run New Audit
          </button>
        </div>

        {/* Score trend summary */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: "Current Score",    value: "34/100", sub: "as of Mar 15" },
            { label: "4-Week Trend",     value: "+12",    sub: "point increase", color: "text-success" },
            { label: "Total Audits Run", value: "6",      sub: "since Jan 2026" },
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Score</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Change</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Queries</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Mentions</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Engines</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {AUDITS.map((audit) => (
                <tr key={audit.id} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground text-sm">{audit.date}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold text-foreground">{audit.score}</span>
                      <span className="text-xs text-muted">/100</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <ScoreDelta score={audit.score} prev={audit.prev} />
                  </td>
                  <td className="px-5 py-3.5 text-secondary">{audit.queries}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-foreground font-medium">{audit.mentions}</span>
                    <span className="text-muted text-xs ml-1">/{audit.queries}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      {audit.engines.map((e) => (
                        <span key={e} className="inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                          {ENGINE_ABBR[e]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
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
        </div>
      </div>
    </DashboardLayout>
  );
}
