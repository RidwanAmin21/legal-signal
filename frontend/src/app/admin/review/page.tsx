"use client";
import DashboardLayout from "@/components/DashboardLayout";
import ReviewQueue from "@/components/ReviewQueue";
import { useClientId } from "@/hooks/useClientId";

export default function ReviewPage() {
  const { clientId, loading } = useClientId();

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Review Queue</h1>
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
        </div>
      </div>
    </DashboardLayout>
  );
}
