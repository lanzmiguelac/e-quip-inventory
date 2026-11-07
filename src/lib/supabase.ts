import { createClient } from "@supabase/supabase-js";
import type { Data, Profile } from "./types";
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const url = supabaseUrl;
export const supabasePublishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY;
const key = supabasePublishableKey;
export const configured = Boolean(url && key);
export const supabase = createClient(
  url || "https://unconfigured.supabase.co",
  key || "unconfigured",
  { auth: { flowType: "pkce", detectSessionInUrl: true } },
);
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
async function rows<T>(table: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    result.push(...(data as T[]));
    if (data.length < 1000) return result;
  }
}
export async function loadData(profile: Profile): Promise<Data> {
  const staff = profile.role !== "borrower";
  const [
    equipment,
    requests,
    loans,
    maintenance,
    notifications,
    profiles,
    audit,
  ] = await Promise.all([
    rpc<Data["equipment"]>("equipment_catalog"),
    rows<Data["requests"][number]>("borrow_requests"),
    rows<Data["loans"][number]>("loans"),
    staff ? rows<Data["maintenance"][number]>("maintenance_records") : [],
    rows<Data["notifications"][number]>("notifications"),
    staff ? rows<Profile>("profiles") : [profile],
    staff ? rows<Data["audit"][number]>("audit_logs") : [],
  ]);
  return {
    equipment,
    requests,
    loans,
    maintenance,
    notifications,
    profiles,
    audit,
  };
}
export async function uploadPhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG, or WebP image under 5 MB.");
  const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage
    .from("equipment-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
export async function manageUser(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body,
  });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        message = (await error.context.json()).error || message;
      } catch {
        /* Keep transport message. */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
