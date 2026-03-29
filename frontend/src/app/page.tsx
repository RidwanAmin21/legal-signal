"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";

/* ── Fade-in on scroll (below-fold sections) ─────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("animate-fade-in-up");
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className={`opacity-0 ${className}`}>
      {children}
    </div>
  );
}

/* ── Shared easing curves ─────────────────────────────────────────── */
const easeOutQuart = [0.25, 1, 0.5, 1] as const;
const easeOutExpo = [0.16, 1, 0.3, 1] as const;

/* ── Staggered scroll-in (for grids) ─────────────────────────────── */
function StaggerItem({
  children,
  className = "",
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: easeOutQuart }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated counter ────────────────────────────────────────────── */
function AnimatedStat({ value, suffix = "" }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const num = parseInt(value.replace(/\D/g, ""), 10);
          if (isNaN(num)) {
            setDisplay(value);
            return;
          }
          const duration = 1200;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(num * eased).toString());
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ── Scroll-aware header hook ────────────────────────────────────── */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* ── SVG Icons ───────────────────────────────────────────────────── */
const Check = () => (
  <svg
    className="inline h-4 w-4 text-success flex-shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const Cross = () => (
  <svg
    className="inline h-4 w-4 text-muted flex-shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

/* Icon components for features */
const IconRadar = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v4M12 18v4" />
  </svg>
);

const IconExtract = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const IconContent = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconChart = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconShield = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconMail = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

/* ── Mobile nav toggle ───────────────────────────────────────────── */
const IconMenu = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ── FAQ Accordion (grid-template-rows for smooth height) ────────── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left cursor-pointer group"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground pr-4 group-hover:text-accent transition-colors duration-200">{question}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-sm leading-relaxed text-secondary">{answer}</p>
        </div>
      </div>
    </div>
  );
}


/* ── Page ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [mobileNav, setMobileNav] = useState(false);
  const scrolled = useScrolled();
  const closeMobileNav = useCallback(() => setMobileNav(false), []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOutQuart }}
        className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled
            ? "border-b border-border bg-background/90 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold tracking-tight">
            LegalSignal
          </span>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors duration-200">
              How it works
            </a>
            <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors duration-200">
              Features
            </a>
            <a href="#compare" className="text-sm text-muted hover:text-foreground transition-colors duration-200">
              Compare
            </a>
            <a href="#pricing" className="text-sm text-muted hover:text-foreground transition-colors duration-200">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-muted hover:text-foreground transition-colors duration-200 sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login?tab=signup"
              className="hidden rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-muted transition-colors duration-200 cursor-pointer sm:block"
            >
              Get started
            </Link>
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="text-muted hover:text-foreground md:hidden cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileNav ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
        {/* Mobile nav — animated */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: easeOutQuart }}
              className="overflow-hidden border-t border-border bg-background md:hidden"
            >
              <nav className="flex flex-col gap-4 px-6 py-4">
                <a href="#how-it-works" onClick={closeMobileNav} className="text-sm text-muted hover:text-foreground transition-colors">How it works</a>
                <a href="#features" onClick={closeMobileNav} className="text-sm text-muted hover:text-foreground transition-colors">Features</a>
                <a href="#compare" onClick={closeMobileNav} className="text-sm text-muted hover:text-foreground transition-colors">Compare</a>
                <a href="#pricing" onClick={closeMobileNav} className="text-sm text-muted hover:text-foreground transition-colors">Pricing</a>
                <hr className="border-border" />
                <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors">Sign in</Link>
                <Link href="/login?tab=signup" className="rounded bg-accent px-4 py-2 text-center text-sm font-medium text-background hover:bg-accent-muted transition-colors cursor-pointer">Get started</Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 pb-16 md:pt-36 md:pb-20">
        {/* Dot grid background */}
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        {/* Glow orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: easeOutExpo }}
          className="hero-glow absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: easeOutQuart }}
            className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-accent-muted"
          >
            Generative Engine Optimization for Law Firms
          </motion.p>

          {/* Headline — word-by-word blur reveal */}
          <h1 className="font-display text-balance text-5xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {"Your firm is invisible".split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: "blur(4px)", y: 6 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: 0.35 + i * 0.1,
                  ease: easeOutQuart,
                }}
                className="mr-[0.27em] inline-block"
              >
                {word}
              </motion.span>
            ))}
            <br />
            {"to AI search.".split(" ").map((word, i) => (
              <motion.span
                key={`l2-${i}`}
                initial={{ opacity: 0, filter: "blur(4px)", y: 6 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: 0.8 + i * 0.1,
                  ease: easeOutQuart,
                }}
                className="mr-[0.27em] inline-block"
              >
                {word}
              </motion.span>
            ))}{" "}
            <motion.span
              initial={{ opacity: 0, filter: "blur(4px)", y: 6 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{
                duration: 0.55,
                delay: 1.15,
                ease: easeOutQuart,
              }}
              className="text-gradient-gold inline-block"
            >
              We fix that.
            </motion.span>
          </h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.45, ease: easeOutQuart }}
            className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-secondary"
          >
            AI search engines are replacing Google for legal queries — and most
            firms aren&apos;t showing up. LegalSignal monitors your visibility,
            tracks competitors, and helps you get recommended.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.75, ease: easeOutQuart }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="/login?tab=signup"
              className="group relative rounded bg-accent px-7 py-3.5 text-sm font-semibold text-background transition-colors duration-200 hover:bg-accent-muted cursor-pointer"
            >
              Get Your Free AI Visibility Audit
            </Link>
            <a
              href="#how-it-works"
              className="text-sm text-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              See how it works &rarr;
            </a>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.6 }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["M", "S", "J", "R"].map((initial, i) => (
                  <div
                    key={initial}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold"
                    style={{
                      background: ["#1E2230", "#1A2332", "#22201A", "#1A1E2A"][i],
                      color: ["#9CA3AF", "#60A5FA", "#C9A84C", "#34D399"][i],
                    }}
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                Trusted by firms across Dallas, Houston, and Los Angeles
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Problem / Stats ── */}
      <section className="border-t border-border bg-bg-secondary py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              The shift already happened
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              While you focused on Google,
              <br className="hidden sm:block" /> your clients moved to AI.
            </h2>
          </FadeSection>

          <div className="mt-14 grid gap-px sm:grid-cols-3 rounded-lg border border-border overflow-hidden">
            {[
              {
                stat: "40",
                suffix: "%",
                label: "of legal queries now go through AI search engines — not Google.",
              },
              {
                stat: "4",
                suffix: " in 10",
                label: "law firms are completely invisible in AI-generated recommendations.",
              },
              {
                stat: "0",
                suffix: "%",
                label: "of your competitors are systematically optimizing for AI search right now.",
              },
            ].map(({ stat, suffix, label }, i) => (
              <StaggerItem
                key={stat + suffix}
                index={i}
                className="bg-card p-8 md:p-10"
              >
                <p className="font-display text-5xl font-semibold text-accent md:text-6xl">
                  <AnimatedStat value={stat} suffix={suffix} />
                </p>
                <p className="mt-4 text-sm leading-relaxed text-secondary max-w-[26ch]">
                  {label}
                </p>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Three steps. Full visibility.
            </h2>
          </FadeSection>

          <div className="mt-14 grid gap-8 md:grid-cols-3 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-border" />
            {[
              {
                n: "01",
                title: "We audit your AI presence",
                body: "We query every major AI engine with your practice areas and metro, and tell you exactly where you stand — which queries mention you, which don't, and who's showing up instead.",
                icon: <IconRadar />,
              },
              {
                n: "02",
                title: "We build your citation profile",
                body: "We extract the source URLs AI engines actually cite, identify gaps, and generate bar-compliant legal content placed on the platforms that move the needle.",
                icon: <IconExtract />,
              },
              {
                n: "03",
                title: "You show up when it matters",
                body: "When someone asks AI 'best personal injury lawyer in Dallas,' your firm is the answer — not an afterthought.",
                icon: <IconContent />,
              },
            ].map(({ n, title, body, icon }, i) => (
              <StaggerItem
                key={n}
                index={i}
                className="group relative"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-card text-accent transition-colors duration-300 group-hover:border-accent group-hover:bg-accent/[0.08]">
                    {icon}
                  </div>
                  <span className="font-mono text-xs text-muted">{n}</span>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary">
                  {body}
                </p>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="border-t border-border bg-bg-secondary py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Platform
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to own
              <br className="hidden sm:block" /> your AI search presence.
            </h2>
          </FadeSection>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <IconRadar />,
                title: "Multi-engine monitoring",
                desc: "We query ChatGPT, Gemini, and Perplexity weekly with your practice-area prompts and track every mention.",
              },
              {
                icon: <IconChart />,
                title: "Visibility scoring",
                desc: "A single 0-100 score that tells you exactly where you stand — broken down by platform, query, and competitor.",
              },
              {
                icon: <IconExtract />,
                title: "Source URL extraction",
                desc: "We extract the citations AI engines use to form recommendations so you know which pages matter most.",
              },
              {
                icon: <IconContent />,
                title: "Bar-compliant content",
                desc: "AI-generated legal content that follows bar advertising rules, placed where AI engines actually look.",
              },
              {
                icon: <IconShield />,
                title: "Competitor intelligence",
                desc: "See which firms AI is recommending instead of you, their scores over time, and where the gaps are.",
              },
              {
                icon: <IconMail />,
                title: "Weekly PDF reports",
                desc: "A polished report delivered to your inbox every week — scores, trends, and actionable recommendations.",
              },
            ].map(({ icon, title, desc }, i) => (
              <StaggerItem
                key={title}
                index={i}
                className="group rounded-lg border border-border bg-card p-7 transition-[border-color,box-shadow] duration-300 hover:border-accent/20 hover:shadow-[0_0_24px_rgba(201,168,76,0.04)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-bg-secondary text-accent transition-colors duration-300 group-hover:border-accent/30">
                  {icon}
                </div>
                <h3 className="mt-5 text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {desc}
                </p>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Compare
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Why LegalSignal?
            </h2>
          </FadeSection>

          {/* Desktop table */}
          <FadeSection className="mt-12 hidden overflow-hidden rounded-lg border border-border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    Feature
                  </th>
                  <th className="border-l border-accent/30 bg-accent/5 px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-accent">
                    LegalSignal
                  </th>
                  <th className="border-l border-border px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    Generic GEO Tools
                  </th>
                  <th className="border-l border-border px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    Doing Nothing
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price", "$200/month", "$599\u2013$1,499/mo", "$0 (for now)"],
                  ["Legal-specific content", <Check key="c1" />, <Cross key="x1" />, <Cross key="x2" />],
                  ["Source URL extraction", <Check key="c2" />, "Partial", <Cross key="x3" />],
                  ["Practice area prompts", <Check key="c3" />, <Cross key="x4" />, <Cross key="x5" />],
                  ["Bar compliance review", <Check key="c4" />, <Cross key="x6" />, <Cross key="x7" />],
                  ["Time to results", "30 days", "90+ days", "Never"],
                ].map(([feature, us, generic, nothing], i) => (
                  <tr
                    key={i}
                    className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}
                  >
                    <td className="px-6 py-4 text-secondary">{feature}</td>
                    <td className="border-l border-accent/30 bg-accent/5 px-6 py-4 font-medium text-foreground">
                      {us}
                    </td>
                    <td className="border-l border-border px-6 py-4 text-muted">
                      {generic}
                    </td>
                    <td className="border-l border-border px-6 py-4 text-muted">
                      {nothing}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FadeSection>

          {/* Mobile cards */}
          <FadeSection className="mt-10 space-y-4 sm:hidden">
            {[
              { feature: "Price", us: "$200/month", generic: "$599\u2013$1,499/mo", nothing: "$0 (for now)" },
              { feature: "Legal-specific content", us: "Yes", generic: "No", nothing: "No" },
              { feature: "Source URL extraction", us: "Yes", generic: "Partial", nothing: "No" },
              { feature: "Practice area prompts", us: "Yes", generic: "No", nothing: "No" },
              { feature: "Bar compliance review", us: "Yes", generic: "No", nothing: "No" },
              { feature: "Time to results", us: "30 days", generic: "90+ days", nothing: "Never" },
            ].map(({ feature, us, generic, nothing }) => (
              <div
                key={feature}
                className="rounded-lg border border-border bg-card p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted mb-3">
                  {feature}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-accent">
                      LegalSignal
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {us}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Generic GEO</span>
                    <span className="text-xs text-muted">{generic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Doing nothing</span>
                    <span className="text-xs text-muted">{nothing}</span>
                  </div>
                </div>
              </div>
            ))}
          </FadeSection>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="border-t border-border bg-bg-secondary py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Testimonials
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for firms like yours.
            </h2>
          </FadeSection>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "We went from invisible to the #1 recommended PI firm on Perplexity in Dallas. In six weeks.",
                author: "Managing Partner",
                firm: "Dallas Personal Injury Firm",
                initials: "MP",
                color: "#C9A84C",
              },
              {
                quote:
                  "Finally a tool that understands legal marketing — not just SEO rebadged as AI optimization.",
                author: "Marketing Director",
                firm: "Houston Trial Law Group",
                initials: "KR",
                color: "#60A5FA",
              },
              {
                quote:
                  "Our competitors don't know this exists yet. That's exactly where I want to be.",
                author: "Senior Partner",
                firm: "Los Angeles Family Law",
                initials: "JT",
                color: "#34D399",
              },
            ].map(({ quote, author, firm, initials, color }, i) => (
              <StaggerItem
                key={firm}
                index={i}
                className="flex flex-col rounded-lg border border-border bg-card p-8 transition-[border-color] duration-300 hover:border-accent/20"
              >
                {/* Pull quote mark */}
                <span className="font-display text-4xl leading-none text-accent/30 select-none">&ldquo;</span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-secondary">
                  {quote}
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      background: `color-mix(in oklch, ${color} 15%, var(--bg-card))`,
                      color: color,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {author}
                    </p>
                    <p className="text-xs text-muted">{firm}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-md px-6 text-center">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Pricing
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              One plan. One price.
            </h2>
            <p className="mt-3 text-secondary">
              Everything you need to own your AI search presence.
            </p>

            <div className="mt-12 rounded-lg border border-border bg-card p-10 text-left">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold text-foreground">
                  <span className="text-accent">$</span>200
                </span>
                <span className="text-lg text-muted">/month</span>
              </div>
              <p className="mt-2 text-xs text-muted">
                No contract. Cancel anytime.
              </p>

              <hr className="hr-gold my-8" />

              <ul className="space-y-3">
                {[
                  "AI visibility audit (weekly)",
                  "Bar-compliant content generation",
                  "Source URL extraction & mapping",
                  "Practice-area prompt library",
                  "Competitor tracking & gap analysis",
                  "Dedicated dashboard",
                  "Weekly email report",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-secondary"
                  >
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login?tab=signup"
                className="mt-10 flex w-full items-center justify-center rounded bg-accent py-3 text-sm font-semibold text-background hover:bg-accent-muted transition-colors duration-200 cursor-pointer"
              >
                Start Your Audit
              </Link>
              <p className="mt-4 text-center text-xs text-muted">
                ROI in 30 days or your money back.
              </p>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-border bg-bg-secondary py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-6">
          <FadeSection>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              Common questions
            </h2>
          </FadeSection>

          <div className="mt-12">
            <FAQItem
              question="What is Generative Engine Optimization (GEO)?"
              answer="GEO is the practice of optimizing your online presence so that AI search engines — like ChatGPT, Gemini, and Perplexity — recommend your firm when people ask legal questions. It's the AI equivalent of SEO."
            />
            <FAQItem
              question="How is this different from traditional SEO?"
              answer="SEO optimizes for Google's link-based rankings. GEO optimizes for AI-generated recommendations, which pull from different sources and use different ranking signals. Most SEO agencies aren't tracking or optimizing for this yet."
            />
            <FAQItem
              question="Which AI search engines do you monitor?"
              answer="We currently monitor ChatGPT (via OpenAI), Google Gemini, and Perplexity AI — the three dominant AI search platforms. We add new providers as they gain market share."
            />
            <FAQItem
              question="How long until I see results?"
              answer="Most firms see measurable improvements in AI visibility within 30 days. Your weekly reports will show score changes so you can track progress in real time."
            />
            <FAQItem
              question="Is the content you generate compliant with bar advertising rules?"
              answer="Yes. All generated content goes through a compliance review process designed around ABA Model Rules and state-specific advertising guidelines. We never make guarantees or use prohibited language."
            />
            <FAQItem
              question="Can I cancel anytime?"
              answer="Yes. There's no contract and no cancellation fee. If you don't see ROI within 30 days, we'll refund your first month."
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <FadeSection>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Stop being invisible.
            </h2>
            <p className="mt-4 text-secondary">
              Your competitors will find this eventually. Get there first.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login?tab=signup"
                className="rounded bg-accent px-7 py-3.5 text-sm font-semibold text-background hover:bg-accent-muted transition-colors duration-200 cursor-pointer"
              >
                Get Your Free AI Visibility Audit
              </Link>
              <a
                href="#pricing"
                className="text-sm text-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                View pricing &rarr;
              </a>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
          <span className="font-display text-sm font-semibold text-foreground">
            LegalSignal
          </span>
          <div className="flex gap-6 text-xs text-muted">
            <a href="#" className="hover:text-foreground transition-colors duration-200 cursor-pointer">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground transition-colors duration-200 cursor-pointer">
              Terms of Service
            </a>
          </div>
          <p className="text-xs text-muted">&copy; 2026 LegalSignal</p>
        </div>
      </footer>
    </div>
  );
}
