import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { internalError } from "@/lib/api-errors";
import { getAuthContext } from "@/lib/auth-context";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const log = createApiLogger(req, "/api/audits");
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

  // Admin can access any client; members can only access their own
  if (auth.ctx.role !== "admin" && auth.ctx.clientId !== clientId) {
    log.warn("Forbidden: user attempted to access another client's audits", {
      requestedClientId: clientId,
    });
    log.done(403);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();

  const { data: runs, error: runsError } = await db
    .from("monitoring_runs")
    .select("id, status, started_at, completed_at, prompts_sent, responses_received, mentions_extracted, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (runsError) return internalError(runsError, "audits", log);
  if (!runs || runs.length === 0) {
    log.info("No audit runs found", { clientId });
    log.done(200);
    return NextResponse.json([]);
  }

  const runIds = runs.map((r) => r.id);
  const { data: scores } = await db
    .from("visibility_scores")
    .select("run_id, overall_score, week_date")
    .in("run_id", runIds);

  const scoreMap: Record<string, { overall_score: number; week_date: string }> = {};
  for (const s of scores ?? []) {
    scoreMap[s.run_id] = { overall_score: s.overall_score, week_date: s.week_date };
  }

  const result = runs.map((run) => ({
    ...run,
    overall_score: scoreMap[run.id]?.overall_score ?? null,
    week_date: scoreMap[run.id]?.week_date ?? null,
    prev_score: null as number | null,
  }));

  for (let i = 0; i < result.length; i++) {
    result[i].prev_score = result[i + 1]?.overall_score ?? null;
  }

  log.info("Audits fetched", {
    clientId,
    runCount: result.length,
    runsWithScores: Object.keys(scoreMap).length,
  });
  log.done(200);
  return NextResponse.json(result);
}
