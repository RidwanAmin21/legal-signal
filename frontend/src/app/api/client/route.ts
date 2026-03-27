import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { internalError } from "@/lib/api-errors";
import { getAuthContext } from "@/lib/auth-context";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const log = createApiLogger(req, "/api/client");
  const auth = await getAuthContext(req);
  if (!auth.ok) {
    log.warn("Auth failed");
    log.done(401);
    return auth.response;
  }

  const { clientId } = auth.ctx;
  log.setUser(auth.ctx.user.id, clientId);

  const db = createServiceClient();
  const { data, error } = await db
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) return internalError(error, "client", log);

  log.info("Client fetched", { clientId, firmName: data?.firm_name });
  log.done(200);
  return NextResponse.json(data);
}
