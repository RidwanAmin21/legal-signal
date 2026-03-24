import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
