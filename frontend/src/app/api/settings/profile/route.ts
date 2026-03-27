import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { internalError } from "@/lib/api-errors";
import { getAuthContext } from "@/lib/auth-context";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const log = createApiLogger(req, "/api/settings/profile");
  const auth = await getAuthContext(req);
  if (!auth.ok) {
    log.warn("Auth failed");
    log.done(401);
    return auth.response;
  }

  const { clientId } = auth.ctx;
  log.setUser(auth.ctx.user.id, clientId);

  const body = await req.json().catch(() => ({}));
  const allowed = [
    "firm_name",
    "contact_email",
    "practice_areas",
    "primary_domain",
    "market_key",
    "geo_config",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    log.warn("No valid fields to update", { bodyKeys: Object.keys(body) });
    log.done(400);
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  log.info("Profile update requested", { fieldsUpdated: Object.keys(update) });

  const db = createServiceClient();
  const { data, error } = await db
    .from("clients")
    .update(update)
    .eq("id", clientId)
    .select()
    .single();

  if (error) return internalError(error, "profile", log);

  log.info("Profile updated successfully", {
    clientId,
    updatedFields: Object.keys(update),
  });
  log.done(200);
  return NextResponse.json(data);
}
