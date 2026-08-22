"use client";

/**
 * Spaces tab — the rooms/areas a property physically has.
 *
 * One row per space (INSTANCE-per-row): "Bedroom 1", "Bedroom 2", "Pool Deck".
 * GET /ops/config/property-spaces returns a FLAT list carrying only spaceTypeId,
 * so the type name is joined and the parent/child tree is built client-side
 * from parentSpaceId.
 *
 * NOTE on updates: the PATCH action rewrites label + parentSpaceId on every
 * call (an absent parentSpaceId clears it), so every mutation here sends the
 * full triple label/parentSpaceId/status.
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
import { HiOutlineViewGrid, HiPencil, HiX } from "react-icons/hi";

import ConfirmModal from "@/components/ConfirmModal";
import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  createPropertySpace,
  getPropertySpaces,
  getSpaceTypes,
  updatePropertySpace,
  type OpsPropertySpace,
  type OpsSpaceType,
} from "@/actions/opsConfigActions";
import { getEmptyListMessage } from "@/constants/ui";
import { parseServerActionResult } from "@/utils/utils";

interface TreeNode {
  space: OpsPropertySpace;
  depth: number;
}

/** Flat list -> depth-annotated, parent-before-child ordering. */
function buildTree(spaces: OpsPropertySpace[]): TreeNode[] {
  const byParent = new Map<string, OpsPropertySpace[]>();
  const known = new Set(spaces.map((s) => s.id));

  for (const space of spaces) {
    const parent =
      space.parentSpaceId && known.has(space.parentSpaceId)
        ? space.parentSpaceId
        : "__root__";
    const bucket = byParent.get(parent);
    if (bucket) bucket.push(space);
    else byParent.set(parent, [space]);
  }

  const out: TreeNode[] = [];
  const visited = new Set<string>();

  const walk = (parentKey: string, depth: number) => {
    const children = byParent.get(parentKey) ?? [];
    for (const space of children) {
      if (visited.has(space.id)) continue; // guards against a cyclic parent chain
      visited.add(space.id);
      out.push({ space, depth });
      walk(space.id, depth + 1);
    }
  };

  walk("__root__", 0);
  // Anything unreachable (cycle) still has to be visible.
  for (const space of spaces) {
    if (!visited.has(space.id)) out.push({ space, depth: 0 });
  }
  return out;
}

export default function SpacesSection({
  propertyId,
  organizationId,
}: {
  propertyId: string;
  organizationId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [spaceTypes, setSpaceTypes] = useState<OpsSpaceType[]>([]);
  const [spaces, setSpaces] = useState<OpsPropertySpace[]>([]);

  // create form
  const [newSpaceTypeId, setNewSpaceTypeId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [creating, startCreate] = useTransition();

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [saving, startSave] = useTransition();

  // status toggle confirmation
  const [statusTarget, setStatusTarget] = useState<OpsPropertySpace | null>(null);
  const [togglingStatus, startToggleStatus] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [types, rows] = await Promise.all([
        getSpaceTypes(organizationId),
        getPropertySpaces(propertyId),
      ]);
      setSpaceTypes(types);
      setSpaces(rows);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load property spaces",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeById = useMemo(() => {
    const map = new Map<string, OpsSpaceType>();
    for (const type of spaceTypes) map.set(type.id, type);
    return map;
  }, [spaceTypes]);

  const tree = useMemo(() => buildTree(spaces), [spaces]);

  const handleCreate = useCallback(() => {
    const label = newLabel.trim();
    if (!newSpaceTypeId) {
      toast.error("Pick a space type");
      return;
    }
    if (!label) {
      toast.error("A label is required");
      return;
    }
    const formData = new FormData();
    formData.set("propertyId", propertyId);
    formData.set("spaceTypeId", newSpaceTypeId);
    formData.set("label", label);
    if (newParentId) formData.set("parentSpaceId", newParentId);

    startCreate(() => {
      toast
        .promise(parseServerActionResult(createPropertySpace(formData)), {
          loading: "Adding space...",
          success: (message: string) => message || "Space added",
          error: (error: Error) => error.message || "Failed to add space",
        })
        .then(() => {
          setNewLabel("");
          setNewParentId("");
          return load();
        })
        .catch(() => undefined);
    });
  }, [load, newLabel, newParentId, newSpaceTypeId, propertyId]);

  const startEditing = useCallback((space: OpsPropertySpace) => {
    setEditingId(space.id);
    setEditLabel(space.label);
    setEditParentId(space.parentSpaceId ?? "");
  }, []);

  const handleSaveEdit = useCallback(
    (space: OpsPropertySpace) => {
      const label = editLabel.trim();
      if (!label) {
        toast.error("A label is required");
        return;
      }
      const formData = new FormData();
      formData.set("label", label);
      if (editParentId) formData.set("parentSpaceId", editParentId);
      formData.set("status", space.status);

      startSave(() => {
        toast
          .promise(
            parseServerActionResult(updatePropertySpace(space.id, formData)),
            {
              loading: "Saving space...",
              success: (message: string) => message || "Space updated",
              error: (error: Error) => error.message || "Failed to update space",
            },
          )
          .then(() => {
            setEditingId(null);
            return load();
          })
          .catch(() => undefined);
      });
    },
    [editLabel, editParentId, load],
  );

  const handleToggleStatus = useCallback(() => {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const formData = new FormData();
    formData.set("label", statusTarget.label);
    if (statusTarget.parentSpaceId)
      formData.set("parentSpaceId", statusTarget.parentSpaceId);
    formData.set("status", nextStatus);

    startToggleStatus(() => {
      toast
        .promise(
          parseServerActionResult(
            updatePropertySpace(statusTarget.id, formData),
          ),
          {
            loading: "Updating status...",
            success: (message: string) =>
              message || `Space marked ${nextStatus}`,
            error: (error: Error) => error.message || "Failed to update status",
          },
        )
        .then(() => {
          setStatusTarget(null);
          return load();
        })
        .catch(() => undefined);
    });
  }, [load, statusTarget]);

  /** A space cannot be its own parent, nor a descendant of itself. */
  const parentOptions = useCallback(
    (excludeId: string) => {
      const banned = new Set<string>([excludeId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const space of spaces) {
          if (
            space.parentSpaceId &&
            banned.has(space.parentSpaceId) &&
            !banned.has(space.id)
          ) {
            banned.add(space.id);
            grew = true;
          }
        }
      }
      return spaces.filter((space) => !banned.has(space.id));
    },
    [spaces],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineViewGrid className="h-6 w-6" />
          </span>
          <div>
            <h6 className="text-base font-semibold text-gray-900 dark:text-white">
              Spaces
            </h6>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Every room or area this property has, one row each. Nest a space
              under a parent to model floors, wings, or zones.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="opsNewSpaceType">Space type</Label>
            <Select
              id="opsNewSpaceType"
              value={newSpaceTypeId}
              onChange={(e) => setNewSpaceTypeId(e.target.value)}
            >
              <option value="">Select a type</option>
              {spaceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="opsNewSpaceLabel">Label</Label>
            <TextInput
              id="opsNewSpaceLabel"
              value={newLabel}
              placeholder="e.g. Bedroom 2 (Ground Floor)"
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="opsNewSpaceParent">Parent space (optional)</Label>
            <Select
              id="opsNewSpaceParent"
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
            >
              <option value="">No parent</option>
              {spaces.map((space) => (
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
              disabled={spaceTypes.length === 0}
            >
              Add space
            </MyButton>
          </div>
        </div>
        {spaceTypes.length === 0 && !loading ? (
          <p className="text-sm text-amber-600 dark:text-amber-300">
            No space types exist in this organization&apos;s catalog yet — add
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
        <div className="w-full overflow-hidden rounded-xl bg-slate-100 p-3 sm:p-5 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHead>
                <TableRow>
                  <TableHeadCell className="whitespace-nowrap">
                    Space
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Type
                  </TableHeadCell>
                  <TableHeadCell className="whitespace-nowrap">
                    Parent
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
                {tree.length > 0 ? (
                  tree.map(({ space, depth }) => {
                    const type = typeById.get(space.spaceTypeId);
                    const parent = space.parentSpaceId
                      ? spaces.find((s) => s.id === space.parentSpaceId)
                      : null;
                    const isEditing = editingId === space.id;
                    return (
                      <TableRow
                        key={space.id}
                        className="bg-white transition-colors duration-150 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <TableCell className="min-w-[240px] font-medium text-gray-900 dark:text-white">
                          <div style={{ paddingLeft: depth * 20 }}>
                            {isEditing ? (
                              <TextInput
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                              />
                            ) : (
                              space.label
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[160px] text-gray-600 dark:text-gray-300">
                          {type ? `${type.name} (${type.code})` : "Unknown type"}
                        </TableCell>
                        <TableCell className="min-w-[200px] text-gray-600 dark:text-gray-300">
                          {isEditing ? (
                            <Select
                              value={editParentId}
                              onChange={(e) => setEditParentId(e.target.value)}
                            >
                              <option value="">No parent</option>
                              {parentOptions(space.id).map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            (parent?.label ?? "N/A")
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={
                              space.status === "ACTIVE" ? "success" : "gray"
                            }
                            className="w-fit"
                          >
                            {space.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <MyButton
                                  size="xs"
                                  type="submit"
                                  loading={saving}
                                  onClick={() => handleSaveEdit(space)}
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
                                <MyButton
                                  size="xs"
                                  onClick={() => startEditing(space)}
                                >
                                  <HiPencil className="h-4 w-4" />
                                </MyButton>
                                <MyButton
                                  size="xs"
                                  color={
                                    space.status === "ACTIVE"
                                      ? "warning"
                                      : "success"
                                  }
                                  onClick={() => setStatusTarget(space)}
                                >
                                  {space.status === "ACTIVE"
                                    ? "Deactivate"
                                    : "Activate"}
                                </MyButton>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      {getEmptyListMessage("spaces", false)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ConfirmModal
        showModal={statusTarget !== null}
        tone="warning"
        title={
          statusTarget?.status === "ACTIVE"
            ? "Deactivate space?"
            : "Activate space?"
        }
        confirmationText={
          statusTarget?.status === "ACTIVE"
            ? `“${statusTarget?.label}” will be marked INACTIVE. Assets already placed in it keep their link, but the space stops being offered when placing new assets.`
            : `“${statusTarget?.label}” will be marked ACTIVE and become selectable again.`
        }
        confirmLabel={
          statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"
        }
        loading={togglingStatus}
        acceptCallback={handleToggleStatus}
        closeCallback={() => setStatusTarget(null)}
      />
    </div>
  );
}
