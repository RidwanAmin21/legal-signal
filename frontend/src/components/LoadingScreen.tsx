"use client";
import { useEffect, useRef, useState } from "react";

const MIN_DISPLAY_MS = 900;

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message,
  fullScreen = true,
}: LoadingScreenProps) {
  const wrapperClass = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    : "flex flex-col items-center justify-center py-24";

  return (
    <div className={`${wrapperClass} animate-fade-in-up`}>
      {/* Wordmark with shimmer */}
      <div className="relative select-none">
        <span className="font-display text-3xl font-semibold tracking-tight text-foreground/20">
          LegalSignal
        </span>
        <span
          className="loading-shimmer pointer-events-none absolute inset-0 font-display text-3xl font-semibold tracking-tight"
          aria-hidden="true"
        >
          LegalSignal
        </span>
      </div>

      {/* Bouncing dots */}
      <div className="mt-6 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="loading-dot inline-block h-1.5 w-1.5 rounded-full bg-accent"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>

      {/* Optional message */}
      {message && (
        <p className="mt-5 text-sm text-muted">{message}</p>
      )}
    </div>
  );
}

/**
 * Keeps a loading boolean `true` for at least `minMs` so the loading
 * animation has time to be perceived, then fades out gracefully.
 */
export function useMinLoadingDuration(isLoading: boolean, minMs = MIN_DISPLAY_MS): boolean {
  const [visible, setVisible] = useState(isLoading);
  const showAtRef = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      showAtRef.current = Date.now();
      setVisible(true);
      return;
    }

    if (showAtRef.current === null) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - showAtRef.current;
    const remaining = Math.max(0, minMs - elapsed);

    const timer = setTimeout(() => {
      setVisible(false);
      showAtRef.current = null;
    }, remaining);

    return () => clearTimeout(timer);
  }, [isLoading, minMs]);

  return visible;
}
