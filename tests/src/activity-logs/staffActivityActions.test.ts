import {
  getStaffActivityLogs,
  searchStaffActivityProperties,
  searchStaffActivityStaff,
} from "@/actions/staffActivityActions";
import { apiGet } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/api-utils", async () => {
  const actual =
    await vi.importActual<typeof import("@/utils/api-utils")>(
      "@/utils/api-utils",
    );
  return { ...actual, apiGet: vi.fn() };
});
vi.mock("@/utils/auth-utils", () => ({ getApiAuthToken: vi.fn() }));
vi.mock("@/lib/sentry", () => ({ captureError: vi.fn() }));

describe("staffActivityActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiAuthToken).mockResolvedValue("admin-token");
  });

  it("maps canonical UI filters to the logs API and explicitly scopes Mago Admin", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      success: true,
      data: [],
      pagination: { page: 2, limit: 50, total: 0, totalPages: 0 },
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        activeStaff: 0,
        lastActivityAt: null,
      },
    });

    await getStaffActivityLogs({
      page: 2,
      limit: 50,
      staff: "SUPERVISOR:53e68ae1-d2ae-4d96-996d-e831bab98672",
      role: "SUPERVISOR",
      category: "AUDIT",
      outcome: "FAILED",
      property: "760a0cd8-9415-4daa-b56d-9fb293746449",
      from: "2026-08-01T00:00:00.000+05:30",
      to: "2026-08-21T23:59:59.999+05:30",
      q: "photo upload",
    });

    const [url, options] = vi.mocked(apiGet).mock.calls[0];
    const parsed = new URL(url as string, "http://admin.local");
    expect(parsed.pathname).toBe("/api/staff-activity/logs");
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({
      page: "2",
      limit: "50",
      staffKey: "SUPERVISOR:53e68ae1-d2ae-4d96-996d-e831bab98672",
      role: "SUPERVISOR",
      category: "AUDIT",
      outcome: "FAILED",
      propertyId: "760a0cd8-9415-4daa-b56d-9fb293746449",
      search: "photo upload",
    });
    expect(options).toMatchObject({
      token: "admin-token",
      appType: "MAGO_ADMIN",
      cache: "no-store",
    });
  });

  it("calls the combined staff picker endpoint with role and search", async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: [] });

    await searchStaffActivityStaff({
      search: "Priya",
      role: "CARETAKER",
      limit: 25,
    });

    const [url, options] = vi.mocked(apiGet).mock.calls[0];
    expect(url).toContain("/api/staff-activity/staff?");
    expect(url).toContain("search=Priya");
    expect(url).toContain("role=CARETAKER");
    expect(url).toContain("limit=25");
    expect(options).toMatchObject({ appType: "MAGO_ADMIN" });
  });

  it("normalizes a bare property option array", async () => {
    const options = [{ id: "property-1", name: "Mago Villa", code: "MG-001" }];
    vi.mocked(apiGet).mockResolvedValue(options);

    await expect(
      searchStaffActivityProperties({ search: "Mago" }),
    ).resolves.toEqual({ success: true, data: options });
    expect(vi.mocked(apiGet).mock.calls[0][1]).toMatchObject({
      appType: "MAGO_ADMIN",
    });
  });

  it("returns a bounded error state instead of throwing API details into the page", async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error("audit service unavailable"));

    const result = await getStaffActivityLogs({ page: 1, limit: 50 });

    expect(result).toMatchObject({
      success: false,
      data: [],
      error: "audit service unavailable",
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
  });
});
