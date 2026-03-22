"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

/* ── Fade-in on scroll ───────────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("animate-fade-in-up"); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useFadeIn();
  return <div ref={ref} className={`opacity-0 ${className}`}>{children}</div>;
}

/* ── Check / X icons ─────────────────────────────────────────────── */
const Check = () => (
  <svg className="inline h-4 w-4 text-success" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);
const Cross = () => (
  <svg className="inline h-4 w-4 text-muted" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

/* ── Page ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold tracking-tight">LegalSignal</span>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">How it works</a>
            <a href="#compare"       className="text-sm text-muted hover:text-foreground transition-colors">Compare</a>
            <a href="#pricing"       className="text-sm text-muted hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/login?tab=signup" className="rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-muted transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden dot-grid py-36 md:py-48">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Generative Engine Optimization for Law Firms
          </p>
          <h1 className="font-display text-balance text-5xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Your firm doesn't exist<br />to AI.{" "}
            <span className="text-accent">We fix that.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-secondary">
            AI search engines are replacing Google for legal queries — and most firms are invisible.
            LegalSignal audits your presence, extracts citation sources, and generates bar-compliant
            content that gets you recommended.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login?tab=signup"
              className="group relative overflow-hidden rounded bg-accent px-7 py-3.5 text-sm font-semibold text-background transition-colors hover:bg-accent-muted"
            >
              Get Your Free AI Visibility Audit
            </Link>
            <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
              See how it works →
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">
            Trusted by firms across Dallas, Houston, and Los Angeles
          </p>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="border-t border-border bg-bg-secondary py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              The shift already happened.
            </h2>
            <p className="mt-3 text-secondary">
              While you were focused on Google, your clients moved to AI.
            </p>
          </FadeSection>
          <div className="mt-12 grid gap-px border border-border md:grid-cols-3">
            {[
              { stat: "40%",    label: "of legal queries now go through AI search engines — not Google." },
              { stat: "4 in 10", label: "law firms are completely invisible in AI-generated recommendations." },
              { stat: "0%",     label: "of your competitors are systematically optimizing for AI search right now." },
            ].map(({ stat, label }) => (
              <FadeSection key={stat} className="bg-bg-card p-10">
                <p className="font-display text-5xl font-semibold text-accent">{stat}</p>
                <p className="mt-4 text-sm leading-relaxed text-secondary">{label}</p>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Three steps. Full visibility.
            </h2>
          </FadeSection>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "We audit your AI presence",
                body: "We query every major AI engine with your practice areas and metro and tell you exactly where you stand — which queries mention you, which don't, and who's showing up instead.",
              },
              {
                n: "02",
                title: "We build your citation profile",
                body: "We extract the source URLs AI engines actually cite, identify gaps, and generate bar-compliant legal content placed on the platforms that move the needle.",
              },
              {
                n: "03",
                title: "You show up when it matters",
                body: "When someone asks AI 'best personal injury lawyer in Dallas,' your firm is the answer — not an afterthought.",
              },
            ].map(({ n, title, body }) => (
              <FadeSection key={n} className="rounded-lg border border-border bg-bg-card p-8">
                <span className="font-mono text-xs text-accent">{n}</span>
                <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{body}</p>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" className="border-t border-border bg-bg-secondary py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Why LegalSignal?
            </h2>
          </FadeSection>
          <FadeSection className="mt-12 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted">Feature</th>
                  <th className="border-l border-accent/30 bg-accent/5 px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-accent">LegalSignal</th>
                  <th className="border-l border-border px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted">Generic GEO Tools</th>
                  <th className="border-l border-border px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted">Doing Nothing</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price",                  "$200/month",    "$599–$1,499/mo", "$0 (for now)"],
                  ["Legal-specific content", <Check />,       <Cross />,        <Cross />],
                  ["Source URL extraction",  <Check />,       "Partial",        <Cross />],
                  ["Practice area prompts",  <Check />,       <Cross />,        <Cross />],
                  ["Bar compliance review",  <Check />,       <Cross />,        <Cross />],
                  ["Time to results",        "30 days",       "90+ days",       "Never"],
                ].map(([feature, us, generic, nothing], i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-6 py-4 text-secondary">{feature}</td>
                    <td className="border-l border-accent/30 bg-accent/5 px-6 py-4 font-medium text-foreground">{us}</td>
                    <td className="border-l border-border px-6 py-4 text-muted">{generic}</td>
                    <td className="border-l border-border px-6 py-4 text-muted">{nothing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FadeSection>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted">Built for firms like yours</p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                { quote: "We went from invisible to the #1 recommended PI firm on Perplexity in Dallas. In six weeks.", author: "Managing Partner", firm: "Dallas Personal Injury Firm" },
                { quote: "Finally a tool that understands legal marketing — not just SEO rebadged as AI optimization.", author: "Marketing Director", firm: "Houston Trial Law Group" },
                { quote: "Our competitors don't know this exists yet. That's exactly where I want to be.", author: "Senior Partner", firm: "Los Angeles Family Law" },
              ].map(({ quote, author, firm }) => (
                <div key={firm} className="rounded-lg border border-border bg-bg-card p-8">
                  <p className="text-sm leading-relaxed text-secondary">"{quote}"</p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">{author}</p>
                    <p className="mt-0.5 text-xs text-accent">{firm}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="border-t border-border bg-bg-secondary py-28">
        <div className="mx-auto max-w-md px-6 text-center">
          <FadeSection>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              One plan. One price.
            </h2>
            <p className="mt-3 text-secondary">Everything you need to own your AI search presence.</p>
            <div className="mt-12 rounded-lg border border-border bg-bg-card p-10 text-left">
              <p className="font-display text-5xl font-semibold text-foreground">
                <span className="text-accent">$</span>200
                <span className="text-lg font-normal text-muted">/month</span>
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "AI visibility audit (weekly)",
                  "Bar-compliant content generation",
                  "Source URL extraction & mapping",
                  "Practice-area prompt library",
                  "Competitor tracking & gap analysis",
                  "Dedicated dashboard",
                  "Weekly email report",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-secondary">
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?tab=signup"
                className="mt-10 flex w-full items-center justify-center rounded bg-accent py-3 text-sm font-semibold text-background hover:bg-accent-muted transition-colors"
              >
                Start Your Audit
              </Link>
              <p className="mt-4 text-center text-xs text-muted">
                No contract. Cancel anytime. ROI in 30 days or your money back.
              </p>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <span className="font-display text-sm font-semibold text-foreground">LegalSignal</span>
          <div className="flex gap-6 text-xs text-muted">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
          <p className="text-xs text-muted">© 2026 LegalSignal</p>
        </div>
      </footer>

    </div>
  );
}
