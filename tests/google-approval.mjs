import assert from "node:assert/strict";
const base = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  password = process.env.DEMO_PASSWORD;
async function login(name) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${name}@demo.equip.school`, password }),
  });
  const data = await res.json();
  assert.ok(res.ok, JSON.stringify(data));
  return data.access_token;
}
const [admin, borrower] = await Promise.all([login("admin"), login("student")]);
async function call(token, body) {
  const res = await fetch(`${base}/functions/v1/manage-users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}
const email = `google-approval-test-${Date.now()}@demo.equip.school`;
const body = {
  action: "approve_google",
  email,
  full_name: "Google Approval Test",
  school_id: "TEST-GOOGLE",
  role: "admin",
};
assert.equal(
  (await call(borrower, body)).status,
  403,
  "Only administrators may approve Google accounts",
);
assert.equal(
  (await call(admin, { ...body, email: "not-an-email" })).status,
  400,
);
const approved = await call(admin, body);
assert.equal(approved.status, 200, JSON.stringify(approved.data));
const profileRes = await fetch(
  `${base}/rest/v1/profiles?id=eq.${approved.data.id}`,
  { headers: { apikey: key, Authorization: `Bearer ${admin}` } },
);
const profiles = await profileRes.json();
assert.equal(
  profiles[0].role,
  "borrower",
  "A Google approval cannot grant an elevated role",
);
assert.equal(profiles[0].is_active, true);
assert.equal(profiles[0].email, email);
assert.equal(
  (await call(admin, body)).status,
  409,
  "Repeated approval must not overwrite an existing profile",
);
assert.equal(
  (await call(admin, { ...body, email: "staff@demo.equip.school" })).status,
  409,
  "Existing roles must not be overwritten",
);
const deactivate = await fetch(`${base}/rest/v1/rpc/manage_profile`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${admin}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    p_id: approved.data.id,
    p_role: "borrower",
    p_active: false,
  }),
});
assert.ok(deactivate.ok);
assert.equal(
  (await call(admin, body)).status,
  409,
  "Approval must not reactivate a deactivated account",
);
assert.equal(
  (await call(admin, null)).status,
  400,
  "Invalid JSON shapes must be rejected cleanly",
);
console.log(
  "PASS: admin-only Google approval, fixed borrower role, existing-role preservation, duplicate rejection, no implicit reactivation, input validation",
);
