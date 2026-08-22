/**
 * agreementMilestoneActions.test.ts — failures must arrive as VALUES.
 *
 * The incident: saving FIXED_LEASE on a property mapped to the marketplace-only
 * brand made the API reject with a message that names the operator's two ways
 * out. The action threw it, Next.js redacted it in production, and the admin got
 *
 *   "An error occurred in the Server Components render. The specific message is
 *    omitted in production builds..."
 *
 * — no digest to hand support, no hint of what was wrong. Every test below fixes
 * the SHAPE of the contract: these actions resolve with `{ error }` and never
 * reject, because a rejection is unreadable once it crosses the RSC boundary.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  getAgreementMilestoneConfig,
  getAgreementModelOptions,
  getMilestoneRevenueLedger,
  getMonthlyMilestoneTrackers,
  saveAgreementMilestoneConfig,
  type SaveAgreementMilestoneConfigInput,
} from "@/actions/agreementMilestoneActions";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPut } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/utils/admin-only");
vi.mock("@/utils/api-utils");
vi.mock("@/lib/sentry", () => ({
  captureError: vi.fn(),
}));

/** The real message the brand policy produces, verbatim. */
const POLICY_MESSAGE =
  'Agreement model "FL" cannot be used by this property: it is mapped to a ' +
  "brand restricted to Marketplace agreements. Use a MARKETPLACE_* model, or " +
  "map the property to a brand that permits lease models.";

const SAVE_INPUT: SaveAgreementMilestoneConfigInput = {
  propertyId: "fa421091-2120-45d6-a5a1-e003d0419b37",
  agreementModelId: "4baaff53-2f90-4dd3-bf27-aee96e13205d",
  milestoneEnabled: false,
  effectiveFrom: "2026-06-01",
};

describe("agreementMilestoneActions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "jarvis-admin-token"
          ? ({ value: "test-token" } as any)
          : undefined,
      ),
    } as any);

    vi.mocked(isAdmin).mockResolvedValue({ id: "admin-1" } as any);
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: [] } as any);
    vi.mocked(apiPut).mockResolvedValue({ success: true, data: {} } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("saveAgreementMilestoneConfig", () => {
    it("returns the API's rejection message instead of throwing it", async () => {
      // api-utils throws on a non-2xx, carrying the API's `message`.
      vi.mocked(apiPut).mockRejectedValueOnce(new Error(POLICY_MESSAGE));

      const result = await saveAgreementMilestoneConfig(SAVE_INPUT);

      expect(result.error).toBe(POLICY_MESSAGE);
      expect(result.success).toBeUndefined();
    });

    it("surfaces the message when the API answers 200 with success:false", async () => {
      vi.mocked(apiPut).mockResolvedValueOnce({
        success: false,
        message: POLICY_MESSAGE,
      } as any);

      const result = await saveAgreementMilestoneConfig(SAVE_INPUT);

      expect(result.error).toBe(POLICY_MESSAGE);
    });

    it("reports success with the saved payload", async () => {
      vi.mocked(apiPut).mockResolvedValueOnce({
        success: true,
        data: { id: "cfg-1" },
      } as any);

      const result = await saveAgreementMilestoneConfig(SAVE_INPUT);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({ id: "cfg-1" });
    });

    it("returns Unauthorized rather than throwing it", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);

      const result = await saveAgreementMilestoneConfig(SAVE_INPUT);

      expect(result.error).toBe("Unauthorized");
      expect(apiPut).not.toHaveBeenCalled();
    });

    it("falls back to a readable message when the throw carries none", async () => {
      // A bare `throw new Error()` must not degrade into an empty toast.
      vi.mocked(apiPut).mockRejectedValueOnce(new Error("   "));

      const result = await saveAgreementMilestoneConfig(SAVE_INPUT);

      expect(result.error).toBe(
        "Failed to save agreement and milestone config.",
      );
    });
  });

  describe("the read actions", () => {
    /**
     * The panel loads four things at once. Before this change a single failure
     * rejected the whole `Promise.all` and the form rendered empty with one
     * redacted toast; now each answers for itself.
     */
    const readers: Array<[string, () => Promise<any>, unknown]> = [
      ["getAgreementModelOptions", () => getAgreementModelOptions(), []],
      [
        "getAgreementMilestoneConfig",
        () => getAgreementMilestoneConfig("prop-1"),
        null,
      ],
      [
        "getMonthlyMilestoneTrackers",
        () => getMonthlyMilestoneTrackers("prop-1"),
        [],
      ],
      [
        "getMilestoneRevenueLedger",
        () => getMilestoneRevenueLedger("prop-1"),
        [],
      ],
    ];

    for (const [name, call, emptyValue] of readers) {
      it(`${name} resolves with an error and a safe empty value`, async () => {
        vi.mocked(apiGet).mockRejectedValueOnce(new Error("API Error: 500"));

        const result = await call();

        expect(result.error).toBe("API Error: 500");
        expect(result.data).toEqual(emptyValue);
      });

      it(`${name} never rejects`, async () => {
        vi.mocked(apiGet).mockRejectedValueOnce(new Error("boom"));
        await expect(call()).resolves.toBeDefined();
      });
    }

    it("getAgreementMilestoneConfig passes the config through on success", async () => {
      vi.mocked(apiGet).mockResolvedValueOnce({
        success: true,
        data: { agreementConfig: { id: "cfg-1" }, propertyCreatedAt: "2024-08-01" },
      } as any);

      const result = await getAgreementMilestoneConfig("prop-1");

      expect(result.error).toBeUndefined();
      expect(result.data).toMatchObject({ propertyCreatedAt: "2024-08-01" });
    });
  });
});
