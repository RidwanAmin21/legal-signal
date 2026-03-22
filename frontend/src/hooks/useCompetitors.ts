"use client";
import { useQuery } from "@tanstack/react-query";
import type { Competitor } from "@/lib/types";

export function useCompetitors(clientId: string) {
  return useQuery<Competitor[]>({
    queryKey: ["competitors", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/competitors?client_id=${encodeURIComponent(clientId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    enabled: !!clientId,
  });
}
