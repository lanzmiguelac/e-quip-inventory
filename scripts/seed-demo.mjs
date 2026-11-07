import { createClient } from "@supabase/supabase-js";
const url = process.env.VITE_SUPABASE_URL,
  secret = process.env.SUPABASE_SERVICE_ROLE_KEY,
  password = process.env.DEMO_PASSWORD;
if (!url || !secret || !password || password.length < 12)
  throw new Error(
    "Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_PASSWORD (12+ characters) in your local .env.",
  );
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const [email, full_name, role] of [
  ["admin@demo.equip.school", "Demo Administrator", "admin"],
  ["staff@demo.equip.school", "Inventory Staff", "staff"],
  ["student@demo.equip.school", "Maria Santos", "borrower"],
  ["student2@demo.equip.school", "Juan Dela Cruz", "borrower"],
]) {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error)
    throw new Error(
      `${email}: ${error.message}. Existing users are never overwritten.`,
    );
  const { error: profileError } = await client.from("profiles").insert({
    id: data.user.id,
    email,
    full_name,
    role,
    school_id: `DEMO-${role}`,
  });
  if (profileError) {
    await client.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }
  console.log(`Created ${role} account: ${email}`);
}
