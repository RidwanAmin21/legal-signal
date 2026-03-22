"use client";
import Nav from "@/components/Nav";
import CompetitorTable from "@/components/CompetitorTable";
import { useScores } from "@/hooks/useScores";
import { useCompetitors } from "@/hooks/useCompetitors";

const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "";

export default function CompetitorsPage() {
  const { data: scores, isLoading: scoresLoading } = useScores(CLIENT_ID);
  const { data: competitors, isLoading: compsLoading, error } = useCompetitors(CLIENT_ID);

  const current = scores?.[0];
  const isLoading = scoresLoading || compsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-foreground">Competitors</h1>
        <p className="mt-1 text-sm text-muted">
          AI search visibility rankings across your market
        </p>

        {isLoading && (
          <div className="mt-10 text-center text-sm text-muted">Loading...</div>
        )}

        {error && (
          <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load competitors: {error.message}
          </div>
        )}

        {!isLoading && !error && (
          <div className="mt-8">
            <CompetitorTable
              competitors={competitors ?? []}
              clientFirmName={undefined}
              clientScore={current?.overall_score}
            />
          </div>
        )}
      </main>
    </div>
  );
}
