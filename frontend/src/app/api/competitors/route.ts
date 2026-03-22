import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  // Verify authenticated session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the user owns this client_id
  const userClientId = user.user_metadata?.client_id as string | undefined;
  const role = user.user_metadata?.role as string | undefined;
  if (role !== "admin" && userClientId !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("visibility_scores")
    .select("competitor_scores")
    .eq("client_id", clientId)
    .order("week_date", { ascending: false })
    .limit(4);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate: use the most recent score per firm
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

  return NextResponse.json(competitors);
}
