import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  getBookingsAnalytics,
  getGBVAnalytics,
  getWeeklyABVAnalytics,
  getStatesOptions,
  getCitiesOptions,
  getAreasOptions,
  getMilestonePriority,
} from "@/actions/dashboardActions";

import { apiGet } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("@/utils/api-utils");
vi.mock("@/actions/stateActions", () => ({
  getAllStates: vi.fn(),
}));
vi.mock("@/actions/cityActions", () => ({
  getCitiesList: vi.fn(),
}));
vi.mock("@/actions/areaActions", () => ({
  getAreas: vi.fn(),
}));

import { getAllStates } from "@/actions/stateActions";
import { getCitiesList } from "@/actions/cityActions";
import { getAreas } from "@/actions/areaActions";

describe("dashboardActions", () => {
  const baseFilters = {
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    stateId: "all",
    cityId: "all",
    areaId: "all",
    entityCode: "",
    channel: "all",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "jarvis-admin-token" ? ({ value: "fake-token" } as any) : undefined,
      ),
    } as any);

    vi.mocked(apiGet).mockResolvedValue({ data: { rows: [] } } as any);
    vi.mocked(getAllStates).mockResolvedValue({ data: [{ id: "s1", state: "State" }] } as any);
    vi.mocked(getCitiesList).mockResolvedValue({ data: [] } as any);
    vi.mocked(getAreas).mockResolvedValue({ data: [] } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("analytics endpoints", () => {
    it("getBookingsAnalytics builds correct URL with filters and returns data", async () => {
      const mockData = { total: 10 };
      vi.mocked(apiGet).mockResolvedValueOnce({ data: mockData } as any);

      const result = await getBookingsAnalytics({
        ...baseFilters,
        stateId: "TS",
        cityId: "HYD",
        areaId: "AREA1",
        entityCode: "ENT-1",
      });

      expect(result).toBe(mockData);

      const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
      expect(callUrl).toContain("/api/dashboard/bookings?");
      expect(callUrl).toContain("startDate=2024-01-01");
      expect(callUrl).toContain("endDate=2024-01-31");
      expect(callUrl).toContain("stateId=TS");
      expect(callUrl).toContain("cityId=HYD");
      expect(callUrl).toContain("areaId=AREA1");
      expect(callUrl).toContain("propertyCode=ENT-1");

      const options = vi.mocked(apiGet).mock.calls[0][1];
      expect(options).toHaveProperty("token", "fake-token");
    });

    it("getGBVAnalytics uses same filter mapping", async () => {
      await getGBVAnalytics(baseFilters);
      const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
      expect(callUrl).toContain("/api/dashboard/gbv?");
    });

    it("getWeeklyABVAnalytics uses same filter mapping", async () => {
      await getWeeklyABVAnalytics(baseFilters);
      const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
      expect(callUrl).toContain("/api/dashboard/weekly-abv?");
    });

    it("getMilestonePriority builds correct URL with month and brandId and returns data", async () => {
      const mockData = { total: 5 };
      vi.mocked(apiGet).mockResolvedValueOnce({ data: mockData } as any);

      const result = await getMilestonePriority("2024-05", "BRAND-1");

      expect(result).toBe(mockData);

      const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
      expect(callUrl).toContain("/api/dashboard/milestone-priority?");
      expect(callUrl).toContain("month=2024-05");
      expect(callUrl).toContain("brandId=BRAND-1");
    });

    it("getMilestonePriority omits brandId if it is 'all' or missing", async () => {
      vi.mocked(apiGet).mockResolvedValueOnce({ data: [] } as any);

      await getMilestonePriority("2024-05", "all");

      const callUrl = vi.mocked(apiGet).mock.calls[0][0] as string;
      expect(callUrl).toContain("/api/dashboard/milestone-priority?");
      expect(callUrl).toContain("month=2024-05");
      expect(callUrl).not.toContain("brandId=");
    });

    it("throws when no auth token cookie is present", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn(() => undefined),
      } as any);

      await expect(getBookingsAnalytics(baseFilters)).rejects.toThrow("No authentication token found");
    });
  });

  describe("options helpers", () => {
    it("getStatesOptions returns state list or [] on error", async () => {
      const result = await getStatesOptions();
      expect(result).toEqual([{ id: "s1", state: "State" }]);

      vi.mocked(getAllStates).mockRejectedValueOnce(new Error("fail"));
      const fallback = await getStatesOptions();
      expect(fallback).toEqual([]);
    });

    it("getCitiesOptions normalizes nested cities shape", async () => {
      vi.mocked(getCitiesList).mockResolvedValueOnce({
        data: [
          {
            cities: { id: "c1", city: "Hyderabad", stateId: "TS" },
          },
        ],
      } as any);

      const result = await getCitiesOptions();

      expect(result).toEqual([
        { id: "c1", city: "Hyderabad", stateId: "TS" },
      ]);
    });

    it("getAreasOptions returns data or [] on error", async () => {
      vi.mocked(getAreas).mockResolvedValueOnce({ data: [{ id: "a1", area: "Area 1" }] } as any);

      const ok = await getAreasOptions("c1");
      expect(ok).toEqual([{ id: "a1", area: "Area 1" }]);

      vi.mocked(getAreas).mockRejectedValueOnce(new Error("fail"));
      const fallback = await getAreasOptions("c1");
      expect(fallback).toEqual([]);
    });
  });
});

