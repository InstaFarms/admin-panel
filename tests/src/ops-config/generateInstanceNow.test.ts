/**
 * generateInstanceNow must report what ACTUALLY happened.
 *
 * It used to return OPS_CONFIG_SUCCESS.instanceGenerated unconditionally,
 * without ever reading the response body — so a run that created nothing still
 * said "Operation instance generated." The common way to hit that is a property
 * with no CARETAKER: the engine cannot resolve an EXECUTOR, records a
 * NO_EXECUTOR_RESOLVABLE generation error, and returns created: 0. On a screen
 * whose own header comment calls it "the honesty panel", that was the one
 * message that must not lie.
 *
 * created: 0 is deliberately NOT a blanket failure — an idempotent re-press
 * legitimately creates nothing, which is why generateManual reports duplicates
 * separately from errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { generateInstanceNow } from "@/actions/opsConfigActions";
import { isAdmin } from "@/utils/admin-only";
import { getApiAuthToken } from "@/utils/auth-utils";
import { apiPost } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/utils/admin-only");
vi.mock("@/utils/auth-utils");
vi.mock("@/utils/api-utils");
vi.mock("@/lib/sentry", () => ({ captureError: vi.fn() }));

const PROPERTY_ID = "11111111-1111-1111-1111-111111111111";

/** The envelope every /api/ops/* endpoint answers with. */
const envelope = (data: unknown) => ({ success: true, data });

describe("generateInstanceNow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockResolvedValue({ id: "admin-1" } as any);
    vi.mocked(getApiAuthToken).mockResolvedValue("fake-token");
  });

  it("reports success when every requested instance was created", async () => {
    vi.mocked(apiPost).mockResolvedValue(
      envelope({ requested: 2, created: 2, duplicate: 0, error: 0 }) as any,
    );

    const result = await generateInstanceNow({ propertyId: PROPERTY_ID, operationCode: "POOL_CLEANING" });

    expect(result.error).toBeUndefined();
    expect(result.success).toContain("Operation instance generated");
    expect(result.success).toContain("2");
  });

  it("reports an ERROR when nothing was created because generation failed", async () => {
    // The NO_EXECUTOR_RESOLVABLE case: requested 1, created 0, error 1.
    vi.mocked(apiPost).mockResolvedValue(
      envelope({ requested: 1, created: 0, duplicate: 0, error: 1 }) as any,
    );

    const result = await generateInstanceNow({ propertyId: PROPERTY_ID, operationCode: "POOL_CLEANING" });

    expect(
      result.success,
      "a run that created nothing must not report success",
    ).toBeUndefined();
    expect(result.error).toMatch(/No instance was created/i);
    // The message must point at the actual cause, not just say "failed".
    expect(result.error).toMatch(/CARETAKER/);
  });

  it("does NOT call an idempotent re-press a failure", async () => {
    vi.mocked(apiPost).mockResolvedValue(
      envelope({ requested: 1, created: 0, duplicate: 1, error: 0 }) as any,
    );

    const result = await generateInstanceNow({ propertyId: PROPERTY_ID, operationCode: "POOL_CLEANING" });

    expect(result.error, "pressing Generate twice is not an error").toBeUndefined();
    expect(result.success).toMatch(/Already generated/i);
  });

  it("reports a partial run honestly", async () => {
    vi.mocked(apiPost).mockResolvedValue(
      envelope({ requested: 3, created: 1, duplicate: 0, error: 2 }) as any,
    );

    const result = await generateInstanceNow({ propertyId: PROPERTY_ID, operationCode: "POOL_CLEANING" });

    expect(result.success).toMatch(/1 of 3/);
    expect(result.success).toMatch(/2 failed/);
  });

  it("reports an error when the operation fans out to no targets at all", async () => {
    vi.mocked(apiPost).mockResolvedValue(
      envelope({ requested: 0, created: 0, duplicate: 0, error: 0 }) as any,
    );

    const result = await generateInstanceNow({ propertyId: PROPERTY_ID, operationCode: "POOL_CLEANING" });

    expect(result.success).toBeUndefined();
    expect(result.error).toMatch(/no targets/i);
  });

  it("still validates its inputs before calling the API", async () => {
    expect(await generateInstanceNow({ propertyId: "", operationCode: "X" })).toHaveProperty("error");
    expect(await generateInstanceNow({ propertyId: PROPERTY_ID, operationCode: "  " })).toHaveProperty("error");
    expect(apiPost).not.toHaveBeenCalled();
  });
});
