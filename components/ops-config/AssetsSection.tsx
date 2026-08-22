"use client";

/**
 * Assets tab — the physical things a property has.
 *
 * THE MODEL: one row per physical thing. Two pools = two rows, "Pool – Main"
 * and "Pool – Kids". A property without a cricket pitch simply has no
 * CRICKET_PITCH row. There is deliberately NO quantity field, NO count, and NO
 * has/hasn't checkbox anywhere on this screen.
 *
 * GET /ops/config/property-assets returns ACTIVE and DECOMMISSIONED rows with
 * no filter parameter, so they are segmented client-side.
 *
 * NOTE on updates: the PATCH action rewrites label + spaceId on every call (an
 * absent spaceId clears it), so every mutation sends the full label/spaceId
 * pair.
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Card,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import {
  HiChevronDown,
  HiChevronRight,
  HiOutlineCube,
  HiPencil,
  HiX,
} from "react-icons/hi";

import ConfirmModal from "@/components/ConfirmModal";
import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  createPropertyAsset,
  decommissionAsset,
  getAssetTypes,
  getPropertyAssets,
  getPropertySpaces,
  recommissionAsset,
  updatePropertyAsset,
  type OpsAssetType,
  type OpsPropertyAsset,
  type OpsPropertySpace,
} from "@/actions/opsConfigActions";
import { getEmptyListMessage } from "@/constants/ui";
import { parseServerActionResult } from "@/utils/utils";

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function AssetsSection({
  propertyId,
  organizationId,
}: {
  propertyId: string;
  organizationId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [assetTypes, setAssetTypes] = useState<OpsAssetType[]>([]);
  const [assets, setAssets] = useState<OpsPropertyAsset[]>([]);
  const [spaces, setSpaces] = useState<OpsPropertySpace[]>([]);

  // create form
  const [newAssetTypeId, setNewAssetTypeId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSpaceId, setNewSpaceId] = useState("");
  const [creating, startCreate] = useTransition();

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSpaceId, setEditSpaceId] = useState("");
  const [saving, startSave] = useTransition();

  // lifecycle confirmations
  const [decommissionTarget, setDecommissionTarget] =
    useState<OpsPropertyAsset | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<OpsPropertyAsset | null>(
    null,
  );
  const [lifecycleBusy, startLifecycle] = useTransition();

  const [showDecommissioned, setShowDecommissioned] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [types, assetRows, spaceRows] = await Promise.all([
        getAssetTypes(organizationId),
        getPropertyAssets(propertyId),
        getPropertySpaces(propertyId),
      ]);
      setAssetTypes(types);
      setAssets(assetRows);
      setSpaces(spaceRows);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load property assets",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeById = useMemo(() => {
    const map = new Map<string, OpsAssetType>();
    for (const type of assetTypes) map.set(type.id, type);
    return map;
  }, [assetTypes]);

  const spaceById = useMemo(() => {
    const map = new Map<string, OpsPropertySpace>();
    for (const space of spaces) map.set(space.id, space);
    return map;
  }, [spaces]);

  const activeSpaces = useMemo(
    () => spaces.filter((space) => space.status === "ACTIVE"),
    [spaces],
  );

  const inService = useMemo(
    () => assets.filter((asset) => asset.status !== "DECOMMISSIONED"),
    [assets],
  );
  const decommissioned = useMemo(
    () => assets.filter((asset) => asset.status === "DECOMMISSIONED"),
    [assets],
  );

  /**
   * The service does no duplicate-label check, so warn before creating a twin.
   * Compared within this property + asset type only.
   */
  const duplicateWarning = useMemo(() => {
    const label = normalizeLabel(newLabel);
    if (!label || !newAssetTypeId) return null;
    const clash = assets.find(
      (asset) =>
        asset.assetTypeId === newAssetTypeId &&
        normalizeLabel(asset.label) === label,
    );
    if (!clash) return null;
    return `This property already has a ${
      typeById.get(newAssetTypeId)?.name ?? "asset"
    } labelled “${clash.label}”${
      clash.status === "DECOMMISSIONED" ? " (decommissioned)" : ""
    }. Adding this creates a second, separate one.`;
  }, [assets, newAssetTypeId, newLabel, typeById]);

  const handleCreate = useCallback(() => {
    const label = newLabel.trim();
    if (!newAssetTypeId) {
      toast.error("Pick an asset type");
      return;
    }
    if (!label) {
      toast.error("A label is required");
      return;
    }
    const formData = new FormData();
    formData.set("propertyId", propertyId);
    formData.set("assetTypeId", newAssetTypeId);
    formData.set("label", label);
    if (newSpaceId) formData.set("spaceId", newSpaceId);

    startCreate(() => {
      toast
        .promise(parseServerActionResult(createPropertyAsset(formData)), {
          loading: "Adding asset...",
          success: (message: string) => message || "Asset added",
          error: (error: Error) => error.message || "Failed to add asset",
        })
        .then(() => {
          setNewLabel("");
          setNewSpaceId("");
          return load();
        })
        .catch(() => undefined);
    });
  }, [load, newAssetTypeId, newLabel, newSpaceId, propertyId]);

  const startEditing = useCallback((asset: OpsPropertyAsset) => {
    setEditingId(asset.id);
    setEditLabel(asset.label);
    setEditSpaceId(asset.spaceId ?? "");
  }, []);

  const handleSaveEdit = useCallback(
    (asset: OpsPropertyAsset) => {
      const label = editLabel.trim();
      if (!label) {
        toast.error("A label is required");
        return;
      }
      // No status here on purpose: asset status changes go through
      // decommission/recommission, not PATCH.
      const formData = new FormData();
      formData.set("label", label);
      if (editSpaceId) formData.set("spaceId", editSpaceId);

      startSave(() => {
        toast
          .promise(
            parseServerActionResult(updatePropertyAsset(asset.id, formData)),
            {
              loading: "Saving asset...",
              success: (message: string) => message || "Asset updated",
              error: (error: Error) => error.message || "Failed to update asset",
            },
          )
          .then(() => {
            setEditingId(null);
            return load();
          })
          .catch(() => undefined);
      });
    },
    [editLabel, editSpaceId, load],
  );

  const handleDecommission = useCallback(() => {
    if (!decommissionTarget) return;
    startLifecycle(() => {
      toast
        .promise(
          parseServerActionResult(decommissionAsset(decommissionTarget.id)),
          {
            loading: "Decommissioning asset...",
            success: (message: string) => message || "Asset decommissioned",
            error: (error: Error) =>
              error.message || "Failed to decommission asset",
          },
        )
        .then(() => {
          setDecommissionTarget(null);
          return load();
        })
        .catch(() => undefined);
    });
  }, [decommissionTarget, load]);

  const handleRestore = useCallback(() => {
    if (!restoreTarget) return;
    startLifecycle(() => {
      toast
        .promise(parseServerActionResult(recommissionAsset(restoreTarget.id)), {
          loading: "Restoring asset...",
          success: (message: string) => message || "Asset restored",
          error: (error: Error) => error.message || "Failed to restore asset",
        })
        .then(() => {
          setRestoreTarget(null);
          return load();
        })
        .catch(() => undefined);
    });
  }, [load, restoreTarget]);

  const renderRow = (asset: OpsPropertyAsset, isDecommissionedTable: boolean) => {
    const type = typeById.get(asset.assetTypeId);
    const space = asset.spaceId ? spaceById.get(asset.spaceId) : null;
    const isEditing = editingId === asset.id;
    return (
      <TableRow
        key={asset.id}
        className="bg-white transition-colors duration-150 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <TableCell className="min-w-[240px] font-medium text-gray-900 dark:text-white">
          {isEditing ? (
            <TextInput
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
            />
          ) : (
            asset.label
          )}
        </TableCell>
        <TableCell className="min-w-[180px] text-gray-600 dark:text-gray-300">
          {type ? `${type.name} (${type.code})` : "Unknown type"}
        </TableCell>
        <TableCell className="min-w-[200px] text-gray-600 dark:text-gray-300">
          {isEditing ? (
            <Select
              value={editSpaceId}
              onChange={(e) => setEditSpaceId(e.target.value)}
            >
              <option value="">Not placed in a space</option>
              {activeSpaces.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          ) : (
            (space?.label ?? "N/A")
          )}
        </TableCell>
        <TableCell>
          <Badge
            color={asset.status === "DECOMMISSIONED" ? "gray" : "success"}
            className="w-fit"
          >
            {asset.status}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {isDecommissionedTable ? (
              <MyButton
                size="xs"
                color="success"
                onClick={() => setRestoreTarget(asset)}
              >
                Restore
              </MyButton>
            ) : isEditing ? (
              <>
                <MyButton
                  size="xs"
                  type="submit"
                  loading={saving}
                  onClick={() => handleSaveEdit(asset)}
                >
                  Save
                </MyButton>
                <MyButton
                  size="xs"
                  color="gray"
                  onClick={() => setEditingId(null)}
                >
                  <HiX className="h-4 w-4" />
                </MyButton>
              </>
            ) : (
              <>
                <MyButton size="xs" onClick={() => startEditing(asset)}>
                  <HiPencil className="h-4 w-4" />
                </MyButton>
                <MyButton
                  size="xs"
                  color="failure"
                  onClick={() => setDecommissionTarget(asset)}
                >
                  Decommission
                </MyButton>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineCube className="h-6 w-6" />
          </span>
          <div>
            <h6 className="text-base font-semibold text-gray-900 dark:text-white">
              Assets
            </h6>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              One row per physical thing. Two pools are two rows — &ldquo;Pool –
              Main&rdquo; and &ldquo;Pool – Kids&rdquo;. A property without a
              cricket pitch simply has no cricket pitch row.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="opsNewAssetType">Asset type</Label>
            <Select
              id="opsNewAssetType"
              value={newAssetTypeId}
              onChange={(e) => setNewAssetTypeId(e.target.value)}
            >
              <option value="">Select a type</option>
              {assetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="opsNewAssetLabel">Label</Label>
            <TextInput
              id="opsNewAssetLabel"
              value={newLabel}
              placeholder="e.g. Pool – Main"
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="opsNewAssetSpace">Space (optional)</Label>
            <Select
              id="opsNewAssetSpace"
              value={newSpaceId}
              onChange={(e) => setNewSpaceId(e.target.value)}
            >
              <option value="">Not placed in a space</option>
              {activeSpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <MyButton
              type="submit"
              loading={creating}
              onClick={handleCreate}
              disabled={assetTypes.length === 0}
            >
              Add asset
            </MyButton>
          </div>
        </div>
        {duplicateWarning ? (
          <p className="text-sm text-amber-600 dark:text-amber-300">
            {duplicateWarning}
          </p>
        ) : null}
        {assetTypes.length === 0 && !loading ? (
          <p className="text-sm text-amber-600 dark:text-amber-300">
            No asset types exist in this organization&apos;s catalog yet — add
            them on the Catalog tab first.
          </p>
        ) : null}
      </Card>

      {loading ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex items-center justify-center py-10">
            <JarvisLoader />
          </div>
        </Card>
      ) : (
        <>
          <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
            <h6 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              In service ({inService.length})
            </h6>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHead>
                  <TableRow>
                    <TableHeadCell className="whitespace-nowrap">
                      Asset
                    </TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">
                      Type
                    </TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">
                      Space
                    </TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">
                      Status
                    </TableHeadCell>
                    <TableHeadCell className="whitespace-nowrap">
                      Actions
                    </TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {inService.length > 0 ? (
                    inService.map((asset) => renderRow(asset, false))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-4 text-center text-gray-500 dark:text-gray-400"
                      >
                        {getEmptyListMessage("in-service assets", false)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {decommissioned.length > 0 ? (
            <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => setShowDecommissioned((prev) => !prev)}
                className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                {showDecommissioned ? (
                  <HiChevronDown className="h-4 w-4" />
                ) : (
                  <HiChevronRight className="h-4 w-4" />
                )}
                Decommissioned
                <Badge color="gray" className="w-fit">
                  {decommissioned.length}
                </Badge>
              </button>
              {showDecommissioned ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHead>
                      <TableRow>
                        <TableHeadCell className="whitespace-nowrap">
                          Asset
                        </TableHeadCell>
                        <TableHeadCell className="whitespace-nowrap">
                          Type
                        </TableHeadCell>
                        <TableHeadCell className="whitespace-nowrap">
                          Space
                        </TableHeadCell>
                        <TableHeadCell className="whitespace-nowrap">
                          Status
                        </TableHeadCell>
                        <TableHeadCell className="whitespace-nowrap">
                          Actions
                        </TableHeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y">
                      {decommissioned.map((asset) => renderRow(asset, true))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <ConfirmModal
        showModal={decommissionTarget !== null}
        tone="danger"
        title="Decommission asset?"
        confirmationText={`“${decommissionTarget?.label}” stops being scheduled for work. Its history is kept and it can be restored later.`}
        confirmLabel="Decommission"
        loading={lifecycleBusy}
        acceptCallback={handleDecommission}
        closeCallback={() => setDecommissionTarget(null)}
      />

      <ConfirmModal
        showModal={restoreTarget !== null}
        tone="warning"
        title="Restore asset?"
        confirmationText={`“${restoreTarget?.label}” goes back in service and will be scheduled for work again.`}
        confirmLabel="Restore"
        loading={lifecycleBusy}
        acceptCallback={handleRestore}
        closeCallback={() => setRestoreTarget(null)}
      />
    </div>
  );
}
