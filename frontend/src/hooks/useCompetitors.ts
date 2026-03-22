"use client";
import { useQuery } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase-browser";
import type { Competitor } from "@/lib/types";

export function useCompetitors(clientId: string) {
  return useQuery<Competitor[]>({
    queryKey: ["competitors", clientId],
    queryFn: async () => {
      const supabase = createBrowserClient();

      // Fetch the 4 most recent scores to aggregate competitor data
      const { data, error } = await supabase
        .from("visibility_scores")
        .select("competitor_scores")
        .eq("client_id", clientId)
        .order("week_date", { ascending: false })
        .limit(4);

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];

      // Aggregate scores across recent weeks — use the latest score per firm
      const latestScores: Record<string, number> = {};
      // Iterate oldest-to-newest so the most recent score wins
      for (const row of [...data].reverse()) {
        const scores = row.competitor_scores as Record<string, number> | null;
        if (!scores) continue;
        for (const [name, score] of Object.entries(scores)) {
          latestScores[name] = score;
        }
      }

      return Object.entries(latestScores)
        .map(([canonical_name, score]) => ({
          canonical_name,
          score,
          mention_count: 0,
          mention_rate: 0,
          platforms: {},
        }))
        .sort((a, b) => b.score - a.score);
    },
    enabled: !!clientId,
  });
}
