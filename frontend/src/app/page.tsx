import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, #1c1917 1px, transparent 1px),
            linear-gradient(to bottom, #1c1917 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            LegalSignal
          </span>
          <div className="flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/dashboard"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero — asymmetric, editorial */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-28 md:pt-32 md:pb-40">
          <div className="grid md:grid-cols-12 md:gap-16 items-start">
            <div className="md:col-span-7">
              <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
                AI Search Monitoring
              </p>
              <h1 className="font-display text-4xl leading-[1.15] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                When clients ask ChatGPT for a lawyer,
                <span className="text-accent"> does it say you?</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
                LegalSignal tracks how Perplexity, ChatGPT, and Gemini recommend
                law firms in your market. Weekly visibility scores. Competitor
                benchmarks. Delivered to your inbox.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-muted transition-colors"
                >
                  Start free trial
                  <span className="opacity-80">→</span>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-foreground/30 transition-colors"
                >
                  See how it works
                </a>
              </div>
            </div>
            <div className="mt-16 md:mt-0 md:col-span-5 md:col-start-8">
              {/* Score card mock */}
              <div className="rounded-xl border border-border bg-card p-8 shadow-lg shadow-foreground/5">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">
                    Visibility Score
                  </span>
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                    Weekly
                  </span>
                </div>
                <div className="mb-2 font-display text-5xl font-semibold text-foreground">
                  78
                </div>
                <p className="text-sm text-muted">out of 100</p>
                <div className="mt-6 space-y-3 border-t border-border pt-6">
                  {[
                    { platform: "ChatGPT", score: 82, bar: "82%" },
                    { platform: "Perplexity", score: 74, bar: "74%" },
                    { platform: "Gemini", score: 78, bar: "78%" },
                  ].map((item) => (
                    <div key={item.platform}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">{item.platform}</span>
                        <span className="font-medium text-foreground">
                          {item.score}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: item.bar }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms strip */}
      <section className="border-y border-border bg-card/50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-6 text-center text-sm font-medium text-muted">
            We monitor recommendations across
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-4">
            {["ChatGPT", "Perplexity", "Gemini"].map((name) => (
              <span
                key={name}
                className="font-display text-2xl font-medium text-foreground/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Know where you stand
            </h2>
            <p className="mt-4 text-lg text-muted">
              Every week we query AI search engines with real client-intent
              prompts. We extract mentions, resolve firms, and compute your
              visibility.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "We ask the AIs",
                desc: 'Hundreds of prompts like "best PI lawyer in Dallas" across ChatGPT, Perplexity, and Gemini.',
              },
              {
                step: "02",
                title: "We extract & score",
                desc: "GPT-4 extracts firm mentions. Our engine scores visibility: mentions, position, sentiment.",
              },
              {
                step: "03",
                title: "You get the report",
                desc: "Weekly PDF + dashboard. Your score, competitor comparison, platform breakdown.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-border bg-card p-8"
              >
                <span className="text-sm font-medium text-accent">
                  {item.step}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it&apos;s for */}
      <section className="border-t border-border bg-card/30 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 md:gap-20 items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Built for firms that compete on reputation
              </h2>
              <p className="mt-6 text-lg text-muted leading-relaxed">
                Small to mid-size firms (3–20 attorneys) who want to know if AI
                search is sending clients their way—or to the competition. No
                technical setup. Weekly reports in your inbox.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Personal injury & litigation",
                  "Family law, estate planning",
                  "Real estate, business law",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-muted"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-12 md:mt-0">
              <div className="rounded-xl border border-border bg-background p-8">
                <p className="text-sm font-medium text-muted">
                  Sample report excerpt
                </p>
                <div className="mt-4 font-display text-2xl font-semibold text-foreground">
                  Mullen & Mullen: 82/100
                </div>
                <p className="mt-1 text-sm text-muted">
                  Up 6 points from last week. #2 in Dallas PI on Perplexity.
                </p>
                <div className="mt-6 flex gap-4">
                  <div className="flex-1 rounded border border-border p-3">
                    <p className="text-xs text-muted">Mention rate</p>
                    <p className="font-semibold text-foreground">78%</p>
                  </div>
                  <div className="flex-1 rounded border border-border p-3">
                    <p className="text-xs text-muted">Top 3 position</p>
                    <p className="font-semibold text-foreground">64%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Simple pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              $199–$399/month. Weekly reports, dashboard access, competitor
              tracking. No long-term contracts.
            </p>
          </div>
          <div className="mt-16 flex justify-center">
            <div className="w-full max-w-md rounded-2xl border-2 border-accent bg-card p-10 shadow-lg shadow-accent/10">
              <p className="text-sm font-medium text-accent">Starter</p>
              <p className="mt-2 font-display text-4xl font-semibold text-foreground">
                $199
                <span className="text-lg font-normal text-muted">/mo</span>
              </p>
              <ul className="mt-8 space-y-4 text-muted">
                {[
                  "Weekly PDF report",
                  "Visibility score + breakdown",
                  "Competitor comparison",
                  "Dashboard access",
                  "Email delivery",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="text-accent">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="mt-10 flex w-full items-center justify-center rounded-md bg-accent px-6 py-3 font-medium text-white hover:bg-accent-muted transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-foreground py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Stop guessing. Start measuring.
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join law firms who know exactly how AI search recommends them.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-medium text-foreground hover:bg-white/90 transition-colors"
          >
            Start free trial
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <span className="font-display text-lg font-semibold text-foreground">
            LegalSignal
          </span>
          <div className="flex gap-8 text-sm text-muted">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
