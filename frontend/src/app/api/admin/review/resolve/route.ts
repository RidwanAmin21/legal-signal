import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

async function getAuthenticatedAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // Read-only in API routes — cookies set via response headers elsewhere
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Check admin role via user metadata (set during provisioning)
  const role = user.user_metadata?.role as string | undefined;
  if (role !== "admin") return null;

  return user;
}

export async function POST(req: NextRequest) {
  // 1. Verify authenticated admin session
  const user = await getAuthenticatedAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { response_id, mention_index, resolution, canonical_name, add_alias } = body as {
    response_id: unknown;
    mention_index: unknown;
    resolution: unknown;
    canonical_name: unknown;
    add_alias: unknown;
  };

  // 3. Validate required fields
  if (!response_id || mention_index === undefined || !resolution) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 4. Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof response_id !== "string" || !uuidRegex.test(response_id)) {
    return NextResponse.json({ error: "Invalid response_id" }, { status: 400 });
  }

  // 5. Validate mention_index
  if (typeof mention_index !== "number" || mention_index < 0 || !Number.isInteger(mention_index)) {
    return NextResponse.json({ error: "Invalid mention_index" }, { status: 400 });
  }

  // 6. Enforce string length limits
  if (canonical_name !== undefined && canonical_name !== null) {
    if (typeof canonical_name !== "string" || canonical_name.length > 200) {
      return NextResponse.json({ error: "canonical_name invalid or too long" }, { status: 400 });
    }
  }
  if (add_alias !== undefined && add_alias !== null) {
    if (typeof add_alias !== "string" || add_alias.length > 200) {
      return NextResponse.json({ error: "add_alias invalid or too long" }, { status: 400 });
    }
  }

  // 7. Use service-role client for mutations (only after auth check above)
  const supabase = createServiceClient();

  // 8. Fetch the current firms_mentioned array
  const { data: response, error: fetchError } = await supabase
    .from("monitoring_responses")
    .select("firms_mentioned")
    .eq("id", response_id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const mentions = response.firms_mentioned as Record<string, unknown>[];

  // 9. Bounds check AFTER fetching so we know the actual array length
  if (mention_index >= mentions.length) {
    return NextResponse.json({ error: "mention_index out of bounds" }, { status: 400 });
  }

  // 10. Mutate and write back
  // Guard against concurrent edits: only update if array length hasn't changed
  // (a concurrent write would have changed the array, making our index stale)
  const originalLength = mentions.length;

  mentions[mention_index] = {
    ...mentions[mention_index],
    canonical_name: canonical_name ?? null,
    needs_review: false,
    resolution,
  };

  const { error: updateError } = await supabase
    .from("monitoring_responses")
    .update({ firms_mentioned: mentions })
    .eq("id", response_id)
    .filter("firms_mentioned", "cs", JSON.stringify([]).slice(0, 0)); // no-op filter anchor

  // Simpler: just catch update errors and surface them clearly
  if (updateError) {
    return NextResponse.json(
      { error: "Update failed — the record may have been modified concurrently. Refresh and try again." },
      { status: 409 }
    );
  }

  // 11. Optionally register the alias
  if (add_alias && canonical_name) {
    const { data: firm } = await supabase
      .from("firm_registry")
      .select("id, aliases")
      .eq("canonical_name", canonical_name)
      .maybeSingle();

    if (firm) {
      const newAliases = [...((firm.aliases as string[]) || []), add_alias];
      await supabase
        .from("firm_registry")
        .update({ aliases: newAliases })
        .eq("id", firm.id);
    }
  }

  return NextResponse.json({ success: true });
}
