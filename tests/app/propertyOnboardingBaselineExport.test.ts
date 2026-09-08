import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/admin/property-onboarding/submissions/baselines/[baselineId]/export/route";
import { ApiRequestError, apiGet } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";

vi.mock("@/utils/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/api-utils")>();
  return { ...actual, apiGet: vi.fn() };
});
vi.mock("@/utils/auth-utils", () => ({ getApiAuthToken: vi.fn() }));

const frozenBaseline = {
  id: "11111111-1111-4111-8111-111111111111",
  propertyId: "property-1",
  propertyName: "Hilltop Retreat",
  propertyCode: "ONB-HILLTOP",
  sourceSessionId: "session-1",
  versionNumber: 1,
  frozenBy: "supervisor-1",
  frozenAt: "2026-08-29T12:00:00.000Z",
  sessionStatus: "FROZEN",
  sessionPropertySnapshot: { propertyName: "Hilltop Retreat" },
  baselineSnapshot: {
    valid: true,
    issues: [],
    exceptions: [],
    session: {
      id: "session-1",
      propertyId: "property-1",
      status: "FROZEN",
      appType: "SUPERVISOR",
      templateSnapshot: {},
    },
    levels: [],
    areas: [],
  },
};

describe("property onboarding baseline export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(getApiAuthToken).mockResolvedValue("admin-token");
    vi.mocked(apiGet).mockResolvedValue({
      success: true,
      data: frozenBaseline,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the exact Mago-scoped baseline and returns an Excel attachment", async () => {
    const response = await GET(
      new Request(
        "http://localhost/admin/property-onboarding/submissions/baselines/11111111-1111-4111-8111-111111111111/export",
      ),
      {
        params: Promise.resolve({
          baselineId: "11111111-1111-4111-8111-111111111111",
        }),
      },
    );

    expect(apiGet).toHaveBeenCalledWith(
      "/api/property-onboarding-admin/baselines/11111111-1111-4111-8111-111111111111",
      { token: "admin-token", appType: "MAGO_ADMIN" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toContain(
      "hilltop-retreat-onboarding-1.xlsx",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    expect(workbook.getWorksheet("Summary")).toBeDefined();
    expect(workbook.getWorksheet("Media")).toBeDefined();
  });

  it("does not export a baseline outside the caller's authorized queue", async () => {
    const response = await GET(
      new Request(
        "http://localhost/admin/property-onboarding/submissions/baselines/not-visible/export",
      ),
      { params: Promise.resolve({ baselineId: "not-visible" }) },
    );

    expect(response.status).toBe(404);
    expect(apiGet).not.toHaveBeenCalled();
  });

  it("returns not found when the authorized API cannot see a valid baseline ID", async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(
      new Error("Frozen onboarding baseline not found"),
    );

    const response = await GET(
      new Request(
        "http://localhost/admin/property-onboarding/submissions/baselines/22222222-2222-4222-8222-222222222222/export",
      ),
      {
        params: Promise.resolve({
          baselineId: "22222222-2222-4222-8222-222222222222",
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("preserves an upstream authorization failure", async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(
      new ApiRequestError("Magostays Admin identity is incomplete", 403),
    );

    const response = await GET(
      new Request(
        "http://localhost/admin/property-onboarding/submissions/baselines/33333333-3333-4333-8333-333333333333/export",
      ),
      {
        params: Promise.resolve({
          baselineId: "33333333-3333-4333-8333-333333333333",
        }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("asks the caller to sign in when the Admin token is unavailable", async () => {
    vi.mocked(getApiAuthToken).mockRejectedValueOnce(
      new Error("Authentication token not found"),
    );

    const response = await GET(
      new Request(
        "http://localhost/admin/property-onboarding/submissions/baselines/44444444-4444-4444-8444-444444444444/export",
      ),
      {
        params: Promise.resolve({
          baselineId: "44444444-4444-4444-8444-444444444444",
        }),
      },
    );

    expect(response.status).toBe(401);
  });
});
