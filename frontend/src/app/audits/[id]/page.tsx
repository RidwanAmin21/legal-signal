"use client";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

const FIRM = "Mullen & Mullen Law Firm";

const AUDIT = {
  id: "mar-15-2026",
  date: "Mar 15, 2026",
  score: 34,
  prev: 30,
  queries: 42,
  mentions: 8,
  mentionRate: "19%",
};

const SUMMARY_CARDS = [
  { label: "Queries Tested",    value: "42",  sub: "across 3 AI engines" },
  { label: "Times Mentioned",   value: "8",   sub: "unique queries", color: "text-accent" },
  { label: "Mention Rate",      value: "19%", sub: "of all queries" },
  { label: "First-Position",    value: "3",   sub: "times ranked #1", color: "text-success" },
];

const QUERY_RESULTS = [
  { query: "best car accident lawyer Dallas",            engine: "Perplexity", mentioned: false, topFirm: "Thompson Law",            position: null, sentiment: null },
  { query: "personal injury attorney Dallas TX",         engine: "ChatGPT",    mentioned: true,  topFirm: null,                      position: 1,    sentiment: "positive" },
  { query: "wrongful death lawyer Dallas",               engine: "Gemini",     mentioned: false, topFirm: "The Callahan Law Firm",   position: null, sentiment: null },
  { query: "slip and fall attorney Dallas",              engine: "Perplexity", mentioned: true,  topFirm: null,                      position: 2,    sentiment: "positive" },
  { query: "top rated PI firm in Dallas",                engine: "ChatGPT",    mentioned: false, topFirm: "Angel Reyes & Assoc.",   position: null, sentiment: null },
  { query: "best personal injury lawyer near me Dallas", engine: "Gemini",     mentioned: true,  topFirm: null,                      position: 1,    sentiment: "positive" },
  { query: "car accident attorney fee Dallas",           engine: "Perplexity", mentioned: false, topFirm: "Thompson Law",            position: null, sentiment: null },
  { query: "truck accident lawyer Dallas TX",            engine: "ChatGPT",    mentioned: true,  topFirm: null,                      position: 3,    sentiment: "neutral" },
  { query: "motorcycle accident attorney Dallas",        engine: "Gemini",     mentioned: false, topFirm: "The Callahan Law Firm",   position: null, sentiment: null },
  { query: "uber lyft accident lawyer Dallas",           engine: "Perplexity", mentioned: true,  topFirm: null,                      position: 2,    sentiment: "positive" },
  { query: "construction accident attorney Dallas TX",   engine: "ChatGPT",    mentioned: false, topFirm: "Thompson Law",            position: null, sentiment: null },
  { query: "dog bite lawyer Dallas",                     engine: "Gemini",     mentioned: true,  topFirm: null,                      position: 1,    sentiment: "positive" },
];

const SOURCE_URLS = [
  { url: "avvo.com/personal-injury-attorney/dallas",         engine: "Perplexity", citations: 12, your_content: true  },
  { url: "justia.com/lawyers/texas/dallas/personal-injury",  engine: "Perplexity", citations: 9,  your_content: false },
  { url: "lawyers.com/personal-injury/texas/dallas",         engine: "ChatGPT",    citations: 7,  your_content: true  },
  { url: "yelp.com/search/car-accident-lawyer-dallas",       engine: "ChatGPT",    citations: 5,  your_content: false },
  { url: "thumbtack.com/k/personal-injury-lawyer/dallas",    engine: "Gemini",     citations: 4,  your_content: false },
  { url: "superlawyers.com/texas/personal-injury",           engine: "Gemini",     citations: 3,  your_content: false },
];

const RECOMMENDATIONS = [
  {
    priority: "high",
    title: "Claim your Justia profile",
    body: "Justia was cited 9 times by Perplexity but your firm has no presence there. Claiming your profile could recover 3–5 mention opportunities per audit.",
  },
  {
    priority: "high",
    title: "Publish content targeting 'best car accident lawyer Dallas'",
    body: "This query appeared 4× across engines but you were never mentioned. Thompson Law dominates it. A targeted FAQ article on Avvo could change that within 30 days.",
  },
  {
    priority: "medium",
    title: "Improve your Yelp listing",
    body: "ChatGPT cites Yelp in 5 responses but your listing has outdated practice areas. Update your bio and add recent reviews to improve citation frequency.",
  },
  {
    priority: "low",
    title: "Add truck accident case studies to your website",
    body: "You appeared 3rd in truck accident queries. Detailed case outcomes on your site give AI engines more to cite and could move you to 1st.",
  },
];

const ENGINE_ICON: Record<string, string> = { Perplexity: "P", ChatGPT: "G", Gemini: "Ge" };

const PRIORITY_STYLES: Record<string, string> = {
  high:   "bg-error/10 text-error",
  medium: "bg-warning/10 text-warning",
  low:    "bg-border text-muted",
};

export default function AuditDetailPage() {
  const delta = AUDIT.score - AUDIT.prev;

  return (
    <DashboardLayout firmName={FIRM}>
      <div className="px-8 py-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/audits" className="hover:text-foreground transition-colors">Audits</Link>
          <span>/</span>
          <span className="text-secondary">{AUDIT.date}</span>
        </nav>

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Audit — {AUDIT.date}</h1>
            <p className="mt-1 text-sm text-muted">Dallas, TX · Personal Injury · {AUDIT.queries} queries across 3 AI engines</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded border border-border px-4 py-2 text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors">
              Download PDF
            </button>
            <div className="text-right">
              <p className="text-xs text-muted">Score</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-semibold text-foreground">{AUDIT.score}</span>
                <span className="text-sm text-muted">/100</span>
                <span className={`text-sm font-medium ${delta >= 0 ? "text-success" : "text-error"}`}>
                  {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1 — Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {SUMMARY_CARDS.map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-lg border border-border bg-bg-card p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className={`mt-2 font-display text-3xl font-semibold ${color ?? "text-foreground"}`}>{value}</p>
              <p className="mt-1 text-xs text-muted">{sub}</p>
            </div>
          ))}
        </div>

        {/* Section 2 — Query-by-query breakdown */}
        <div className="mb-8 rounded-lg border border-border bg-bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-medium text-foreground">Query Breakdown</h2>
            <p className="mt-0.5 text-xs text-muted">Each query tested across every AI engine</p>
          </div>
          <table className="w-full text-xs">
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
              {QUERY_RESULTS.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-secondary max-w-[220px] truncate">{row.query}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                      {ENGINE_ICON[row.engine]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {row.mentioned ? (
                      <span className="text-success font-medium">✓ Yes</span>
                    ) : (
                      <span className="text-muted">✗ No</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {row.position ? (
                      <span className={`font-medium ${row.position === 1 ? "text-accent" : "text-foreground"}`}>
                        #{row.position}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {row.sentiment ? (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        row.sentiment === "positive" ? "bg-success/10 text-success" :
                        row.sentiment === "negative" ? "bg-error/10 text-error" :
                        "bg-border text-muted"
                      }`}>
                        {row.sentiment}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">{row.topFirm ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">

          {/* Section 3 — Source URL map (3/5) */}
          <div className="lg:col-span-3 rounded-lg border border-border bg-bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-medium text-foreground">Citation Sources</h2>
              <p className="mt-0.5 text-xs text-muted">URLs AI engines cited when answering legal queries in your market</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  <th className="px-5 py-3 text-left font-medium text-muted">Source</th>
                  <th className="px-3 py-3 text-left font-medium text-muted">Engine</th>
                  <th className="px-3 py-3 text-left font-medium text-muted">Citations</th>
                  <th className="px-3 py-3 text-left font-medium text-muted">Your Content</th>
                </tr>
              </thead>
              <tbody>
                {SOURCE_URLS.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-secondary font-mono text-[11px] max-w-[200px] truncate">
                      {row.url}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                        {ENGINE_ICON[row.engine]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-foreground font-medium">{row.citations}</td>
                    <td className="px-3 py-3">
                      {row.your_content ? (
                        <span className="text-success text-xs font-medium">✓ Yes</span>
                      ) : (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 text-warning">
                          Gap
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4 — Recommendations (2/5) */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-medium text-foreground">Recommendations</h2>
              <p className="mt-0.5 text-xs text-muted">Actions to improve your next audit</p>
            </div>
            <div className="divide-y divide-border">
              {RECOMMENDATIONS.map((rec, i) => (
                <div key={i} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[rec.priority]}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug">{rec.title}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{rec.body}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
