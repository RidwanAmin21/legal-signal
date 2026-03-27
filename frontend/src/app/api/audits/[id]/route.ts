import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { internalError } from "@/lib/api-errors";
import { getAuthContext } from "@/lib/auth-context";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const log = createApiLogger(req, `/api/audits/${params.id}`);
  const auth = await getAuthContext(req);
  if (!auth.ok) {
    log.warn("Auth failed");
    log.done(401);
    return auth.response;
  }

  const { clientId } = auth.ctx;
  log.setUser(auth.ctx.user.id, clientId);

  const db = createServiceClient();

  const { data: run, error: runError } = await db
    .from("monitoring_runs")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", clientId)
    .single();

  if (runError || !run) {
    log.warn("Audit not found or access denied", {
      auditId: params.id,
      dbError: runError?.message,
    });
    log.done(404);
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const [{ data: score, error: scoreError }, { data: responses, error: responsesError }] = await Promise.all([
    db
      .from("visibility_scores")
      .select("*")
      .eq("run_id", params.id)
      .single(),
    db
      .from("monitoring_responses")
      .select("id, platform, firms_mentioned, citations, prompts(text)")
      .eq("run_id", params.id)
      .order("created_at"),
  ]);

  if (scoreError) {
    log.debug("No visibility score found for audit run", { auditId: params.id });
  }
  if (responsesError) {
    return internalError(responsesError, "audit-detail-responses", log);
  }

  log.info("Audit detail fetched", {
    auditId: params.id,
    hasScore: !!score,
    responseCount: responses?.length ?? 0,
  });
  log.done(200);
  return NextResponse.json({ run, score: score ?? null, responses: responses ?? [] });
}
