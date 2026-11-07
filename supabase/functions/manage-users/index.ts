import { createClient } from "npm:@supabase/supabase-js@2.119.0";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const response = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return response(405, { error: "Method not allowed" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer "))
    return response(401, { error: "Sign in first." });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(auth.slice(7));
  if (authError || !user)
    return response(401, { error: "Your session has expired. Sign in again." });
  const { data: actor } = await client
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .single();
  if (!actor?.is_active || actor.role !== "admin")
    return response(403, { error: "Administrator access is required." });
  let body;
  try {
    body = await req.json();
  } catch {
    return response(400, { error: "Invalid request." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return response(400, { error: "Invalid request." });
  if (
    body.action !== "approve_google" &&
    (typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 128)
  )
    return response(400, {
      error: "Use a password between 12 and 128 characters.",
    });
  try {
    if (body.action === "approve_google") {
      if (
        typeof body.email !== "string" ||
        !/^\S+@\S+\.\S+$/.test(body.email.trim()) ||
        body.email.length > 254 ||
        typeof body.full_name !== "string" ||
        !body.full_name.trim() ||
        body.full_name.length > 120 ||
        typeof body.school_id !== "string" ||
        body.school_id.length > 80
      )
        return response(400, {
          error:
            "Provide a valid Google email address, full name, and school ID.",
        });
      const email = body.email.trim().toLowerCase();
      const { data: existingProfile, error: lookupError } = await client
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existingProfile)
        return response(409, {
          error:
            "This account already exists. Use Manage to change its role or activation status.",
        });
      // The person may have tried Google before approval, leaving an Auth user without an application profile.
      let accountId: string | undefined;
      for (let page = 1; ; page++) {
        const { data, error } = await client.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (error) throw error;
        const match = data.users.find(
          (candidate) => candidate.email?.toLowerCase() === email,
        );
        if (match) {
          accountId = match.id;
          break;
        }
        if (data.users.length < 1000) break;
      }
      let created = false;
      if (!accountId) {
        const { data, error } = await client.auth.admin.createUser({
          email,
          password: crypto.randomUUID() + crypto.randomUUID(),
          email_confirm: true,
        });
        if (error) throw error;
        accountId = data.user.id;
        created = true;
      }
      const { error: profileError } = await client
        .from("profiles")
        .insert({
          id: accountId,
          email,
          full_name: body.full_name.trim(),
          school_id: body.school_id.trim(),
          role: "borrower",
          is_active: true,
        });
      if (profileError) {
        if (created) await client.auth.admin.deleteUser(accountId);
        throw profileError;
      }
      await client
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action: "Approved Google account",
          entity_type: "profile",
          entity_id: accountId,
        });
      return response(200, { id: accountId });
    }
    if (body.action === "create") {
      if (
        typeof body.email !== "string" ||
        !/^\S+@\S+\.\S+$/.test(body.email) ||
        typeof body.full_name !== "string" ||
        !body.full_name.trim() ||
        body.full_name.length > 120 ||
        !["admin", "staff", "borrower"].includes(body.role) ||
        typeof body.school_id !== "string" ||
        body.school_id.length > 80
      )
        return response(400, {
          error: "Provide a valid name, email, school ID, and role.",
        });
      const { data, error } = await client.auth.admin.createUser({
        email: body.email.trim(),
        password: body.password,
        email_confirm: true,
      });
      if (error) throw error;
      const { error: profileError } = await client.from("profiles").insert({
        id: data.user.id,
        email: body.email.trim(),
        full_name: body.full_name.trim(),
        school_id: body.school_id,
        role: body.role,
      });
      if (profileError) {
        await client.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      const { error: auditError } = await client.from("audit_logs").insert({
        actor_id: user.id,
        action: "Created account",
        entity_type: "profile",
        entity_id: data.user.id,
      });
      if (auditError)
        console.error("Account audit could not be saved", auditError.code);
      return response(200, { id: data.user.id });
    }
    if (body.action === "reset") {
      if (
        typeof body.user_id !== "string" ||
        !body.user_id.match(/^[a-f0-9-]{36}$/i)
      )
        return response(400, { error: "Choose a valid account." });
      const { data: target } = await client
        .from("profiles")
        .select("id")
        .eq("id", body.user_id)
        .single();
      if (!target) return response(404, { error: "Account not found." });
      const { error } = await client.auth.admin.updateUserById(body.user_id, {
        password: body.password,
      });
      if (error) throw error;
      await client.from("audit_logs").insert({
        actor_id: user.id,
        action: "Reset account password",
        entity_type: "profile",
        entity_id: body.user_id,
      });
      return response(200, { success: true });
    }
    return response(400, { error: "Unsupported account action." });
  } catch (error) {
    return response(400, {
      error:
        error instanceof Error ? error.message : "Account operation failed.",
    });
  }
});
