"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { useClientId } from "@/hooks/useClientId";
import { createClient } from "@/lib/supabase-browser";

type Tab = "Profile" | "Firm Settings" | "Billing" | "Notifications";
const TABS: Tab[] = ["Profile", "Firm Settings", "Billing", "Notifications"];

const PRACTICE_AREAS = [
  "Personal Injury", "Family Law", "Criminal Defense", "Immigration",
  "Estate Planning", "Business Law", "Employment Law", "Real Estate",
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const { clientId } = useClientId();
  const queryClient = useQueryClient();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: async () => {
      const res = await fetch("/api/client");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const firmName = client?.firm_name ?? "Your Firm";

  // Firm settings state — seeded from real client data
  const [firmNameInput, setFirmNameInput] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Notifications state (local only — no backend yet)
  const [emailReports, setEmailReports] = useState(true);
  const [scoreAlerts, setScoreAlerts] = useState(true);
  const [contentReady, setContentReady] = useState(true);
  const [competitorAlerts, setCompetitorAlerts] = useState(false);

  useEffect(() => {
    if (client) {
      setFirmNameInput(client.firm_name ?? "");
      setWebsite(client.primary_domain ?? "");
      setContactEmail(client.contact_email ?? "");
      setPracticeAreas(client.practice_areas ?? []);
    }
  }, [client]);

  const toggleArea = (area: string) =>
    setPracticeAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );

  const handlePasswordChange = async () => {
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setPasswordSaved(true);
        setTimeout(() => setPasswordSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === "Firm Settings") {
        const res = await fetch("/api/settings/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firm_name: firmNameInput,
            primary_domain: website,
            contact_email: contactEmail,
            practice_areas: practiceAreas,
          }),
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["client"] });
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-muted">Manage your account, firm profile, and notification preferences.</p>
        </div>

        {/* Tab nav */}
        <div className="mb-6 flex overflow-x-auto border-b border-border sm:mb-8">
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
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-5 text-sm font-medium text-foreground">Account</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-xs text-muted">Email</span>
                    <span className="text-xs text-secondary">{client?.contact_email ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-xs text-muted">Firm</span>
                    <span className="text-xs text-secondary">{firmName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Plan</span>
                    <span className="text-xs font-medium text-accent capitalize">{client?.tier ?? "—"}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-5 text-sm font-medium text-foreground">Change Password</h2>
                {passwordError && (
                  <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                    {passwordError}
                  </div>
                )}
                {passwordSaved && (
                  <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
                    Password updated successfully.
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="settings-current-pw" className="mb-1.5 block text-xs font-medium text-secondary">Current Password</label>
                    <input id="settings-current-pw" type="password" placeholder="••••••••"
                      value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
                  </div>
                  <div>
                    <label htmlFor="settings-new-pw" className="mb-1.5 block text-xs font-medium text-secondary">New Password</label>
                    <input id="settings-new-pw" type="password" placeholder="Min. 8 characters"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
                  </div>
                  <button onClick={handlePasswordChange} disabled={saving || !newPassword}
                    className="rounded bg-accent/10 border border-accent/20 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">
                    {saving ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Firm Settings ── */}
          {tab === "Firm Settings" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-5 text-sm font-medium text-foreground">Firm Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="settings-firm" className="mb-1.5 block text-xs font-medium text-secondary">Firm Name</label>
                    <input id="settings-firm" value={firmNameInput} onChange={(e) => setFirmNameInput(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground" />
                  </div>
                  <div>
                    <label htmlFor="settings-website" className="mb-1.5 block text-xs font-medium text-secondary">Website URL</label>
                    <input id="settings-website" value={website} onChange={(e) => setWebsite(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground" />
                  </div>
                  <div>
                    <label htmlFor="settings-email" className="mb-1.5 block text-xs font-medium text-secondary">Contact Email</label>
                    <input id="settings-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      className="input-gold h-10 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-2 text-sm font-medium text-foreground">Practice Areas</h2>
                <p className="mb-4 text-xs text-muted">Select the areas your firm handles — we build audit queries around these.</p>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_AREAS.map((area) => (
                    <button key={area} onClick={() => toggleArea(area)}
                      className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                        practiceAreas.includes(area)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted hover:border-secondary hover:text-secondary"
                      }`}>
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Billing ── */}
          {tab === "Billing" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-foreground">Current Plan</h2>
                    <p className="mt-1 text-xs text-muted">Your subscription details</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">Active</span>
                </div>
                <div className="mt-5 rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <p className="text-sm text-secondary capitalize">LegalSignal — {client?.tier ?? "Solo"} Plan</p>
                  <p className="mt-2 text-xs text-muted">Billing managed separately. Contact support to upgrade or cancel.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === "Notifications" && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-5 text-sm font-medium text-foreground">Email Notifications</h2>
              <div className="space-y-4">
                {[
                  { id: "reports", label: "Weekly audit report", sub: "Receive your full PDF report every Monday morning.", value: emailReports, set: setEmailReports },
                  { id: "score",   label: "Score change alerts",  sub: "Notify me when my visibility score changes by 5+ points.", value: scoreAlerts, set: setScoreAlerts },
                  { id: "content", label: "Content ready for review", sub: "Alert me when new AI-generated content is pending approval.", value: contentReady, set: setContentReady },
                  { id: "comp",    label: "Competitor score changes", sub: "Notify me when a tracked competitor's score changes significantly.", value: competitorAlerts, set: setCompetitorAlerts },
                ].map(({ id, label, sub, value, set }) => (
                  <div key={id} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                    <div id={`notif-${id}-label`}>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="mt-0.5 text-xs text-muted">{sub}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={value}
                      aria-labelledby={`notif-${id}-label`}
                      onClick={() => set(!value)}
                      className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${value ? "bg-accent" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="mt-6 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="rounded bg-accent px-5 py-2.5 text-sm font-semibold text-background hover:bg-accent-muted transition-colors disabled:opacity-60">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && <span className="text-xs text-success">✓ Changes saved</span>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
