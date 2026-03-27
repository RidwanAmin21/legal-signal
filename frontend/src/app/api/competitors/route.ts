import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { internalError } from "@/lib/api-errors";
import { getAuthContext } from "@/lib/auth-context";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const log = createApiLogger(req, "/api/competitors");
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    log.warn("Missing client_id parameter");
    log.done(400);
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const auth = await getAuthContext(req);
  if (!auth.ok) {
    log.warn("Auth failed");
    log.done(401);
    return auth.response;
  }

  log.setUser(auth.ctx.user.id, auth.ctx.clientId);

  if (auth.ctx.role !== "admin" && auth.ctx.clientId !== clientId) {
    log.warn("Forbidden: user attempted to access another client's competitors", {
      requestedClientId: clientId,
    });
    log.done(403);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("visibility_scores")
    .select("competitor_scores")
    .eq("client_id", clientId)
    .order("week_date", { ascending: false })
    .limit(4);

  if (error) return internalError(error, "competitors", log);

  const latestScores: Record<string, number> = {};
  for (const row of [...(data ?? [])].reverse()) {
    const scores = row.competitor_scores as Record<string, number> | null;
    if (!scores) continue;
    for (const [name, score] of Object.entries(scores)) {
      latestScores[name] = score;
    }
  }

  const competitors = Object.entries(latestScores)
    .map(([canonical_name, score]) => ({ canonical_name, score, mention_count: 0, mention_rate: 0, platforms: {} }))
    .sort((a, b) => b.score - a.score);

  log.info("Competitors fetched", {
    clientId,
    weeksFetched: data?.length ?? 0,
    competitorCount: competitors.length,
  });
  log.done(200);
  return NextResponse.json(competitors);
}
