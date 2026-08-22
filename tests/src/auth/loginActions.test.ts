import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  sendOTP,
  verifyOTPAndLogin,
  checkAuthCookie,
  clearAuthCookie,
  revalidateAfterLogin,
} from "@/actions/loginActions";

import { apiPost } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("@/utils/api-utils");

describe("loginActions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    // Default cookie store mock
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "jarvis-admin-token") {
          return { value: "fake-token" } as any;
        }
        if (name === "adminDocumentId") {
          return { value: "doc-123" } as any;
        }
        return undefined;
      }),
      set: vi.fn(),
      delete: vi.fn(),
    } as any);

    vi.mocked(apiPost).mockResolvedValue({ success: true, message: "ok" } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("sendOTP", () => {
    it("returns admin-specific message when backend says number is not admin", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        success: false,
        error: "User not an admin",
      } as any);

      const result = await sendOTP("+911234567890");

      expect(result).toEqual({
        success: false,
        message:
          "This phone number is not registered as an admin. Please contact your administrator.",
        isAdminError: true,
      });
    });

    it("returns network-friendly message on fetch/network TypeError", async () => {
      const networkError = new TypeError("Failed to fetch");
      vi.mocked(apiPost).mockRejectedValueOnce(networkError);

      const result = await sendOTP("+911234567890");

      expect(result).toEqual({
        success: false,
        message: "Unable to connect to server. Please check your internet connection.",
      });
    });
  });

  describe("verifyOTPAndLogin", () => {
    it("returns admin error when response indicates non-admin account", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        success: false,
        isAdmin: false,
        error: "User is not an admin",
      } as any);

      const result = await verifyOTPAndLogin("+911234567890", "123456");

      expect(result).toEqual({
        success: false,
        message: "Access Denied: This account does not have admin privileges.",
        isAdminError: true,
      });
    });

    it("sets cookies and returns success payload on successful login", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        success: true,
        accessToken: "token-abc",
        documentId: "doc-xyz",
        data: { admin: { id: "admin-1", firstName: "Test" } },
      } as any);

      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();

      const result = await verifyOTPAndLogin("+911234567890", "123456");

      expect(cookieStore.set).toHaveBeenCalledWith(
        "jarvis-admin-token",
        "token-abc",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(cookieStore.set).toHaveBeenCalledWith(
        "adminDocumentId",
        "doc-xyz",
        expect.objectContaining({ httpOnly: true }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          accessToken: "token-abc",
          documentId: "doc-xyz",
          admin: expect.objectContaining({ id: "admin-1" }),
          message: "Login successful",
          needsRefresh: true,
        }),
      );
    });
  });

  describe("checkAuthCookie", () => {
    it("returns flags and preview when token and docId exist", async () => {
      const result = await checkAuthCookie();

      expect(result.hasToken).toBe(true);
      expect(result.hasDocId).toBe(true);
      expect(result.tokenPreview).toBe("fake-token".substring(0, 20));
    });

    it("returns false flags when no token cookie", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn(() => undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as any);

      const result = await checkAuthCookie();
      expect(result).toEqual({
        hasToken: false,
        hasDocId: false,
        tokenPreview: null,
      });
    });
  });

  describe("clearAuthCookie", () => {
    it("records logout and deletes auth cookies when token exists", async () => {
      const { cookies } = await import("next/headers");
      const { revalidatePath } = await import("next/cache");
      const cookieStore = await cookies();

      await clearAuthCookie();

      expect(apiPost).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.anything(),
        expect.objectContaining({ token: "fake-token" }),
      );
      expect(cookieStore.delete).toHaveBeenCalledWith("jarvis-admin-token");
      expect(cookieStore.delete).toHaveBeenCalledWith("adminDocumentId");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/admins");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/admins/doc-123");
    });

    it("still deletes auth cookies when logout activity call fails", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(new Error("logout failed"));

      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();

      await clearAuthCookie();

      expect(cookieStore.delete).toHaveBeenCalledWith("jarvis-admin-token");
      expect(cookieStore.delete).toHaveBeenCalledWith("adminDocumentId");
    });
  });

  describe("revalidateAfterLogin", () => {
    it("revalidates /admin and / paths with layout", async () => {
      const { revalidatePath } = await import("next/cache");

      await revalidateAfterLogin();

      expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });
  });
});

