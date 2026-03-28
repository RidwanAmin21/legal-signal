"use client";
import DashboardLayout from "@/components/DashboardLayout";
import EmptyState from "@/components/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/hooks/useClientId";
import LoadingScreen, { useMinLoadingDuration } from "@/components/LoadingScreen";

export default function ContentPage() {
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
        <LoadingScreen message="Loading content\u2026" fullScreen={false} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout firmName={firmName}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Content Queue</h1>
          <p className="mt-1 text-sm text-muted">AI-generated, bar-compliant content ready to publish.</p>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon="content"
            title="Content generation coming soon"
            description="After each audit, LegalSignal will generate bar-compliant content targeting the queries where your firm isn't being mentioned. Content will appear here for review before publishing."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
