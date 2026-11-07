import assert from "node:assert/strict";
const base = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  password = process.env.DEMO_PASSWORD;
async function login(email, pass = password) {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  const d = await r.json();
  assert.ok(r.ok, JSON.stringify(d));
  return d.access_token;
}
const [admin, student] = await Promise.all(
  ["admin", "student"].map((n) => login(`${n}@demo.equip.school`)),
);
async function call(token, body) {
  const r = await fetch(`${base}/functions/v1/manage-users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
assert.equal((await call(student, { action: "create", password })).status, 403);
assert.equal(
  (await call(admin, { action: "create", password: "short" })).status,
  400,
);
const email = `account-test-${Date.now()}@demo.equip.school`;
const created = await call(admin, {
  action: "create",
  email,
  password,
  full_name: "Account API Test",
  school_id: "TEST",
  role: "borrower",
});
assert.equal(created.status, 200, JSON.stringify(created.data));
await login(email);
const newPass = password + "X";
const reset = await call(admin, {
  action: "reset",
  user_id: created.data.id,
  password: newPass,
});
assert.equal(reset.status, 200, JSON.stringify(reset.data));
await login(email, newPass);
const deactivate = await fetch(`${base}/rest/v1/rpc/manage_profile`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${admin}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    p_id: created.data.id,
    p_role: "borrower",
    p_active: false,
  }),
});
assert.ok(deactivate.ok, await deactivate.text());
console.log(
  "PASS: account creation, login, password reset, deactivation, and rejection of non-admin management",
);
