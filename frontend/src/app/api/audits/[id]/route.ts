import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = user.user_metadata?.client_id as string | undefined;
  if (!clientId) {
    return NextResponse.json({ error: "No client associated with this account" }, { status: 404 });
  }

  const db = createServiceClient();

  const { data: run, error: runError } = await db
    .from("monitoring_runs")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", clientId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const [{ data: score }, { data: responses }] = await Promise.all([
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

  return NextResponse.json({ run, score: score ?? null, responses: responses ?? [] });
}
