"use client";
import Nav from "@/components/Nav";
import ReviewQueue from "@/components/ReviewQueue";
import { useClientId } from "@/hooks/useClientId";

export default function ReviewPage() {
  const { clientId, loading } = useClientId();

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-foreground">Review Queue</h1>
        <p className="mt-1 text-sm text-muted">
          Firm mentions that need manual resolution before they count toward scores
        </p>
        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <ReviewQueue clientId={clientId} />
          )}
        </div>
      </main>
    </div>
  );
}
