import assert from "node:assert/strict";
const base = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const headers = { apikey: key, "Content-Type": "application/json" };
const anonymous = await fetch(`${base}/rest/v1/rpc/equipment_catalog`, {
  method: "POST",
  headers,
  body: "{}",
});
assert.equal(anonymous.status, 401);
const userIds = {};
async function login(email) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: process.env.DEMO_PASSWORD }),
  });
  const data = await res.json();
  assert.ok(res.ok, `Login failed for ${email}: ${JSON.stringify(data)}`);
  userIds[email] = data.user.id;
  return data.access_token;
}
const [admin, staff, student, student2] = await Promise.all(
  ["admin", "staff", "student", "student2"].map((n) =>
    login(`${n}@demo.equip.school`),
  ),
);
async function api(
  token,
  path,
  body,
  method = body === undefined ? "GET" : "POST",
) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}
async function rpc(token, name, args = {}) {
  const r = await api(token, `rpc/${name}`, args);
  assert.ok(r.ok, `${name}: ${JSON.stringify(r.data)}`);
  return r.data;
}
async function denied(token, name, args = {}) {
  const r = await api(token, `rpc/${name}`, args);
  assert.equal(r.ok, false, `${name} should have failed`);
}
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
}).format(new Date());
const suffix = Date.now();
const asset = await rpc(admin, "save_equipment", {
  p_id: null,
  p_data: {
    asset_number: `TEST-${suffix}`,
    name: "Integration Test Projector",
    condition: "Good",
  },
});
const make = (who) =>
  rpc(who, "submit_request", {
    p_equipment: asset,
    p_purpose: "Integration test",
    p_start: today,
    p_due: today,
  });
await denied(student, "save_equipment", {
  p_id: null,
  p_data: { asset_number: "FORBIDDEN", name: "No" },
});
await denied(student, "submit_request", {
  p_equipment: asset,
  p_purpose: "Bad dates",
  p_start: today,
  p_due: "2000-01-01",
});
const [req1, req2] = await Promise.all([make(student), make(student2)]);
const own = await api(student, `borrow_requests?id=eq.${req2}`);
assert.deepEqual(own.data, [], "Other borrower records must be hidden");
await denied(student, "decide_request", { p_id: req1, p_decision: "Approved" });
await denied(staff, "release_equipment", {
  p_request: req1,
  p_condition: "Good",
});
const approve = await Promise.all(
  [req1, req2].map((id) =>
    api(staff, "rpc/decide_request", { p_id: id, p_decision: "Approved" }),
  ),
);
assert.equal(
  approve.filter((r) => r.ok).length,
  1,
  "Exactly one concurrent approval must succeed",
);
const winner = approve[0].ok ? req1 : req2;
const catalog = await rpc(student, "equipment_catalog");
assert.equal(
  catalog.find((e) => e.id === asset).availability,
  "Reserved",
  "Borrowers must see other borrowers reservations",
);
await denied(staff, "archive_equipment", { p_id: asset });
const [loan1, loan2] = await Promise.all([
  rpc(staff, "release_equipment", {
    p_request: winner,
    p_condition: "Good",
    p_accessories: "HDMI",
  }),
  rpc(staff, "release_equipment", {
    p_request: winner,
    p_condition: "Good",
    p_accessories: "HDMI",
  }),
]);
assert.equal(loan1, loan2, "Repeated release must use the same loan");
await denied(student, "return_equipment", {
  p_loan: loan1,
  p_condition: "Good",
});
await denied(staff, "return_equipment", {
  p_loan: loan1,
  p_condition: "Needs Repair",
});
await rpc(staff, "return_equipment", {
  p_loan: loan1,
  p_condition: "Needs Repair",
  p_incident: "Broken lens",
});
await rpc(staff, "return_equipment", {
  p_loan: loan1,
  p_condition: "Needs Repair",
  p_incident: "Broken lens",
});
const incidents = await api(
  staff,
  `maintenance_records?equipment_id=eq.${asset}`,
);
assert.equal(
  incidents.data.length,
  1,
  "Repeated return must not duplicate incident",
);
const second = await rpc(staff, "record_incident", {
  p_equipment: asset,
  p_incident: "Power cable damaged",
  p_cost: 50,
});
await rpc(staff, "resolve_maintenance", {
  p_id: incidents.data[0].id,
  p_resolution: "Lens repaired",
  p_condition: "Good",
  p_cost: 100,
});
assert.equal(
  (await rpc(student, "equipment_catalog")).find((e) => e.id === asset)
    .availability,
  "Maintenance",
);
await rpc(staff, "resolve_maintenance", {
  p_id: second,
  p_resolution: "Cable replaced",
  p_condition: "Good",
  p_cost: 50,
});
assert.equal(
  (await rpc(student, "equipment_catalog")).find((e) => e.id === asset)
    .availability,
  "Available",
);
const direct = await api(
  student,
  `profiles?id=eq.${userIds["student@demo.equip.school"]}`,
  { role: "admin" },
  "PATCH",
);
assert.equal(direct.ok, false, "Self-promotion must fail");
const bypass = await api(
  staff,
  `borrow_requests?id=eq.${req1}`,
  { status: "Approved" },
  "PATCH",
);
assert.equal(bypass.ok, false, "Direct status writes must fail");
const notifs = await api(student, "notifications");
assert.ok(notifs.data.length > 0);
assert.ok(
  notifs.data.every(
    (n) => n.recipient_id === userIds["student@demo.equip.school"],
  ),
);
await rpc(student, "read_notifications", {});
await rpc(admin, "archive_equipment", { p_id: asset });
assert.equal(
  (await rpc(admin, "equipment_catalog")).find((e) => e.id === asset)
    .availability,
  "Archived",
);
const borrowerMaintenance = await api(student, "maintenance_records");
assert.deepEqual(borrowerMaintenance.data, []);
console.log(
  "PASS: login, RLS, direct-write denial, date validation, concurrent reservations, duplicate releases/returns, damaged return, multi-incident repairs, notifications, archiving",
);
await denied(student, "manage_profile", {
  p_id: userIds["student@demo.equip.school"],
  p_role: "admin",
  p_active: true,
});
await denied(admin, "manage_profile", {
  p_id: userIds["admin@demo.equip.school"],
  p_role: "borrower",
  p_active: true,
});
await rpc(admin, "manage_profile", {
  p_id: userIds["student2@demo.equip.school"],
  p_role: "borrower",
  p_active: false,
});
const inactive = await api(student2, "rpc/equipment_catalog", {});
assert.equal(
  inactive.ok,
  false,
  "Inactive users must lose access with their existing token",
);
await rpc(admin, "manage_profile", {
  p_id: userIds["student2@demo.equip.school"],
  p_role: "borrower",
  p_active: true,
});
console.log(
  "PASS: final-administrator protection and immediate account deactivation",
);
const damaged = await rpc(admin, "save_equipment", {
  p_id: null,
  p_data: {
    asset_number: `TEST-BROKEN-${Date.now()}`,
    name: "Initially damaged test asset",
    condition: "Needs Repair",
  },
});
const repair = await api(
  staff,
  `maintenance_records?equipment_id=eq.${damaged}`,
);
assert.equal(
  repair.data.length,
  1,
  "Needs Repair registration must create a resolvable repair",
);
await denied(staff, "save_equipment", {
  p_id: damaged,
  p_data: {
    asset_number: `TEST-NULL-${Date.now()}`,
    name: "No null-condition bypass",
  },
});
await rpc(staff, "start_repair", { p_id: repair.data[0].id });
assert.equal(
  (await api(staff, `maintenance_records?id=eq.${repair.data[0].id}`)).data[0]
    .status,
  "Under Repair",
);
await rpc(staff, "resolve_maintenance", {
  p_id: repair.data[0].id,
  p_resolution: "Fixed",
  p_condition: "Good",
  p_cost: 0,
});
await rpc(staff, "save_equipment", {
  p_id: damaged,
  p_data: {
    asset_number: `TEST-REPAIRED-${Date.now()}`,
    name: "Initially damaged test asset",
    condition: "Fair",
  },
});
await rpc(staff, "resolve_maintenance", {
  p_id: repair.data[0].id,
  p_resolution: "Old retry",
  p_condition: "Good",
  p_cost: 0,
});
assert.equal(
  (await rpc(staff, "equipment_catalog")).find((e) => e.id === damaged)
    .condition,
  "Fair",
  "An old repair retry must not overwrite newer condition",
);
await rpc(admin, "archive_equipment", { p_id: damaged });
console.log(
  "PASS: initial damage creates repair workflow and stale repair retries preserve newer condition",
);
