"use client";
import { useQuery } from "@tanstack/react-query";
import type { VisibilityScore } from "@/lib/types";

export function useScores(clientId: string) {
  return useQuery<VisibilityScore[]>({
    queryKey: ["scores", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/scores?client_id=${encodeURIComponent(clientId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    enabled: !!clientId,
  });
}
