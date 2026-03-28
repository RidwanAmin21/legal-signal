"use client";
import { useEffect, useState } from "react";

const STEPS = [
  { label: "Querying ChatGPT",      engine: "G",  duration: 3000 },
  { label: "Querying Perplexity",   engine: "P",  duration: 4000 },
  { label: "Querying Gemini",       engine: "Ge", duration: 3500 },
  { label: "Extracting firm mentions",   engine: null, duration: 2000 },
  { label: "Resolving entity names",     engine: null, duration: 1500 },
  { label: "Computing visibility score", engine: null, duration: 1000 },
];

interface AuditLoadingStateProps {
  onComplete?: () => void;
}

export default function AuditLoadingState({ onComplete }: AuditLoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((prev) => prev + 1);
    }, STEPS[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  const progress = Math.round((completedSteps.length / STEPS.length) * 100);
  const isDone = completedSteps.length === STEPS.length;

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-8 py-16">
      {/* Score ring placeholder */}
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="48" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="56" cy="56" r="48"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 48}`}
            strokeDashoffset={`${2 * Math.PI * 48 * (1 - progress / 100)}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="text-center">
          {isDone ? (
            <span className="font-display text-3xl font-semibold text-accent">34</span>
          ) : (
            <span className="font-mono text-xl font-semibold text-foreground">{progress}%</span>
          )}
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold text-foreground">
        {isDone ? "Audit complete" : "Running your AI audit…"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {isDone
          ? "Your AI Visibility Score is ready."
          : "Querying real AI engines in real time. This takes 2–3 minutes."
        }
      </p>

      {/* Progress bar */}
      <div className="mt-8 w-full max-w-sm">
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="mt-8 w-full max-w-sm space-y-2">
        {STEPS.map((step, i) => {
          const completed = completedSteps.includes(i);
          const active = currentStep === i;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                active ? "bg-accent/5 border border-accent/20" : ""
              }`}
            >
              {/* Status indicator */}
              <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                completed
                  ? "border-success bg-success/10 text-success"
                  : active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted"
              }`}>
                {completed ? (
                  "✓"
                ) : active ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
                ) : (
                  step.engine ?? "·"
                )}
              </div>

              {/* Label */}
              <span className={`text-xs transition-colors ${
                completed ? "text-secondary line-through" : active ? "text-foreground font-medium" : "text-muted"
              }`}>
                {step.label}
              </span>

              {/* Engine badge */}
              {step.engine && active && (
                <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded bg-border text-[9px] font-bold text-muted">
                  {step.engine}
                </span>
              )}

              {/* Spinner on active */}
              {active && !completed && (
                <span className={`${step.engine ? "" : "ml-auto"} inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin`} />
              )}
            </div>
          );
        })}
      </div>

      {isDone && (
        <button className="mt-8 rounded bg-accent px-6 py-2.5 text-sm font-semibold text-background hover:bg-accent-muted transition-colors">
          View Results →
        </button>
      )}
    </div>
  );
}
