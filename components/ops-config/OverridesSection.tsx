"use client";

/**
 * Overrides tab — per-property EXCEPTIONS to the inherited standard
 * (handbook 2.3). Kept rare by policy: the standard should cover the normal
 * case, and every override must carry a reason.
 *
 * Three verbs, mirrored 1:1 on the API (upsert by property × operation):
 *   SUPPRESS — enabled=false, no profile: the operation stops generating here.
 *   SWAP     — enabled=true + a different PUBLISHED profile of the SAME
 *              operation: it runs here, but not the way the standard says.
 *   RE-ENABLE — delete the override row: back to pure standard inheritance.
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
  Textarea,
} from "flowbite-react";
import { HiOutlineAdjustments } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  deleteOverride,
  getExecutionProfiles,
  getOperations,
  getOverrides,
  upsertOverride,
  type OpsExecutionProfile,
  type OpsOperation,
  type OpsOverride,
} from "@/actions/opsConfigActions";
import { OPS_CONFIG_EMPTY } from "@/constants/opsConfig";
import { parseServerActionResult } from "@/utils/utils";

type OverrideMode = "SUPPRESS" | "SWAP";

export default function OverridesSection({
  organizationId,
  propertyId,
}: {
  organizationId: string;
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<OpsOverride[]>([]);
  const [operations, setOperations] = useState<OpsOperation[]>([]);
  const [busy, startBusy] = useTransition();

  // New/edit override form.
  const [operationId, setOperationId] = useState("");
  const [mode, setMode] = useState<OverrideMode>("SUPPRESS");
  const [profiles, setProfiles] = useState<OpsExecutionProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextOverrides, nextOperations] = await Promise.all([
        getOverrides(propertyId),
        getOperations(organizationId),
      ]);
      setOverrides(nextOverrides);
      setOperations(nextOperations);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load overrides",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  // A swap can only target a PUBLISHED profile of the chosen operation.
  useEffect(() => {
    if (!operationId || mode !== "SWAP") {
      setProfiles([]);
      setProfileId("");
      return;
    }
    let active = true;
    getExecutionProfiles(operationId)
      .then((rows) => {
        if (!active) return;
        const published = rows.filter((row) => row.status === "PUBLISHED");
        setProfiles(published);
        setProfileId(published[0]?.id ?? "");
      })
      .catch(() => {
        if (active) setProfiles([]);
      });
    return () => {
      active = false;
    };
  }, [mode, operationId]);

  const operationById = useMemo(
    () => new Map(operations.map((row) => [row.id, row])),
    [operations],
  );

  const handleSave = useCallback(() => {
    if (!operationId) {
      toast.error("Pick an operation");
      return;
    }
    if (mode === "SWAP" && !profileId) {
      toast.error("Pick the PUBLISHED profile to swap to");
      return;
    }
    if (!reason.trim()) {
      toast.error("An override requires a reason");
      return;
    }
    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            upsertOverride({
              propertyId,
              operationId,
              executionProfileId: mode === "SWAP" ? profileId : null,
              enabled: mode === "SWAP",
              reason: reason.trim(),
            }),
          ),
          {
            loading: "Saving override...",
            success: (message) => message || "Override saved",
            error: (error: Error) => error.message || "Failed to save override",
          },
        )
        .then(() => {
          setOperationId("");
          setMode("SUPPRESS");
          setReason("");
          return load();
        })
        .catch(() => undefined);
    });
  }, [load, mode, operationId, profileId, propertyId, reason]);

  const handleDelete = useCallback(
    (id: string) => {
      startBusy(() => {
        toast
          .promise(parseServerActionResult(deleteOverride(id)), {
            loading: "Removing override...",
            success: (message) =>
              message || "Override removed — standard inheritance restored",
            error: (error: Error) => error.message || "Failed to remove",
          })
          .then(() => load())
          .catch(() => undefined);
      });
    },
    [load],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <JarvisLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        Overrides are per-property <strong>exceptions</strong> to the inherited
        standard — keep them rare. <strong>Suppress</strong> stops one operation
        at this property; <strong>swap</strong> runs it with a different
        PUBLISHED profile; <strong>removing</strong> the override returns the
        operation to pure standard inheritance. Every override needs a reason.
      </div>

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineAdjustments className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Property overrides
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              One row per (property, operation) — saving again replaces the
              existing exception for that operation. Changes affect FUTURE
              instances only.
            </p>
          </div>
        </div>

        {overrides.length === 0 ? (
          <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
            {OPS_CONFIG_EMPTY.overrides}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Operation</TableHeadCell>
                  <TableHeadCell>Effect</TableHeadCell>
                  <TableHeadCell>Reason</TableHeadCell>
                  <TableHeadCell>
                    <span className="sr-only">Actions</span>
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {overrides.map((override) => {
                  const operation = operationById.get(override.operationId);
                  const suppressed = !override.enabled;
                  return (
                    <TableRow
                      key={override.id}
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {operation?.name ?? override.operationId}
                        <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {operation?.code ?? ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          color={suppressed ? "failure" : "purple"}
                          className="inline-flex w-fit"
                        >
                          {suppressed ? "SUPPRESSED" : "PROFILE SWAPPED"}
                        </Badge>
                        {!suppressed && override.executionProfileId ? (
                          <div className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {override.executionProfileId}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
                        {override.reason}
                      </TableCell>
                      <TableCell>
                        <MyButton
                          size="xs"
                          color="light"
                          loading={busy}
                          onClick={() => handleDelete(override.id)}
                        >
                          Remove (re-enable inheritance)
                        </MyButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid gap-3 border-t border-gray-200 pt-3 dark:border-gray-700 md:grid-cols-3">
          <div>
            <Label htmlFor="ovr-operation">Operation</Label>
            <Select
              id="ovr-operation"
              value={operationId}
              onChange={(e) => setOperationId(e.target.value)}
            >
              <option value="">— select an operation —</option>
              {operations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({row.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ovr-mode">Exception</Label>
            <Select
              id="ovr-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as OverrideMode)}
            >
              <option value="SUPPRESS">Suppress at this property</option>
              <option value="SWAP">Swap execution profile</option>
            </Select>
          </div>
          {mode === "SWAP" ? (
            <div>
              <Label htmlFor="ovr-profile">Profile (PUBLISHED only)</Label>
              <Select
                id="ovr-profile"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                {profiles.length === 0 ? (
                  <option value="">— none published —</option>
                ) : null}
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} v{profile.version}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="md:col-span-3">
            <Label htmlFor="ovr-reason">Reason (required)</Label>
            <Textarea
              id="ovr-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why does this property deviate from the standard?"
            />
          </div>
          <div>
            <MyButton loading={busy} onClick={handleSave}>
              Save override
            </MyButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
