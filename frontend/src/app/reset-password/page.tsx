"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left branding panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-bg-secondary border-r border-border p-12 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.03]"
          style={{ fontFamily: "serif", fontSize: 80, lineHeight: 1.1, color: "var(--accent)" }}>
          {Array.from({ length: 80 }).map((_, i) => (
            <span key={i} style={{ display: "inline-block", margin: "0 12px" }}>§</span>
          ))}
        </div>

        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
          LegalSignal
        </Link>

        <div className="relative max-w-sm">
          <h2 className="font-display text-3xl font-semibold leading-snug text-foreground">
            Set a new password
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-secondary">
            Choose a strong password to keep your LegalSignal account secure.
          </p>
        </div>

        <div />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 block font-display text-lg font-semibold text-foreground lg:hidden">
            LegalSignal
          </Link>

          <h2 className="font-display text-xl font-semibold text-foreground">Reset your password</h2>
          <p className="mt-2 text-sm text-muted">Enter your new password below.</p>

          {error && (
            <div className="mt-5 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-xs text-error">
              {error}
            </div>
          )}

          {success ? (
            <div className="mt-6 rounded-md border border-accent/30 bg-accent/10 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Password updated</p>
              <p className="mt-1 text-xs text-secondary">
                Redirecting you to the dashboard...
              </p>
            </div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-secondary">New Password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 pr-10 text-sm text-foreground placeholder:text-muted"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-secondary">Confirm Password</label>
                <input
                  id="confirm-password"
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  className="input-gold h-11 w-full rounded-md border border-border bg-bg-input px-4 text-sm text-foreground placeholder:text-muted"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded bg-accent text-sm font-semibold text-background hover:bg-accent-muted transition-colors disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-6 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
