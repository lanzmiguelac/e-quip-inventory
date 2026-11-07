import { describe, expect, it } from "vitest";
import { schoolDate, isOverdue, csvCell, csvContent } from "../src/lib/rules";
describe("Philippine school dates", () => {
  it("uses Manila even when UTC is on the previous day", () =>
    expect(schoolDate(new Date("2026-11-06T16:00:00Z"))).toBe("2026-11-07"));
  it("is not overdue until the due date has ended in Manila", () => {
    expect(
      isOverdue("2026-11-07", null, new Date("2026-11-07T15:59:59Z")),
    ).toBe(false);
    expect(
      isOverdue("2026-11-07", null, new Date("2026-11-07T16:00:00Z")),
    ).toBe(true);
    expect(
      isOverdue("2026-11-07", "2026-11-07T00:00:00Z", new Date("2026-11-08")),
    ).toBe(false);
  });
});
describe("CSV export", () => {
  it("escapes multiline quotes and neutralizes formulas", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    for (const x of ["=1+1", "+cmd", "-cmd", "@SUM(A1)", "\t=1+1", "  =1+1"])
      expect(csvCell(x)).toContain("'");
  });
  it("preserves header-only exports", () =>
    expect(csvContent([["Asset", "Name"]])).toBe('\ufeff"Asset","Name"'));
});
import { inSchoolDateRange } from "../src/lib/rules";
it("filters reports by Philippine calendar dates rather than UTC dates", () => {
  expect(
    inSchoolDateRange("2026-11-06T16:30:00Z", "2026-11-07", "2026-11-07"),
  ).toBe(true);
  expect(
    inSchoolDateRange("2026-11-07T16:00:00Z", "2026-11-07", "2026-11-07"),
  ).toBe(false);
});
