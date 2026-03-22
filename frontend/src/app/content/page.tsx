"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const FIRM = "Mullen & Mullen Law Firm";

type Status = "All" | "Pending Review" | "Draft" | "In Review" | "Approved" | "Published";

const TABS: Status[] = ["All", "Pending Review", "Draft", "In Review", "Approved", "Published"];

const CONTENT_ITEMS = [
  {
    id: 1,
    title: "Top 5 Questions About Car Accident Claims in Dallas",
    area: "Personal Injury",
    platform: "Avvo",
    status: "Pending Review" as Status,
    type: "FAQ",
    words: 820,
    created: "Mar 14, 2026",
    bar_compliant: true,
    preview: "If you've been injured in a car accident in Dallas, you likely have questions about what comes next. Here are the five most common questions our clients ask...",
  },
  {
    id: 2,
    title: "Understanding Negligence in Texas Personal Injury Cases",
    area: "Personal Injury",
    platform: "Justia",
    status: "Draft" as Status,
    type: "Guide",
    words: 1240,
    created: "Mar 13, 2026",
    bar_compliant: true,
    preview: "Negligence is the foundation of most personal injury claims in Texas. To win a case, your attorney must prove four key elements: duty, breach, causation, and damages...",
  },
  {
    id: 3,
    title: "Dallas Wrongful Death Attorney: What Families Need to Know",
    area: "Personal Injury",
    platform: "Blog",
    status: "In Review" as Status,
    type: "FAQ",
    words: 960,
    created: "Mar 12, 2026",
    bar_compliant: true,
    preview: "Losing a family member due to someone else's negligence is devastating. A wrongful death claim allows surviving family members to seek compensation...",
  },
  {
    id: 4,
    title: "How Long Does a Personal Injury Case Take in Texas?",
    area: "Personal Injury",
    platform: "Avvo",
    status: "Approved" as Status,
    type: "FAQ",
    words: 680,
    created: "Mar 10, 2026",
    bar_compliant: true,
    preview: "The timeline for a personal injury case in Texas varies significantly depending on the severity of injuries, liability disputes, and whether the case goes to trial...",
  },
  {
    id: 5,
    title: "Truck Accident Claims: Dallas Driver's Complete Guide",
    area: "Personal Injury",
    platform: "Justia",
    status: "Published" as Status,
    type: "Guide",
    words: 1580,
    created: "Mar 5, 2026",
    bar_compliant: true,
    preview: "Commercial truck accidents are among the most devastating collisions on Texas roads. When a fully loaded 18-wheeler hits a passenger vehicle, the results are catastrophic...",
  },
  {
    id: 6,
    title: "Slip and Fall Accidents on Commercial Property in Dallas",
    area: "Personal Injury",
    platform: "Blog",
    status: "Published" as Status,
    type: "FAQ",
    words: 740,
    created: "Feb 28, 2026",
    bar_compliant: false,
    preview: "Property owners in Dallas have a legal duty to maintain safe conditions for visitors. When they fail to do so and someone is injured, premises liability law applies...",
  },
];

const STATUS_STYLES: Record<string, string> = {
  "Pending Review": "text-warning bg-warning/10",
  "Draft":          "text-muted bg-white/5",
  "In Review":      "text-blue-400 bg-blue-400/10",
  "Approved":       "text-success bg-success/10",
  "Published":      "text-accent bg-accent/10",
};

const TYPE_STYLES: Record<string, string> = {
  "FAQ":   "text-secondary bg-white/5",
  "Guide": "text-blue-400 bg-blue-400/10",
};

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<Status>("All");
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = activeTab === "All"
    ? CONTENT_ITEMS
    : CONTENT_ITEMS.filter((c) => c.status === activeTab);

  const pendingCount = CONTENT_ITEMS.filter((c) => c.status === "Pending Review").length;
  const selectedItem = CONTENT_ITEMS.find((c) => c.id === selected) ?? null;

  return (
    <DashboardLayout firmName={FIRM}>
      <div className="flex h-screen flex-col">

        {/* Page header */}
        <div className="flex-shrink-0 border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">Content Queue</h1>
              <p className="mt-1 text-sm text-muted">AI-generated, bar-compliant content ready to publish.</p>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                  {pendingCount} pending review
                </span>
              )}
              <button className="rounded border border-border px-4 py-2 text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors">
                Request Content
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-5 flex gap-1 border-b border-border">
            {TABS.map((tab) => {
              const count = tab === "All"
                ? CONTENT_ITEMS.length
                : CONTENT_ITEMS.filter((c) => c.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 pb-3 pr-4 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-accent text-foreground"
                      : "text-muted hover:text-secondary"
                  }`}
                  style={{ marginBottom: -1 }}
                >
                  {tab}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      activeTab === tab ? "bg-accent/20 text-accent" : "bg-border text-muted"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: content list */}
          <div className={`flex-shrink-0 overflow-y-auto border-r border-border ${selectedItem ? "w-96" : "w-full"}`}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm font-medium text-secondary">No content in this status</p>
                <p className="mt-1 text-xs text-muted">Content will appear here as it moves through the queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(selected === item.id ? null : item.id)}
                    className={`w-full px-5 py-4 text-left transition-colors hover:bg-white/[0.02] ${
                      selected === item.id ? "bg-white/[0.03] border-l-2 border-l-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{item.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[item.status]}`}>
                            {item.status}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLES[item.type]}`}>
                            {item.type}
                          </span>
                          {!item.bar_compliant && (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-error/10 text-error">
                              Review needed
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                          <span>{item.platform}</span>
                          <span>·</span>
                          <span>{item.words.toLocaleString()} words</span>
                          <span>·</span>
                          <span>{item.created}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: preview panel */}
          {selectedItem && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[selectedItem.status]}`}>
                    {selectedItem.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedItem.status === "Pending Review" && (
                    <>
                      <button className="rounded border border-error/30 px-3 py-1.5 text-xs text-error hover:border-error transition-colors">
                        Reject
                      </button>
                      <button className="rounded bg-success px-3 py-1.5 text-xs font-medium text-background hover:bg-success/80 transition-colors">
                        Approve
                      </button>
                    </>
                  )}
                  {selectedItem.status === "Approved" && (
                    <button className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-background hover:bg-accent-muted transition-colors">
                      Publish
                    </button>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="ml-2 text-muted hover:text-foreground transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Metadata */}
                <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-border bg-bg-card p-4">
                  {[
                    { label: "Platform",     value: selectedItem.platform },
                    { label: "Practice Area", value: selectedItem.area },
                    { label: "Type",          value: selectedItem.type },
                    { label: "Word Count",    value: selectedItem.words.toLocaleString() },
                    { label: "Created",       value: selectedItem.created },
                    { label: "Bar Compliance", value: selectedItem.bar_compliant ? "Passed" : "Needs Review", color: selectedItem.bar_compliant ? "text-success" : "text-warning" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="min-w-[120px]">
                      <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
                      <p className={`mt-0.5 text-xs font-medium ${color ?? "text-foreground"}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Title */}
                <h2 className="font-display text-xl font-semibold text-foreground leading-snug">
                  {selectedItem.title}
                </h2>

                {/* Bar compliance badge */}
                <div className={`mt-4 flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                  selectedItem.bar_compliant
                    ? "border-success/20 bg-success/5 text-success"
                    : "border-warning/20 bg-warning/5 text-warning"
                }`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {selectedItem.bar_compliant ? (
                      <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                    ) : (
                      <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                    )}
                  </svg>
                  {selectedItem.bar_compliant
                    ? "Bar compliance check passed — no prohibited claims, proper disclaimers included"
                    : "Bar compliance review needed — check for prohibited guarantees or testimonial rules"
                  }
                </div>

                {/* Content preview */}
                <div className="mt-6">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">Content Preview</p>
                  <div className="rounded-lg border border-border bg-bg-input p-5">
                    <p className="text-sm leading-relaxed text-secondary">{selectedItem.preview}</p>
                    <p className="mt-4 text-[11px] text-muted italic">
                      [Full content available after approval — {selectedItem.words.toLocaleString()} words total]
                    </p>
                  </div>
                </div>

                {/* Target queries */}
                <div className="mt-6">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">Targets These AI Queries</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      `best ${selectedItem.area.toLowerCase()} lawyer Dallas`,
                      `${selectedItem.area.toLowerCase()} attorney Dallas TX`,
                      `top rated ${selectedItem.area.toLowerCase()} firm Dallas`,
                    ].map((q) => (
                      <span key={q} className="rounded-md border border-border bg-bg-input px-2.5 py-1 text-[11px] text-secondary">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
