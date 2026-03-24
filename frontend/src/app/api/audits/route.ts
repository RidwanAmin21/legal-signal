import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClientId = user.user_metadata?.client_id as string | undefined;
  const role = user.user_metadata?.role as string | undefined;
  if (role !== "admin" && userClientId !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();

  const { data: runs, error: runsError } = await db
    .from("monitoring_runs")
    .select("id, status, started_at, completed_at, prompts_sent, responses_received, mentions_extracted, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });
  if (!runs || runs.length === 0) return NextResponse.json([]);

  const runIds = runs.map((r) => r.id);
  const { data: scores } = await db
    .from("visibility_scores")
    .select("run_id, overall_score, week_date")
    .in("run_id", runIds);

  const scoreMap: Record<string, { overall_score: number; week_date: string }> = {};
  for (const s of scores ?? []) {
    scoreMap[s.run_id] = { overall_score: s.overall_score, week_date: s.week_date };
  }

  const result = runs.map((run, i) => ({
    ...run,
    overall_score: scoreMap[run.id]?.overall_score ?? null,
    week_date: scoreMap[run.id]?.week_date ?? null,
    prev_score: null as number | null,
  }));

  // Attach previous score for delta display
  for (let i = 0; i < result.length; i++) {
    result[i].prev_score = result[i + 1]?.overall_score ?? null;
  }

  return NextResponse.json(result);
}
