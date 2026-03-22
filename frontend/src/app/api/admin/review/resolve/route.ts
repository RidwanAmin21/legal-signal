import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { response_id, mention_index, resolution, canonical_name, add_alias } = body;

  if (!response_id || mention_index === undefined || !resolution) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Fetch the current firms_mentioned array
  const { data: response, error: fetchError } = await supabase
    .from("monitoring_responses")
    .select("firms_mentioned")
    .eq("id", response_id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // 2. Mutate the specific mention in-memory, then write back the full array
  const mentions = response.firms_mentioned as any[];
  if (mentions[mention_index]) {
    mentions[mention_index].canonical_name = canonical_name;
    mentions[mention_index].needs_review = false;
    mentions[mention_index].resolution = resolution;
  }

  const { error: updateError } = await supabase
    .from("monitoring_responses")
    .update({ firms_mentioned: mentions })
    .eq("id", response_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 3. Optionally add the raw name as an alias on the registry firm
  if (add_alias && canonical_name) {
    const { data: firm } = await supabase
      .from("firm_registry")
      .select("id, aliases")
      .eq("canonical_name", canonical_name)
      .maybeSingle();

    if (firm) {
      const newAliases = [...(firm.aliases || []), add_alias];
      await supabase
        .from("firm_registry")
        .update({ aliases: newAliases })
        .eq("id", firm.id);
    }
  }

  return NextResponse.json({ success: true });
}
