import { describe, it, expect } from "vitest";
import { parseServerActionResult } from "@/utils/utils";

describe("parseServerActionResult", () => {
  it("returns success value when result has success", async () => {
    const result = Promise.resolve({ success: "Created successfully" });
    await expect(parseServerActionResult(result)).resolves.toBe("Created successfully");
  });

  it("returns success value for arbitrary success payload", async () => {
    const payload = { id: "123", name: "Test" };
    const result = Promise.resolve({ success: payload as unknown as string });
    await expect(parseServerActionResult(result)).resolves.toEqual(payload);
  });

  it("throws Error with message when result has error", async () => {
    const result = Promise.resolve({ error: "Validation failed" });
    await expect(parseServerActionResult(result)).rejects.toThrow("Validation failed");
  });

  it("throws generic message when error is empty string", async () => {
    const result = Promise.resolve({ error: "" });
    await expect(parseServerActionResult(result)).rejects.toThrow("Something went wrong.");
  });

  it("throws when result has neither success nor error (treated as error)", async () => {
    const result = Promise.resolve({});
    await expect(parseServerActionResult(result)).rejects.toThrow("Something went wrong.");
  });

  it("propagates rejection from the promise", async () => {
    const result = Promise.reject(new Error("Network error"));
    await expect(parseServerActionResult(result)).rejects.toThrow("Network error");
  });
});
