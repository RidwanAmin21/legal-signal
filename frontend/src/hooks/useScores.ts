"use client";
import { createClient } from "@/lib/supabase-browser";
import { useQuery } from "@tanstack/react-query";
import type { VisibilityScore } from "@/lib/types";

export function useScores(clientId: string) {
  return useQuery<VisibilityScore[]>({
    queryKey: ["scores", clientId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("visibility_scores")
        .select("*")
        .eq("client_id", clientId)
        .order("week_date", { ascending: false })
        .limit(12);

      if (error) throw new Error(error.message);
      return (data ?? []) as VisibilityScore[];
    },
    enabled: !!clientId,
  });
}
