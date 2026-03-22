"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const FIRM = "Mullen & Mullen Law Firm";

const METRICS = [
  { label: "AI Mentions", value: "8", change: "+33%", up: true, sub: "this month" },
  { label: "Queries Tracked", value: "42", change: "across 3 engines", up: null, sub: "" },
  { label: "Content Live", value: "3", change: "+2", up: true, sub: "pieces published" },
  { label: "Competitor Gap", value: "+12", change: "Thompson Law", up: false, sub: "ahead of you" },
];

const RECENT_QUERIES = [
  { query: "best car accident lawyer Dallas",            engine: "Perplexity", mentioned: false, topFirm: "Thompson Law",            date: "Mar 15" },
  { query: "personal injury attorney Dallas TX",         engine: "ChatGPT",    mentioned: true,  topFirm: "—",                      date: "Mar 15" },
  { query: "wrongful death lawyer Dallas",               engine: "Gemini",     mentioned: false, topFirm: "The Callahan Law Firm",   date: "Mar 15" },
  { query: "slip and fall attorney Dallas",              engine: "Perplexity", mentioned: true,  topFirm: "—",                      date: "Mar 15" },
  { query: "top rated PI firm in Dallas",                engine: "ChatGPT",    mentioned: false, topFirm: "Angel Reyes & Assoc.",   date: "Mar 15" },
  { query: "best personal injury lawyer near me Dallas", engine: "Gemini",     mentioned: true,  topFirm: "—",                      date: "Mar 15" },
  { query: "car accident attorney fee Dallas",           engine: "Perplexity", mentioned: false, topFirm: "Thompson Law",            date: "Mar 15" },
  { query: "truck accident lawyer Dallas TX",            engine: "ChatGPT",    mentioned: true,  topFirm: "—",                      date: "Mar 15" },
];

const CONTENT_QUEUE = [
  { title: "Top 5 Questions About Car Accident Claims in Dallas", area: "Personal Injury", platform: "Avvo",   status: "Pending Review" },
  { title: "Understanding Negligence in Texas PI Cases",           area: "Personal Injury", platform: "Justia", status: "Draft"          },
  { title: "Dallas Wrongful Death Attorney FAQ",                   area: "Personal Injury", platform: "Blog",   status: "In Review"      },
];

const COMPETITOR_DATA = [
  { name: "Your Firm",           mentions: 8,  you: true  },
  { name: "Thompson Law",        mentions: 20, you: false },
  { name: "Angel Reyes",         mentions: 15, you: false },
  { name: "Callahan Law Firm",   mentions: 11, you: false },
];

const ENGINE_ICON: Record<string, string> = {
  Perplexity: "P", ChatGPT: "G", Gemini: "Ge",
};

const STATUS_COLORS: Record<string, string> = {
  "Pending Review": "text-warning bg-warning/10",
  "Draft":          "text-muted bg-white/5",
  "In Review":      "text-blue-400 bg-blue-400/10",
  "Approved":       "text-success bg-success/10",
  "Published":      "text-accent bg-accent/10",
};

export default function DashboardPage() {
  return (
    <DashboardLayout firmName={FIRM}>
      <div className="px-8 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">{FIRM}</h1>
            <p className="mt-1 text-sm text-muted">Dallas, TX · Personal Injury · Last audit: Mar 15, 2026</p>
          </div>
          <button className="rounded border border-border px-4 py-2 text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors">
            Run New Audit
          </button>
        </div>

        {/* ── Score hero ── */}
        <div className="mb-6 rounded-lg border border-border bg-bg-card p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">AI Visibility Score</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="font-display text-7xl font-semibold leading-none text-foreground">34</span>
                <span className="mb-2 text-xl text-muted">/100</span>
              </div>
              <p className="mt-3 text-sm text-secondary">
                Your firm appears in <span className="text-foreground font-medium">8 of 42</span> tested AI queries across your practice areas.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">vs. last week</p>
              <p className="mt-1 font-display text-3xl font-semibold text-success">+4</p>
            </div>
          </div>
          {/* Score bar */}
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: "34%" }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>0</span><span>Invisible</span><span>Fair</span><span>Good</span><span>100</span>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map(({ label, value, change, up, sub }) => (
            <div key={label} className="rounded-lg border border-border bg-bg-card p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</p>
              <p className={`mt-1 text-xs font-medium ${
                up === true ? "text-success" : up === false ? "text-error" : "text-secondary"
              }`}>
                {up === true && "↑ "}{up === false && "↓ "}{change}
                {sub && <span className="text-muted font-normal"> {sub}</span>}
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/30">
                    <th className="px-5 py-3 text-left font-medium text-muted">Query</th>
                    <th className="px-3 py-3 text-left font-medium text-muted">Engine</th>
                    <th className="px-3 py-3 text-left font-medium text-muted">You</th>
                    <th className="px-3 py-3 text-left font-medium text-muted">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_QUERIES.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors">
                      <td className="px-5 py-3 text-secondary max-w-[200px] truncate">{row.query}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                          {ENGINE_ICON[row.engine]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {row.mentioned ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="text-muted text-xs truncate">{row.topFirm}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right column (2/5 cols) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Competitor snapshot */}
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h2 className="mb-4 text-sm font-medium text-foreground">Competitor Visibility</h2>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={COMPETITOR_DATA} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#14171F", border: "1px solid #1E2230", borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number) => [v, "Mentions"]}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="mentions" radius={[0, 3, 3, 0]}>
                    {COMPETITOR_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.you ? "#C9A84C" : "#2A2D36"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Content queue preview */}
            <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-foreground">Content Queue</h2>
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    {CONTENT_QUEUE.filter(c => c.status === "Pending Review").length} pending
                  </span>
                </div>
                <a href="/content" className="text-xs text-accent hover:text-accent-muted transition-colors">View all →</a>
              </div>
              <div className="divide-y divide-border">
                {CONTENT_QUEUE.map((item, i) => (
                  <div key={i} className="px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer">
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{item.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted">{item.platform}</span>
                      <span className="text-muted">·</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
