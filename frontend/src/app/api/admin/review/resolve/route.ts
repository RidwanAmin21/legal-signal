import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { internalError } from "@/lib/api-errors";
import { requireAdmin } from "@/lib/auth-context";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const log = createApiLogger(req, "/api/admin/review/resolve");
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    log.warn("Admin auth failed");
    log.done(403);
    return auth.response;
  }

  const { clientId } = auth.ctx;
  log.setUser(auth.ctx.user.id, clientId);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    log.warn("Invalid JSON body");
    log.done(400);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { response_id, mention_index, resolution, canonical_name, add_alias } = body as {
    response_id: unknown;
    mention_index: unknown;
    resolution: unknown;
    canonical_name: unknown;
    add_alias: unknown;
  };

  if (!response_id || mention_index === undefined || !resolution) {
    log.warn("Missing required fields", { response_id, mention_index, resolution });
    log.done(400);
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof response_id !== "string" || !uuidRegex.test(response_id)) {
    log.warn("Invalid response_id format", { response_id });
    log.done(400);
    return NextResponse.json({ error: "Invalid response_id" }, { status: 400 });
  }

  if (typeof mention_index !== "number" || mention_index < 0 || !Number.isInteger(mention_index)) {
    log.warn("Invalid mention_index", { mention_index });
    log.done(400);
    return NextResponse.json({ error: "Invalid mention_index" }, { status: 400 });
  }

  if (canonical_name !== undefined && canonical_name !== null) {
    if (typeof canonical_name !== "string" || canonical_name.length > 200) {
      log.warn("canonical_name invalid or too long", { canonical_name });
      log.done(400);
      return NextResponse.json({ error: "canonical_name invalid or too long" }, { status: 400 });
    }
  }
  if (add_alias !== undefined && add_alias !== null) {
    if (typeof add_alias !== "string" || add_alias.length > 200) {
      log.warn("add_alias invalid or too long");
      log.done(400);
      return NextResponse.json({ error: "add_alias invalid or too long" }, { status: 400 });
    }
  }

  const supabase = createServiceClient();

  const { data: response, error: fetchError } = await supabase
    .from("monitoring_responses")
    .select("firms_mentioned, client_id")
    .eq("id", response_id)
    .single();

  if (fetchError) return internalError(fetchError, "admin/resolve", log);

  if (clientId && response.client_id !== clientId) {
    log.warn("Forbidden: admin tried to resolve mention for another client", {
      responseClientId: response.client_id,
    });
    log.done(403);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mentions = response.firms_mentioned as Record<string, unknown>[];

  if (mention_index >= mentions.length) {
    log.warn("mention_index out of bounds", {
      mention_index,
      mentionsLength: mentions.length,
    });
    log.done(400);
    return NextResponse.json({ error: "mention_index out of bounds" }, { status: 400 });
  }

  const previousMention = { ...mentions[mention_index as number] };
  mentions[mention_index as number] = {
    ...mentions[mention_index as number],
    canonical_name: canonical_name ?? null,
    needs_review: false,
    resolution,
  };

  const { error: updateError } = await supabase
    .from("monitoring_responses")
    .update({ firms_mentioned: mentions })
    .eq("id", response_id);

  if (updateError) {
    log.error("Concurrent update conflict", {
      response_id,
      updateError: updateError.message,
    });
    log.done(409);
    return NextResponse.json(
      { error: "Update failed — the record may have been modified concurrently. Refresh and try again." },
      { status: 409 }
    );
  }

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
      log.info("Alias added to firm registry", {
        firmId: firm.id,
        canonical_name,
        newAlias: add_alias,
      });
    } else {
      log.warn("Firm not found for alias addition", { canonical_name });
    }
  }

  log.info("Mention resolved", {
    response_id,
    mention_index,
    resolution,
    canonical_name,
    previousCanonical: previousMention.canonical_name,
  });
  log.done(200);
  return NextResponse.json({ success: true });
}
