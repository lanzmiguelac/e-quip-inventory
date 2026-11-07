export const SCHOOL_TIMEZONE = "Asia/Manila";
export function schoolDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function isOverdue(
  due: string,
  returned: string | null,
  now = new Date(),
) {
  return !returned && due < schoolDate(now);
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csvContent(rows: unknown[][]) {
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function formatDate(value: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(
    value.length === 10 ? `${value}T00:00:00+08:00` : value,
  );
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: SCHOOL_TIMEZONE,
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}
export function inSchoolDateRange(
  timestamp: string,
  start: string,
  end: string,
) {
  const day =
    timestamp.length === 10 ? timestamp : schoolDate(new Date(timestamp));
  return (!start || day >= start) && (!end || day <= end);
}
