import { createServerClient as createServiceClient } from "@/lib/supabase-server";
import { createApiLogger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const log = createApiLogger(req, "/api/auth/signup");

  let body: { email?: string; password?: string; fullName?: string; firmName?: string };
  try {
    body = await req.json();
  } catch {
    log.warn("Invalid JSON body");
    log.done(400);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, fullName, firmName } = body;

  if (!email || !password || !fullName || !firmName) {
    log.warn("Missing required signup fields", {
      hasEmail: !!email,
      hasPassword: !!password,
      hasFullName: !!fullName,
      hasFirmName: !!firmName,
    });
    log.done(400);
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 8) {
    log.warn("Password too short");
    log.done(400);
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  log.info("Signup attempt", { email, firmName });

  const admin = createServiceClient();

  // 1. Create auth user
  const { data: authData, error: signupError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (signupError) {
    const status = signupError.message.includes("already") ? 409 : 400;
    log.warn("Auth user creation failed", {
      email,
      errorMessage: signupError.message,
      status,
    });
    log.done(status);
    return NextResponse.json({ error: signupError.message }, { status });
  }

  const userId = authData.user.id;
  log.info("Auth user created", { userId, email });

  // 2. Create client record
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      firm_name: firmName,
      contact_email: email,
      market_key: "pending",
      practice_areas: [],
      tier: "solo",
      is_active: true,
    })
    .select("id")
    .single();

  if (clientError) {
    await admin.auth.admin.deleteUser(userId);
    log.error("Failed to create client — rolled back auth user", {
      userId,
      email,
      errorMessage: clientError.message,
    });
    log.done(500);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  log.info("Client record created", { clientId: client.id, firmName });

  // 3. Link user to client
  const { error: ucError } = await admin.from("user_clients").insert({
    user_id: userId,
    client_id: client.id,
    role: "admin",
  });

  if (ucError) {
    await admin.from("clients").delete().eq("id", client.id);
    await admin.auth.admin.deleteUser(userId);
    log.error("Failed to create user_clients — rolled back client and auth user", {
      userId,
      clientId: client.id,
      errorMessage: ucError.message,
    });
    log.done(500);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  // 4. Set app_metadata
  const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { client_id: client.id, role: "admin" },
  });

  if (metaError) {
    await admin.from("user_clients").delete().eq("user_id", userId).eq("client_id", client.id);
    await admin.from("clients").delete().eq("id", client.id);
    await admin.auth.admin.deleteUser(userId);
    log.error("Failed to set app_metadata — rolled back all records", {
      userId,
      clientId: client.id,
      errorMessage: metaError.message,
    });
    log.done(500);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  log.info("Signup completed successfully", {
    userId,
    clientId: client.id,
    email,
    firmName,
  });
  log.done(201);
  return NextResponse.json(
    { user_id: userId, client_id: client.id },
    { status: 201 }
  );
}
