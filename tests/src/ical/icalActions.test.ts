import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  fetchIcalLinks,
  addIcalLink,
  syncIcalLink,
  deleteIcalLink,
  getExportUrl,
} from "@/actions/icalActions";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiDelete } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/utils/admin-only");
vi.mock("@/utils/api-utils");

describe("icalActions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "jarvis-admin-token" ? ({ value: "test-token" } as any) : undefined,
      ),
    } as any);

    vi.mocked(isAdmin).mockResolvedValue({ id: "admin-1" } as any);

    vi.mocked(apiGet).mockResolvedValue({ data: [{ id: "link-1" }] } as any);
    vi.mocked(apiPost).mockResolvedValue({ data: { eventsProcessed: 3 } } as any);
    vi.mocked(apiDelete).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchIcalLinks", () => {
    it("returns unauthorized error when user is not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);

      const result = await fetchIcalLinks("prop-1");
      expect(result).toEqual({ error: "Unauthorized" });
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("fetches links with token and returns data", async () => {
      const result = await fetchIcalLinks("prop-1");

      expect(apiGet).toHaveBeenCalledWith(
        "/api/ical/links/prop-1",
        expect.objectContaining({ token: "test-token" }),
      );
      expect(result).toEqual({
        success: "Fetched successfully",
        data: [{ id: "link-1" }],
      });
    });

    it("returns error message when token is missing", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValueOnce({
        get: vi.fn(() => undefined),
      } as any);

      const result = await fetchIcalLinks("prop-1");
      expect(result).toEqual({ error: "No authentication token found" });
    });
  });

  describe("addIcalLink", () => {
    it("returns unauthorized error when user is not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);

      const result = await addIcalLink("prop-1", "Airbnb", "https://example.com/ical");
      expect(result).toEqual({ error: "Unauthorized" });
      expect(apiPost).not.toHaveBeenCalled();
    });

    it("creates iCal link and revalidates properties path", async () => {
      const { revalidatePath } = await import("next/cache");

      const result = await addIcalLink("prop-1", "Airbnb", "https://example.com/ical");

      expect(apiPost).toHaveBeenCalledWith(
        "/api/ical/links",
        {
          propertyId: "prop-1",
          name: "Airbnb",
          icalUrl: "https://example.com/ical",
        },
        expect.objectContaining({ token: "test-token" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/properties");
      expect(result).toEqual({
        success: "iCal link added successfully",
        data: { eventsProcessed: 3 },
      });
    });
  });

  describe("syncIcalLink", () => {
    it("returns unauthorized error when user is not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);

      const result = await syncIcalLink("link-1");
      expect(result).toEqual({ error: "Unauthorized" });
      expect(apiPost).not.toHaveBeenCalled();
    });

    it("syncs link and returns processed events count", async () => {
      const { revalidatePath } = await import("next/cache");

      const result = await syncIcalLink("link-1");

      expect(apiPost).toHaveBeenCalledWith(
        "/api/ical/sync/link-1",
        {},
        expect.objectContaining({ token: "test-token" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/properties");
      expect(result).toEqual({
        success: "Sync completed. Processed 3 events.",
        data: { eventsProcessed: 3 },
      });
    });
  });

  describe("deleteIcalLink", () => {
    it("returns unauthorized error when user is not admin", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);

      const result = await deleteIcalLink("link-1");
      expect(result).toEqual({ error: "Unauthorized" });
      expect(apiDelete).not.toHaveBeenCalled();
    });

    it("deletes link and revalidates properties path", async () => {
      const { revalidatePath } = await import("next/cache");

      const result = await deleteIcalLink("link-1");

      expect(apiDelete).toHaveBeenCalledWith(
        "/api/ical/links/link-1",
        expect.objectContaining({ token: "test-token" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/properties");
      expect(result).toEqual({ success: "Link deleted successfully" });
    });
  });

  describe("getExportUrl", () => {
    const originalIcalExportBaseUrl = process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL;
    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    const originalEnv = process.env.NEXT_PUBLIC_DEV_BASE_URL;

    afterEach(() => {
      process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL = originalIcalExportBaseUrl;
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
      process.env.NEXT_PUBLIC_DEV_BASE_URL = originalEnv;
    });

    it("uses NEXT_PUBLIC_ICAL_EXPORT_BASE_URL when set", async () => {
      process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL = "https://api.kohaconsultants.co.in";
      process.env.NEXT_PUBLIC_API_URL = "https://api.instafarms.in";
      process.env.NEXT_PUBLIC_DEV_BASE_URL = "https://dev.example.com";

      const url = await getExportUrl("prop-1");
      expect(url).toBe("https://api.kohaconsultants.co.in/api/ical/export/prop-1");
    });

    it("falls back to NEXT_PUBLIC_API_URL when iCal export base URL is not set", async () => {
      delete process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL;
      process.env.NEXT_PUBLIC_API_URL = "https://api.instafarms.in";
      process.env.NEXT_PUBLIC_DEV_BASE_URL = "https://dev.example.com";

      const url = await getExportUrl("prop-1");
      expect(url).toBe("https://api.instafarms.in/api/ical/export/prop-1");
    });

    it("uses NEXT_PUBLIC_DEV_BASE_URL when higher-priority env vars are not set", async () => {
      delete process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL;
      delete process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_DEV_BASE_URL = "https://dev.example.com";

      const url = await getExportUrl("prop-1");
      expect(url).toBe("https://dev.example.com/api/ical/export/prop-1");
    });

    it("falls back to default localhost URL when env is not set", async () => {
      delete process.env.NEXT_PUBLIC_ICAL_EXPORT_BASE_URL;
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_DEV_BASE_URL;

      const url = await getExportUrl("prop-1");
      expect(url).toBe("http://localhost:3001/api/ical/export/prop-1");
    });
  });
});

