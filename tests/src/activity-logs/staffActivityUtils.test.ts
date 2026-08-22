import {
  dateInputValue,
  formatActivityDuration,
  formatStaffActivityTimestamp,
  getActivityActorId,
  getActivityStaffKey,
  maskedPhoneHint,
  parseStaffActivityFilters,
  toDateBoundary,
  updateStaffActivityQuery,
} from "@/lib/staffActivityUtils";
import type { StaffActivityRow } from "@/types/staffActivity";

describe("staffActivityUtils", () => {
  it("uses stable production defaults", () => {
    expect(parseStaffActivityFilters({})).toEqual({
      page: 1,
      limit: 50,
      staff: undefined,
      role: undefined,
      category: undefined,
      outcome: undefined,
      property: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
    });
  });

  it("accepts the canonical URL filters and trims search text", () => {
    const filters = parseStaffActivityFilters({
      page: "3",
      limit: "100",
      role: "CARETAKER",
      staff: "CARETAKER:53e68ae1-d2ae-4d96-996d-e831bab98672",
      category: "AUDIT",
      outcome: "FAILED",
      property: "760a0cd8-9415-4daa-b56d-9fb293746449",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-21T23:59:59.999Z",
      q: "  failed upload  ",
    });

    expect(filters).toMatchObject({
      page: 3,
      limit: 100,
      role: "CARETAKER",
      staff: "CARETAKER:53e68ae1-d2ae-4d96-996d-e831bab98672",
      category: "AUDIT",
      outcome: "FAILED",
      property: "760a0cd8-9415-4daa-b56d-9fb293746449",
      q: "failed upload",
    });
  });

  it("drops invalid enums, page sizes and role-mismatched staff keys", () => {
    expect(
      parseStaffActivityFilters({
        page: "-7",
        limit: "500",
        role: "SUPERVISOR",
        staff: "CARETAKER:53e68ae1-d2ae-4d96-996d-e831bab98672",
        category: "NOT_REAL",
        outcome: "MAYBE",
      }),
    ).toMatchObject({
      page: 1,
      limit: 50,
      role: "SUPERVISOR",
      staff: undefined,
      category: undefined,
      outcome: undefined,
    });
  });

  it("resets the page when filters change while preserving unrelated filters", () => {
    const result = updateStaffActivityQuery(
      "page=5&limit=50&role=CARETAKER&outcome=FAILED",
      { category: "AUDIT", outcome: undefined },
    );

    expect(result.get("page")).toBeNull();
    expect(result.get("limit")).toBe("50");
    expect(result.get("role")).toBe("CARETAKER");
    expect(result.get("outcome")).toBeNull();
    expect(result.get("category")).toBe("AUDIT");
  });

  it("keeps an explicit page update", () => {
    const result = updateStaffActivityQuery("page=5&limit=25", { page: 2 });
    expect(result.toString()).toContain("page=2");
    expect(result.toString()).toContain("limit=25");
  });

  it("builds date boundaries from India Standard Time without day drift", () => {
    expect(toDateBoundary("2026-08-21", "start")).toBe(
      "2026-08-21T00:00:00.000+05:30",
    );
    expect(toDateBoundary("2026-08-21", "end")).toBe(
      "2026-08-21T23:59:59.999+05:30",
    );
    expect(dateInputValue("2026-08-21T00:00:00.000+05:30")).toBe("2026-08-21");
  });

  it("renders explicit IST timestamps and safe compact hints", () => {
    expect(formatStaffActivityTimestamp("2026-08-21T00:00:00.000Z")).toBe(
      "21 Aug 2026, 05:30:00 IST",
    );
    expect(formatActivityDuration(925)).toBe("925 ms");
    expect(formatActivityDuration(1_250)).toBe("1.25 s");
    expect(maskedPhoneHint("+91 98765 43210")).toBe("•••• 3210");
  });

  it("uses the polymorphic actor identity from the API row", () => {
    const row = {
      actorId: "53e68ae1-d2ae-4d96-996d-e831bab98672",
      actorKey: "SUPERVISOR:53e68ae1-d2ae-4d96-996d-e831bab98672",
      actorRole: "SUPERVISOR",
    } as StaffActivityRow;

    expect(getActivityActorId(row)).toBe(row.actorId);
    expect(getActivityStaffKey(row)).toBe(row.actorKey);
  });
});
