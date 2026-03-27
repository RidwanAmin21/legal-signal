import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  clientId: string;
  role: string;
}

type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; response: NextResponse };

/**
 * Extract authenticated user + client context from request cookies.
 * Returns a discriminated union so callers can early-return on failure.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const clientId = user.app_metadata?.client_id as string | undefined;
  if (!clientId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No client associated with this account" },
        { status: 404 }
      ),
    };
  }

  const role = (user.app_metadata?.role as string) ?? "member";

  return { ok: true, ctx: { user, clientId, role } };
}

/**
 * Same as getAuthContext but also requires admin role.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const result = await getAuthContext(req);
  if (!result.ok) return result;

  if (result.ctx.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}
