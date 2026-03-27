import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/audits", "/competitors", "/content", "/citations", "/settings", "/admin", "/api", "/reset-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const startTime = Date.now();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // Allow unauthenticated access to auth endpoints
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const durationMs = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        message: "Unauthenticated access blocked",
        middleware: true,
        pathname,
        method: req.method,
        durationMs,
        ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
      })
    );

    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/audits/:path*",
    "/competitors/:path*",
    "/content/:path*",
    "/citations/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/:path*",
    "/reset-password",
  ],
};
