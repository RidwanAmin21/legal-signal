"use client";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

const FIRM = "Mullen & Mullen Law Firm";

type Tab = "Profile" | "Firm Settings" | "Billing" | "Notifications";
const TABS: Tab[] = ["Profile", "Firm Settings", "Billing", "Notifications"];

const PRACTICE_AREAS = [
  "Personal Injury", "Family Law", "Criminal Defense", "Immigration",
  "Estate Planning", "Business Law", "Employment Law", "Real Estate",
];

const METROS = [
  "Dallas, TX", "Houston, TX", "Austin, TX", "San Antonio, TX",
  "Los Angeles, CA", "Chicago, IL", "New York, NY", "Miami, FL",
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");

  // Profile state
  const [name, setName] = useState("Shane Mullen");
  const [email, setEmail] = useState("shane@mullenandmullen.com");
  const [role, setRole] = useState("Managing Partner");

  // Firm state
  const [firmName, setFirmName] = useState("Mullen & Mullen Law Firm");
  const [website, setWebsite] = useState("https://mullenandmullen.com");
  const [metro, setMetro] = useState("Dallas, TX");
  const [practiceAreas, setPracticeAreas] = useState<string[]>(["Personal Injury"]);
  const [competitors, setCompetitors] = useState(["Thompson Law", "Angel Reyes & Associates", "The Callahan Law Firm"]);

  // Notifications state
  const [emailReports, setEmailReports] = useState(true);
  const [scoreAlerts, setScoreAlerts] = useState(true);
  const [contentReady, setContentReady] = useState(true);
  const [competitorAlerts, setCompetitorAlerts] = useState(false);

  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleArea = (area: string) =>
    setPracticeAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  return (
    <DashboardLayout firmName={FIRM}>
      <div className="px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted">Manage your account, firm profile, and notification preferences.</p>
        </div>

        {/* Tab nav */}
        <div className="mb-8 flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 pr-8 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-accent text-foreground"
                  : "text-muted hover:text-secondary"
              }`}
              style={{ marginBottom: -1 }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">

          {/* ── Profile ── */}
          {tab === "Profile" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-bg-card p-6">
                <h2 className="mb-5 text-sm font-medium text-foreground">Personal Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Full Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Role</label>
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-card p-6">
                <h2 className="mb-5 text-sm font-medium text-foreground">Change Password</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">New Password</label>
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Firm Settings ── */}
          {tab === "Firm Settings" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-bg-card p-6">
                <h2 className="mb-5 text-sm font-medium text-foreground">Firm Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Firm Name</label>
                    <input
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Website URL</label>
                    <input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Primary Metro</label>
                    <select
                      value={metro}
                      onChange={(e) => setMetro(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground"
                    >
                      {METROS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-card p-6">
                <h2 className="mb-2 text-sm font-medium text-foreground">Practice Areas</h2>
                <p className="mb-4 text-xs text-muted">Select the areas your firm handles — we build audit queries around these.</p>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        practiceAreas.includes(area)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted hover:border-secondary hover:text-secondary"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-card p-6">
                <h2 className="mb-2 text-sm font-medium text-foreground">Tracked Competitors</h2>
                <p className="mb-4 text-xs text-muted">Up to 5 firms. We track whether AI recommends them over you.</p>
                <div className="space-y-2">
                  {competitors.map((c) => (
                    <div key={c} className="flex items-center justify-between rounded-md border border-border bg-bg-input px-3 py-2">
                      <span className="text-sm text-secondary">{c}</span>
                      <button
                        onClick={() => setCompetitors(competitors.filter((x) => x !== c))}
                        className="text-muted hover:text-error transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {competitors.length < 5 && (
                    <button className="mt-1 text-xs text-accent hover:text-accent-muted transition-colors">
                      + Add competitor
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Billing ── */}
          {tab === "Billing" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-bg-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-foreground">Current Plan</h2>
                    <p className="mt-1 text-xs text-muted">Your subscription details</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">Active</span>
                </div>
                <div className="mt-5 rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <div className="flex items-end gap-1">
                    <span className="font-display text-3xl font-semibold text-foreground">$200</span>
                    <span className="mb-1 text-sm text-muted">/month</span>
                  </div>
                  <p className="mt-1 text-sm text-secondary">LegalSignal — Solo Plan</p>
                  <p className="mt-3 text-xs text-muted">Next billing date: Apr 15, 2026</p>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    "Weekly AI visibility audit",
                    "Bar-compliant content generation",
                    "Competitor tracking (up to 5)",
                    "PDF report + weekly email",
                    "Source URL extraction",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-secondary">
                      <span className="text-success">✓</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-bg-card p-6">
                <h2 className="mb-4 text-sm font-medium text-foreground">Payment Method</h2>
                <div className="flex items-center justify-between rounded-md border border-border bg-bg-input px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-border px-2 py-1 text-xs font-medium text-foreground">VISA</span>
                    <span className="text-sm text-secondary">•••• •••• •••• 4242</span>
                  </div>
                  <span className="text-xs text-muted">Expires 04/28</span>
                </div>
                <button className="mt-3 text-xs text-accent hover:text-accent-muted transition-colors">
                  Update payment method
                </button>
              </div>

              <div className="rounded-lg border border-error/20 bg-bg-card p-6">
                <h2 className="mb-2 text-sm font-medium text-foreground">Cancel Subscription</h2>
                <p className="mb-4 text-xs text-muted leading-relaxed">
                  Canceling stops future billing and audits at the end of your current billing period.
                  Your data is retained for 30 days.
                </p>
                <button className="rounded border border-error/30 px-4 py-2 text-xs text-error hover:border-error hover:bg-error/5 transition-colors">
                  Cancel subscription
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === "Notifications" && (
            <div className="rounded-lg border border-border bg-bg-card p-6">
              <h2 className="mb-5 text-sm font-medium text-foreground">Email Notifications</h2>
              <div className="space-y-4">
                {[
                  {
                    id: "reports",
                    label: "Weekly audit report",
                    sub: "Receive your full PDF report every Monday morning.",
                    value: emailReports,
                    set: setEmailReports,
                  },
                  {
                    id: "score",
                    label: "Score change alerts",
                    sub: "Notify me when my visibility score changes by 5+ points.",
                    value: scoreAlerts,
                    set: setScoreAlerts,
                  },
                  {
                    id: "content",
                    label: "Content ready for review",
                    sub: "Alert me when new AI-generated content is pending approval.",
                    value: contentReady,
                    set: setContentReady,
                  },
                  {
                    id: "competitor",
                    label: "Competitor score changes",
                    sub: "Notify me when a tracked competitor's score changes significantly.",
                    value: competitorAlerts,
                    set: setCompetitorAlerts,
                  },
                ].map(({ id, label, sub, value, set }) => (
                  <div key={id} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="mt-0.5 text-xs text-muted">{sub}</p>
                    </div>
                    <button
                      onClick={() => set(!value)}
                      className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${
                        value ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${
                          value ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="rounded bg-accent px-5 py-2.5 text-sm font-semibold text-background hover:bg-accent-muted transition-colors"
            >
              Save Changes
            </button>
            {saved && (
              <span className="text-xs text-success">✓ Changes saved</span>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
