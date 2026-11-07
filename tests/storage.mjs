import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  password = process.env.DEMO_PASSWORD;
const admin = createClient(url, key, { auth: { persistSession: false } }),
  student = createClient(url, key, { auth: { persistSession: false } });
for (const [client, email] of [
  [admin, "admin@demo.equip.school"],
  [student, "student@demo.equip.school"],
]) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null);
}
const bytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKdoAAAAASUVORK5CYII=",
  "base64",
);
const path = `storage-test-${Date.now()}.png`;
assert.ok(
  (
    await student.storage
      .from("equipment-photos")
      .upload(path, bytes, { contentType: "image/png" })
  ).error,
  "Borrower upload must fail",
);
assert.ok(
  (
    await admin.storage
      .from("equipment-photos")
      .upload(path + ".txt", Buffer.from("no"), { contentType: "text/plain" })
  ).error,
  "Disallowed MIME type must fail",
);
const uploaded = await admin.storage
  .from("equipment-photos")
  .upload(path, bytes, { contentType: "image/png" });
assert.equal(uploaded.error, null, uploaded.error?.message);
const publicRead = await fetch(
  `${url}/storage/v1/object/public/equipment-photos/${path}`,
);
assert.equal(
  publicRead.ok,
  false,
  "Photo must not have anonymous public access",
);
const signed = await student.storage
  .from("equipment-photos")
  .createSignedUrl(path, 60);
assert.equal(signed.error, null);
assert.ok(
  (await fetch(signed.data.signedUrl)).ok,
  "Authorized signed photo must load",
);
const removed = await admin.storage.from("equipment-photos").remove([path]);
assert.equal(removed.error, null);
await Promise.all([admin.auth.signOut(), student.auth.signOut()]);
console.log(
  "PASS: staff-only uploads, image MIME restriction, private photos, authenticated signed reads, cleanup",
);
