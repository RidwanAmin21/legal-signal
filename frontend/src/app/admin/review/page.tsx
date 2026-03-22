"use client";
import Nav from "@/components/Nav";
import ReviewQueue from "@/components/ReviewQueue";

const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? "";

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-foreground">Review Queue</h1>
        <p className="mt-1 text-sm text-muted">
          Firm mentions that need manual resolution before they count toward scores
        </p>
        <div className="mt-8">
          <ReviewQueue clientId={CLIENT_ID} />
        </div>
      </main>
    </div>
  );
}
