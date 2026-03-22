"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface RawMention {
  firm_name: string;
  canonical_name: string | null;
  confidence: number;
  needs_review: boolean;
  position: number;
  sentiment: string;
}

interface ReviewRow {
  responseId: string;
  mentionIndex: number;
  firmName: string;
  suggestedCanonical: string | null;
  confidence: number;
  platform: string;
}

interface ReviewQueueProps {
  clientId: string;
}

export default function ReviewQueue({ clientId }: ReviewQueueProps) {
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<ReviewRow[]>({
    queryKey: ["review", clientId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("monitoring_responses")
        .select("id, platform, firms_mentioned")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      const rows: ReviewRow[] = [];
      for (const resp of data ?? []) {
        const mentions = (resp.firms_mentioned ?? []) as RawMention[];
        mentions.forEach((m, idx) => {
          if (m.needs_review) {
            rows.push({
              responseId: resp.id,
              mentionIndex: idx,
              firmName: m.firm_name,
              suggestedCanonical: m.canonical_name,
              confidence: m.confidence,
              platform: resp.platform,
            });
          }
        });
      }
      return rows;
    },
    enabled: !!clientId,
  });

  const resolve = useMutation({
    mutationFn: async ({
      responseId,
      mentionIndex,
      resolution,
      canonicalName,
      addAlias,
    }: {
      responseId: string;
      mentionIndex: number;
      resolution: string;
      canonicalName: string | null;
      addAlias?: string;
    }) => {
      const res = await fetch("/api/admin/review/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_id: responseId,
          mention_index: mentionIndex,
          resolution,
          canonical_name: canonicalName,
          add_alias: addAlias,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Resolve failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review", clientId] });
    },
  });

  const handleApprove = (item: ReviewRow) => {
    const key = `${item.responseId}-${item.mentionIndex}`;
    setResolving(key);
    resolve.mutate(
      {
        responseId: item.responseId,
        mentionIndex: item.mentionIndex,
        resolution: "approved",
        canonicalName: item.suggestedCanonical,
        addAlias: item.firmName !== item.suggestedCanonical ? item.firmName : undefined,
      },
      { onSettled: () => setResolving(null) }
    );
  };

  const handleReject = (item: ReviewRow) => {
    const key = `${item.responseId}-${item.mentionIndex}`;
    setResolving(key);
    resolve.mutate(
      {
        responseId: item.responseId,
        mentionIndex: item.mentionIndex,
        resolution: "rejected",
        canonicalName: null,
      },
      { onSettled: () => setResolving(null) }
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        Loading review queue...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        No items to review.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
              Raw Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
              Suggested Match
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted w-24">
              Confidence
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted w-28">
              Platform
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted w-36">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const key = `${item.responseId}-${item.mentionIndex}`;
            const busy = resolving === key;
            return (
              <tr key={key} className="border-b border-border last:border-0 hover:bg-background/40">
                <td className="px-4 py-3 text-foreground font-medium">{item.firmName}</td>
                <td className="px-4 py-3 text-muted">
                  {item.suggestedCanonical ?? (
                    <span className="italic text-muted/60">No match found</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold ${
                      item.confidence >= 0.85
                        ? "text-green-600"
                        : item.confidence >= 0.65
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-border px-2 py-0.5 text-xs text-muted capitalize">
                    {item.platform}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={busy || !item.suggestedCanonical}
                      className="rounded px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 transition-colors"
                    >
                      {busy ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      disabled={busy}
                      className="rounded px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition-colors"
                    >
                      {busy ? "..." : "Reject"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
