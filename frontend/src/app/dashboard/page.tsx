"use client";
import Nav from "@/components/Nav";
import ScoreCard from "@/components/ScoreCard";
import TrendChart from "@/components/TrendChart";
import PlatformBreakdown from "@/components/PlatformBreakdown";
import { useScores } from "@/hooks/useScores";

const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "";

export default function DashboardPage() {
  const { data: scores, isLoading, error } = useScores(CLIENT_ID);

  const current = scores?.[0];
  const previous = scores?.[1];

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">AI search visibility — weekly snapshot</p>

        {isLoading && (
          <div className="mt-10 text-center text-sm text-muted">Loading...</div>
        )}

        {error && (
          <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load scores: {error.message}
          </div>
        )}

        {!isLoading && !error && !current && (
          <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center text-sm text-muted">
            No data yet. Run the pipeline to generate your first visibility score.
          </div>
        )}

        {current && (
          <div className="mt-8 space-y-6">
            <ScoreCard current={current} previous={previous} />
            <PlatformBreakdown current={current} previous={previous} />
            <TrendChart scores={scores ?? []} />
          </div>
        )}
      </main>
    </div>
  );
}
