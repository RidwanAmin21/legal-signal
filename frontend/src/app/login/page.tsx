"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"signin" | "signup">(
    params.get("tab") === "signup" ? "signup" : "signin"
  );
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Left branding panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-bg-secondary border-r border-border p-12 overflow-hidden">
        {/* Subtle § symbols texture */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.03]"
          style={{ fontFamily: "serif", fontSize: 80, lineHeight: 1.1, color: "#C9A84C" }}>
          {Array.from({ length: 80 }).map((_, i) => (
            <span key={i} style={{ display: "inline-block", margin: "0 12px" }}>§</span>
          ))}
        </div>

        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
          LegalSignal
        </Link>

        <div className="relative max-w-sm">
          <h2 className="font-display text-3xl font-semibold leading-snug text-foreground">
            AI is the new front page.
            <br />
            <span className="text-accent">Make sure your firm is on it.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-secondary">
            LegalSignal audits your AI search visibility, extracts citation sources, and generates
            bar-compliant content that gets your firm recommended by ChatGPT, Perplexity, and Gemini.
          </p>
        </div>

        <div className="relative rounded-lg border border-border bg-bg-card px-5 py-4">
          <p className="text-xs text-muted">Recent result</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            "Firms using GEO see 3.2× more AI referrals within 90 days."
          </p>
          <p className="mt-2 text-xs text-accent">— LegalSignal client data, 2026</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link href="/" className="mb-10 block font-display text-lg font-semibold text-foreground lg:hidden">
            LegalSignal
          </Link>

          {/* Tab toggle */}
          <div className="mb-8 flex border-b border-border">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 pr-6 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-b-2 border-accent text-foreground"
                    : "text-muted hover:text-secondary"
                }`}
                style={{ marginBottom: -1 }}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {tab === "signin" ? (
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Email</label>
                <input
                  type="email"
                  placeholder="you@yourfirm.com"
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-secondary">Password</label>
                  <a href="#" className="text-xs text-muted hover:text-foreground transition-colors">Forgot password?</a>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="mt-2 h-11 w-full rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors"
              >
                Sign In
              </button>
              <div className="relative my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Firm Name</label>
                <input type="text" placeholder="Mullen & Mullen Law Firm"
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Full Name</label>
                <input type="text" placeholder="Shane Mullen"
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Email</label>
                <input type="email" placeholder="you@yourfirm.com"
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-secondary">Password</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} placeholder="Min. 8 characters"
                    className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <button type="submit"
                className="mt-2 h-11 w-full rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors">
                Create Your Account
              </button>
              <div className="relative my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" /><span className="text-xs text-muted">or</span><div className="h-px flex-1 bg-border" />
              </div>
              <button type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border text-sm text-secondary hover:border-secondary hover:text-foreground transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-muted">
            By continuing, you agree to our{" "}
            <a href="#" className="text-secondary hover:text-foreground transition-colors">Terms</a>{" "}
            and{" "}
            <a href="#" className="text-secondary hover:text-foreground transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
