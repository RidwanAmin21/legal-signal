"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRACTICE_AREAS = [
  "Personal Injury","Family Law","Criminal Defense","Immigration",
  "Estate Planning","Business Law","Employment Law","Real Estate",
  "Bankruptcy","Tax Law","Intellectual Property","Other",
];

const METROS = ["Dallas, TX","Houston, TX","Austin, TX","San Antonio, TX","Los Angeles, CA","Chicago, IL","New York, NY","Miami, FL","Denver, CO","Phoenix, AZ"];

const FIRM_SIZES = ["Solo","2–10","11–50","50+"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const TOTAL = 4;

  // Step 1
  const [firmName, setFirmName] = useState("");
  const [metro, setMetro] = useState("");
  const [website, setWebsite] = useState("");
  const [firmSize, setFirmSize] = useState("");

  // Step 2
  const [practiceAreas, setPracticeAreas] = useState<string[]>([]);

  // Step 3
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);

  const addCompetitor = () => {
    const v = competitorInput.trim();
    if (v && competitors.length < 5 && !competitors.includes(v)) {
      setCompetitors([...competitors, v]);
      setCompetitorInput("");
    }
  };

  const toggleArea = (area: string) => {
    setPracticeAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const [launching, setLaunching] = useState(false);
  const handleLaunch = () => {
    setLaunching(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">

      {/* Progress bar */}
      <div className="mb-12 w-full max-w-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Step {step} of {TOTAL}</span>
          <span className="text-xs text-muted">{Math.round((step / TOTAL) * 100)}% complete</span>
        </div>
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(step / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg rounded-lg border border-border bg-bg-card p-10">

        {/* ── Step 1: Firm Profile ── */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Let's set up your firm.</h1>
            <p className="mt-2 text-sm text-muted">This helps us build your AI visibility audit.</p>
            <div className="mt-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Firm Name</label>
                <input value={firmName} onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Mullen & Mullen Law Firm"
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Primary City / Metro</label>
                <select value={metro} onChange={(e) => setMetro(e.target.value)}
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground">
                  <option value="">Select metro...</option>
                  {METROS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Website URL</label>
                <input value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourfirm.com"
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Firm Size</label>
                <div className="flex gap-2">
                  {FIRM_SIZES.map((s) => (
                    <button key={s} onClick={() => setFirmSize(s)}
                      className={`flex-1 rounded-md border py-2 text-sm transition-colors ${
                        firmSize === s
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted hover:border-secondary hover:text-secondary"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Practice Areas ── */}
        {step === 2 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">What does your firm handle?</h1>
            <p className="mt-2 text-sm text-muted">Select all that apply. We'll build your audit and content around these.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {PRACTICE_AREAS.map((area) => (
                <button key={area} onClick={() => toggleArea(area)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    practiceAreas.includes(area)
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:border-secondary hover:text-secondary"
                  }`}>
                  {area}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Competitors ── */}
        {step === 3 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Who's competing for your clients in AI?</h1>
            <p className="mt-2 text-sm text-muted">We'll track whether AI recommends them instead of you. Up to 5 firms.</p>
            <div className="mt-8">
              <div className="flex gap-2">
                <input
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                  placeholder="e.g. Thompson Law"
                  className="input-gold h-11 flex-1 rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                />
                <button onClick={addCompetitor} disabled={competitors.length >= 5}
                  className="rounded-md border border-border px-4 text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors disabled:opacity-40">
                  Add
                </button>
              </div>
              {competitors.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {competitors.map((c) => (
                    <span key={c} className="flex items-center gap-2 rounded-md border border-border bg-bg-input px-3 py-1.5 text-sm text-secondary">
                      {c}
                      <button onClick={() => setCompetitors(competitors.filter((x) => x !== c))}
                        className="text-muted hover:text-error transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setStep(4)} className="mt-8 text-xs text-muted hover:text-secondary transition-colors">
              Skip for now →
            </button>
          </div>
        )}

        {/* ── Step 4: Launch ── */}
        {step === 4 && (
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Your first AI visibility audit is ready.</h1>
            <p className="mt-2 text-sm text-muted">Review your setup before we run it.</p>
            <div className="mt-8 rounded-md border border-border bg-bg-input p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Firm</span>
                <span className="font-medium text-foreground">{firmName || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Metro</span>
                <span className="font-medium text-foreground">{metro || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Practice areas</span>
                <span className="font-medium text-foreground text-right max-w-xs">
                  {practiceAreas.length > 0 ? practiceAreas.join(", ") : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Competitors tracked</span>
                <span className="font-medium text-foreground">{competitors.length}</span>
              </div>
            </div>
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="mt-8 flex h-11 w-full items-center justify-center gap-3 rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors disabled:opacity-70"
            >
              {launching ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                  Launching audit...
                </>
              ) : (
                "Run My Audit"
              )}
            </button>
            {!launching && (
              <p className="mt-3 text-center text-xs text-muted">
                This usually takes 2–3 minutes. We're querying real AI engines in real time.
              </p>
            )}
          </div>
        )}

        {/* ── Nav buttons ── */}
        <div className="mt-10 flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
          ) : <div />}

          {step < TOTAL && (
            <button onClick={() => setStep(step + 1)}
              className="rounded bg-accent px-6 py-2.5 text-sm font-semibold text-background hover:bg-accent-muted transition-colors">
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
