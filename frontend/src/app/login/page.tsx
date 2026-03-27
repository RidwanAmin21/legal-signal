"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [tab, setTab] = useState<"signin" | "signup">(
    params.get("tab") === "signup" ? "signup" : "signin"
  );
  const [showPass, setShowPass] = useState(false);

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign-up extra fields
  const [firmName, setFirmName] = useState("");
  const [fullName, setFullName] = useState("");

  // Forgot password state
  const [mode, setMode] = useState<"default" | "forgot">("default");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      router.push(next);
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Step 1: Server-side provisioning (creates auth user + client + user_clients + app_metadata)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, firmName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Signup failed");
      setLoading(false);
      return;
    }

    // Step 2: Establish browser session
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    // Force a fresh JWT so app_metadata (client_id, role) is included
    await supabase.auth.refreshSession();

    setLoading(false);
    // Full navigation ensures cookies are committed before the next page loads
    window.location.href = "/onboarding";
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Left branding panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-bg-secondary border-r border-border p-12 overflow-hidden">
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
            &ldquo;Firms using GEO see 3.2× more AI referrals within 90 days.&rdquo;
          </p>
          <p className="mt-2 text-xs text-accent">— LegalSignal client data, 2026</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          <Link href="/" className="mb-10 block font-display text-lg font-semibold text-foreground lg:hidden">
            LegalSignal
          </Link>

          {mode === "forgot" ? (
            /* ── Forgot Password Form ── */
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Reset your password</h2>
              <p className="mt-2 text-sm text-muted">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="mt-5 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                  {error}
                </div>
              )}

              {resetSent ? (
                <div className="mt-6 rounded-md border border-accent/30 bg-accent/10 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Check your email</p>
                  <p className="mt-1 text-xs text-secondary">
                    We sent a password reset link to <strong>{resetEmail}</strong>.
                    Click the link in the email to set a new password.
                  </p>
                </div>
              ) : (
                <form className="mt-6 space-y-5" onSubmit={handleForgotPassword}>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@yourfirm.com"
                      required
                      className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors disabled:opacity-60"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setMode("default"); setError(""); setResetSent(false); }}
                className="mt-6 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to sign in
              </button>
            </div>
          ) : (
            /* ── Sign In / Sign Up Forms ── */
            <>
              {/* Tab toggle */}
              <div className="mb-8 flex border-b border-border">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(""); }}
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

              {/* Error message */}
              {error && (
                <div className="mb-5 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
                  {error}
                </div>
              )}

              {tab === "signin" ? (
                <form className="space-y-5" onSubmit={handleSignIn}>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourfirm.com"
                      required
                      className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-secondary">Password</label>
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setError(""); setResetEmail(email); }}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
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
                    disabled={loading}
                    className="mt-2 h-11 w-full rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              ) : (
                <form className="space-y-5" onSubmit={handleSignUp}>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Firm Name</label>
                    <input type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)}
                      placeholder="Mullen & Mullen Law Firm" required
                      className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Shane Mullen" required
                      className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourfirm.com" required
                      className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-secondary">Password</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters" required minLength={8}
                        className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="mt-2 h-11 w-full rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors disabled:opacity-60">
                    {loading ? "Creating account..." : "Create Your Account"}
                  </button>
                </form>
              )}

              <p className="mt-8 text-center text-xs text-muted">
                By continuing, you agree to our{" "}
                <a href="#" className="text-secondary hover:text-foreground transition-colors">Terms</a>{" "}
                and{" "}
                <a href="#" className="text-secondary hover:text-foreground transition-colors">Privacy Policy</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
