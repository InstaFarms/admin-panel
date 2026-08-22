import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  createUser,
  editUser,
  deleteUser,
  getUser,
  searchUser,
} from "@/actions/userActions";

import { isAdmin } from "@/utils/admin-only";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/api-utils";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("@/utils/admin-only");
vi.mock("@/utils/api-utils");
vi.mock("@/utils/server-utils", () => ({
  parseString: (v: string | undefined) => v ?? null,
  parseUserFormData: (formData: FormData) => ({
    firstName: (formData.get("firstName") as string) ?? "",
    lastName: (formData.get("lastName") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    mobileNumber: (formData.get("mobileNumber") as string) ?? "",
    whatsappNumber: (formData.get("whatsappNumber") as string) ?? "",
  }),
}));

describe("userActions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { cookies } = await import("next/headers");
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "jarvis-admin-token" ? ({ value: "fake-token" } as any) : undefined,
      ),
    } as any);

    vi.mocked(isAdmin).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    } as any);

    vi.mocked(apiGet).mockResolvedValue({ data: {} } as any);
    vi.mocked(apiPost).mockResolvedValue({ data: [] } as any);
    vi.mocked(apiPatch).mockResolvedValue({ success: true } as any);
    vi.mocked(apiDelete).mockResolvedValue({ success: true } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const createBaseFormData = () => {
    const fd = new FormData();
    fd.append("firstName", "John");
    fd.append("lastName", "Doe");
    fd.append("email", "john@example.com");
    fd.append("mobileNumber", "9876543210");
    fd.append("whatsappNumber", "9876543210");
    return fd;
  };

  describe("createUser", () => {
    it("returns error when unauthorized", async () => {
      vi.mocked(isAdmin).mockResolvedValueOnce(null as any);
      const result = await createUser(createBaseFormData());
      expect(result).toEqual({ error: "Unauthorized" });
    });

    it("creates user successfully and revalidates path", async () => {
      const { revalidatePath } = await import("next/cache");
      const result = await createUser(createBaseFormData());

      expect(result).toEqual({ success: "User created." });
      expect(apiPost).toHaveBeenCalledWith(
        "/api/users/admin",
        expect.objectContaining({ firstName: "John", email: "john@example.com" }),
        expect.objectContaining({ token: "fake-token" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    });
  });

  describe("editUser", () => {
    it("returns error when id is missing", async () => {
      const result = await editUser("", createBaseFormData());
      expect(result).toEqual({ error: "Invalid id." });
    });

    it("updates user successfully", async () => {
      const { revalidatePath } = await import("next/cache");
      const result = await editUser("user-1", createBaseFormData());

      expect(result).toEqual({ success: "User data updated." });
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/users/admin/user-1",
        expect.objectContaining({ firstName: "John" }),
        expect.objectContaining({ token: "fake-token" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    });
  });

  describe("deleteUser", () => {
    it("returns error when id is missing", async () => {
      const result = await deleteUser("");
      expect(result).toEqual({ error: "Invalid id." });
    });

    it("deletes user successfully", async () => {
      const { revalidatePath } = await import("next/cache");
      const result = await deleteUser("user-1");

      expect(result).toEqual({ success: "User deleted." });
      expect(apiDelete).toHaveBeenCalledWith(
        "/api/users/admin/user-1",
        expect.objectContaining({ token: "fake-token" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    });
  });

  describe("getUser", () => {
    it("returns error when id is empty", async () => {
      const result = await getUser("");
      expect(result).toEqual({ error: "Invalid id." });
    });

    it("returns user data when API succeeds", async () => {
      vi.mocked(apiGet).mockResolvedValueOnce({
        data: { id: "user-1", firstName: "John" },
      } as any);

      const result = await getUser("user-1");
      expect(result.data).toEqual({ id: "user-1", firstName: "John" });
    });
  });

  describe("searchUser", () => {
    it("returns empty array when searchValue is empty", async () => {
      const fd = new FormData();
      fd.append("searchKey", "Name");
      fd.append("searchValue", "");

      const result = await searchUser(fd);
      expect(result).toEqual({ data: [] });
    });

    it("throws on invalid search key", async () => {
      const fd = new FormData();
      fd.append("searchKey", "InvalidKey");
      fd.append("searchValue", "John");

      const result = await searchUser(fd);
      expect(result).toEqual({ error: "Invalid search key." });
    });

    it("uses role-specific search when role is Owner/Manager/Caretaker", async () => {
      const fd = new FormData();
      fd.append("searchKey", "Name");
      fd.append("searchValue", "John");
      fd.append("role", "Owner");

      await searchUser(fd);

      expect(apiPost).toHaveBeenCalledWith(
        "/api/users/admin/search-by-role",
        expect.objectContaining({ role: "Owner" }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });

    it("uses generic search when no role provided", async () => {
      const fd = new FormData();
      fd.append("searchKey", "Name");
      fd.append("searchValue", "John");

      await searchUser(fd);

      expect(apiPost).toHaveBeenCalledWith(
        "/api/users/admin/search",
        expect.objectContaining({ searchValue: "John" }),
        expect.objectContaining({ token: "fake-token" }),
      );
    });
  });
});

