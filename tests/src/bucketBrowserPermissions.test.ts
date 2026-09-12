/**
 * QA #274 — the bucket browsers must be gated server-side, not merely hidden.
 *
 * The note created a non-privileged test admin and reached BOTH the Hetzner and
 * R2 Bucket Browser screens by direct navigation. It was right, and understated:
 * the nav group carried NO permission key at all, so it was not even hidden, and
 * every server action behind it checked only `isAdmin()` — "is this a logged-in
 * admin", any admin. Raw object storage, including R2's delete and rename, was
 * reachable by anyone who could sign in to the panel.
 *
 * Both halves are fixed: the nav group is keyed, and every bucket action now
 * calls requireAdminPermission. Listing is "view"; creating, deleting and
 * renaming are "edit".
 *
 * PROPERTY_DATA is the key, chosen because these buckets hold both brands' media
 * and it is the content permission that is NOT brand-scoped — the same reasoning
 * as #273, where a brand-scoped key was guarding cross-brand infrastructure. If
 * the team wants a dedicated storage permission, this is the single place it
 * would change.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const adminOnlyMock = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  requireAdminPermission: vi.fn(),
}));

vi.mock("@/utils/admin-only", () => adminOnlyMock);
vi.mock("server-only", () => ({}));

import * as hetzner from "@/actions/hetznerBrowserActions";
import * as r2 from "@/actions/r2BrowserActions";

/** Listing is a read; anything that changes the bucket is an edit. */
const VIEW_ACTIONS: Array<[string, () => Promise<unknown>]> = [
  ["listHetznerObjects", () => hetzner.listHetznerObjects("")],
  ["listR2Objects", () => r2.listR2Objects("")],
  ["listAllR2ObjectKeys", () => r2.listAllR2ObjectKeys("")],
];

const EDIT_ACTIONS: Array<[string, () => Promise<unknown>]> = [
  ["createR2Folder", () => r2.createR2Folder("qa/")],
  ["deleteR2Object", () => r2.deleteR2Object("qa/x.png")],
  ["deleteR2Folder", () => r2.deleteR2Folder("qa/")],
  ["renameR2Object", () => r2.renameR2Object("qa/x.png", "qa/y.png")],
  ["renameR2Folder", () => r2.renameR2Folder("qa/", "qb/")],
];

describe("QA #274 — bucket browser server-side gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A perfectly ordinary logged-in admin. Before the fix this was the ONLY
    // thing checked, and it was enough to browse raw storage.
    adminOnlyMock.isAdmin.mockResolvedValue({ id: "admin-1", panelRole: "SALES_EXECUTIVE" });
  });

  it("refuses every bucket action when the permission is denied", async () => {
    adminOnlyMock.requireAdminPermission.mockRejectedValue(
      new Error("You do not have view permission for property data."),
    );

    for (const [name, call] of [...VIEW_ACTIONS, ...EDIT_ACTIONS]) {
      const result = (await call().catch((error) => ({ error: String(error?.message ?? error) }))) as {
        error?: string;
        data?: unknown;
      };
      expect(
        result?.error,
        `#274 FAILED: ${name} returned data to an admin whose permission was denied — raw object ` +
          `storage is gated only by being logged in`,
      ).toBeTruthy();
      expect(
        result?.data,
        `#274 FAILED: ${name} leaked bucket contents despite the permission being denied`,
      ).toBeUndefined();
    }

    expect(
      adminOnlyMock.requireAdminPermission,
      "#274 FAILED: not one bucket action consulted the permission layer",
    ).toHaveBeenCalled();
  });

  it("asks for view on reads and edit on mutations", async () => {
    adminOnlyMock.requireAdminPermission.mockResolvedValue({ id: "admin-1" });

    for (const [name, call] of VIEW_ACTIONS) {
      adminOnlyMock.requireAdminPermission.mockClear();
      await call().catch(() => undefined); // the storage call itself may fail; the gate is what matters
      expect(
        adminOnlyMock.requireAdminPermission.mock.calls[0],
        `#274: ${name} did not request a permission before touching storage`,
      ).toBeDefined();
      expect(adminOnlyMock.requireAdminPermission.mock.calls[0]?.[1], `${name} should be a read`).toBe(
        "view",
      );
    }

    for (const [name, call] of EDIT_ACTIONS) {
      adminOnlyMock.requireAdminPermission.mockClear();
      await call().catch(() => undefined);
      expect(
        adminOnlyMock.requireAdminPermission.mock.calls[0],
        `#274: ${name} did not request a permission before changing storage`,
      ).toBeDefined();
      expect(
        adminOnlyMock.requireAdminPermission.mock.calls[0]?.[1],
        `#274 FAILED: ${name} changes the bucket but only asks for view permission`,
      ).toBe("edit");
    }
  });
});
