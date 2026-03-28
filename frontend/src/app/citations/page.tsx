"use client";
import DashboardLayout from "@/components/DashboardLayout";
import EmptyState from "@/components/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/hooks/useClientId";
import LoadingScreen, { useMinLoadingDuration } from "@/components/LoadingScreen";

export default function CitationsPage() {
  const { clientId, loading: clientLoading } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: async () => {
      const res = await fetch("/api/client");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  const firmName = client?.firm_name ?? "Your Firm";

  const showLoading = useMinLoadingDuration(clientLoading);

  if (showLoading) {
    return (
      <DashboardLayout firmName={firmName}>
        <LoadingScreen message="Loading citations\u2026" fullScreen={false} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Citations</h1>
          <p className="mt-1 text-sm text-muted">Sources AI engines cite when recommending firms in your market.</p>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon="citations"
            title="Citation tracking coming soon"
            description="This feature will show which URLs AI engines cite when answering legal queries in your market, and whether your firm has content on those sources."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
