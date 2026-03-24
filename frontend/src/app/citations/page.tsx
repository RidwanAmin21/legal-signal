"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { useClientId } from "@/hooks/useClientId";

export default function CitationsPage() {
  const { clientId } = useClientId();

  const { data: client } = useQuery({
    queryKey: ["client"],
    queryFn: async () => {
      const res = await fetch("/api/client");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  return (
    <DashboardLayout firmName={client?.firm_name ?? "Your Firm"}>
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">Citations</h1>
          <p className="mt-1 text-sm text-muted">Sources AI engines cite when recommending firms in your market.</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-bg-card py-24 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-border">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Citation tracking coming soon</p>
          <p className="mt-2 max-w-sm text-xs text-muted leading-relaxed">
            This feature will show which URLs AI engines cite when answering legal queries in your market,
            and whether your firm has content on those sources.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
