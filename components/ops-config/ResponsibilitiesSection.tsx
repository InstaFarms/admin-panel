"use client";

/**
 * Responsibilities tab — per-property responsibility OVERRIDES.
 *
 * THE PROBLEM THIS SOLVES: the engine's default source, the V0
 * `staffPropertyAssignments` table, only knows CARETAKER|SUPERVISOR roles, so it
 * collapses REVIEWER/APPROVER/OBSERVER/ESCALATION_CONTACT onto the SINGLE primary
 * supervisor — you cannot make person X the REVIEWER and person Y the APPROVER.
 *
 * An override (opsResponsibilityMappings) pins a DISTINCT person to one
 * responsibility. The engine reads it FIRST (ops-engine-service.resolveResponsibility),
 * so the very next generated instance stamps that person on that workflow step.
 * This is DISTINCT from the property's default staff assignment (edited elsewhere):
 * removing an override falls the responsibility back to that default.
 *
 * `userId` id-space rule (mirrors assigneeUserId): EXECUTOR → a caretaker
 * (users.id); every other responsibility → a supervisor (supervisors.id). The
 * person picker is filtered by this rule so the wrong kind cannot be chosen.
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
import { HiOutlineUserGroup } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  getResponsibilityCandidates,
  getResponsibilityOverrides,
  removeResponsibilityOverride,
  setResponsibilityOverride,
  type OpsResponsibility,
  type OpsResponsibilityCandidate,
  type OpsResponsibilityOverride,
} from "@/actions/opsConfigActions";
import { OPS_CONFIG_EMPTY } from "@/constants/opsConfig";
import { parseServerActionResult } from "@/utils/utils";

/** Responsibilities the override editor exposes. EXECUTOR is included but the
 *  common case is splitting the supervisor responsibilities. */
const OVERRIDABLE_RESPONSIBILITIES: {
  value: OpsResponsibility;
  label: string;
}[] = [
  { value: "REVIEWER", label: "Reviewer (verify step)" },
  { value: "APPROVER", label: "Approver (approve step)" },
  { value: "OBSERVER", label: "Observer" },
  { value: "ESCALATION_CONTACT", label: "Escalation contact" },
  { value: "EXECUTOR", label: "Executor (caretaker)" },
];

/** The id space each responsibility draws its person from. */
function roleForResponsibility(
  responsibility: OpsResponsibility,
): "CARETAKER" | "SUPERVISOR" {
  return responsibility === "EXECUTOR" ? "CARETAKER" : "SUPERVISOR";
}

export default function ResponsibilitiesSection({
  propertyId,
}: {
  organizationId: string;
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<OpsResponsibilityOverride[]>([]);
  const [candidates, setCandidates] = useState<OpsResponsibilityCandidate[]>([]);
  const [busy, startBusy] = useTransition();

  // New override form.
  const [responsibility, setResponsibility] =
    useState<OpsResponsibility>("REVIEWER");
  const [userId, setUserId] = useState("");
  const [priority, setPriority] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextOverrides, nextCandidates] = await Promise.all([
        getResponsibilityOverrides(propertyId),
        getResponsibilityCandidates(propertyId),
      ]);
      setOverrides(nextOverrides);
      setCandidates(nextCandidates);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load responsibility overrides",
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Candidates valid for the currently-selected responsibility.
  const eligibleCandidates = useMemo(() => {
    const role = roleForResponsibility(responsibility);
    return candidates.filter((c) => c.role === role);
  }, [candidates, responsibility]);

  // Reset the person when the responsibility (and therefore the eligible set) changes.
  useEffect(() => {
    setUserId(eligibleCandidates[0]?.id ?? "");
  }, [eligibleCandidates]);

  const candidateName = useCallback(
    (id: string) => candidates.find((c) => c.id === id)?.name ?? null,
    [candidates],
  );

  const handleSave = useCallback(() => {
    if (!userId) {
      toast.error("Pick a person to assign");
      return;
    }
    const priorityValue = priority.trim() === "" ? undefined : Number(priority);
    if (priorityValue !== undefined && (!Number.isInteger(priorityValue) || priorityValue < 0)) {
      toast.error("Priority must be a whole number ≥ 0");
      return;
    }
    startBusy(() => {
      toast
        .promise(
          parseServerActionResult(
            setResponsibilityOverride({
              propertyId,
              responsibility,
              userId,
              ...(priorityValue !== undefined ? { priority: priorityValue } : {}),
            }),
          ),
          {
            loading: "Saving override...",
            success: (message) => message || "Override saved",
            error: (error: Error) => error.message || "Failed to save override",
          },
        )
        .then(() => {
          setPriority("");
          return load();
        })
        .catch(() => undefined);
    });
  }, [load, priority, propertyId, responsibility, userId]);

  const handleRemove = useCallback(
    (id: string) => {
      startBusy(() => {
        toast
          .promise(parseServerActionResult(removeResponsibilityOverride(id)), {
            loading: "Removing override...",
            success: (message) =>
              message || "Override removed — default assignment restored",
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
        Responsibility overrides let you assign a <strong>distinct person</strong>{" "}
        per responsibility — so the <strong>Reviewer</strong> and{" "}
        <strong>Approver</strong> can be different supervisors on the same
        property. Without an override each responsibility falls back to the
        property&apos;s default staff (caretaker executes; the primary supervisor
        reviews/approves). Changes affect <strong>future</strong> instances only.
      </div>

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineUserGroup className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Responsibility overrides
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              One row per (responsibility, person). Highest priority wins when a
              responsibility has more than one. Supervisors fill Reviewer /
              Approver / Observer / Escalation; caretakers fill Executor.
            </p>
          </div>
        </div>

        {overrides.length === 0 ? (
          <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
            {OPS_CONFIG_EMPTY.responsibilityOverrides}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Responsibility</TableHeadCell>
                  <TableHeadCell>Assigned person</TableHeadCell>
                  <TableHeadCell>Priority</TableHeadCell>
                  <TableHeadCell>
                    <span className="sr-only">Actions</span>
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {overrides.map((override) => (
                  <TableRow
                    key={override.id}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <TableCell>
                      <Badge color="purple" className="inline-flex w-fit">
                        {override.responsibility}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {override.assigneeName ??
                        candidateName(override.userId) ??
                        "—"}
                      <span className="ml-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {override.userId}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                      {override.priority}
                    </TableCell>
                    <TableCell>
                      <MyButton
                        size="xs"
                        color="light"
                        loading={busy}
                        onClick={() => handleRemove(override.id)}
                      >
                        Remove (restore default)
                      </MyButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid gap-3 border-t border-gray-200 pt-3 dark:border-gray-700 md:grid-cols-3">
          <div>
            <Label htmlFor="resp-responsibility">Responsibility</Label>
            <Select
              id="resp-responsibility"
              value={responsibility}
              onChange={(e) =>
                setResponsibility(e.target.value as OpsResponsibility)
              }
            >
              {OVERRIDABLE_RESPONSIBILITIES.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="resp-person">
              Person ({roleForResponsibility(responsibility).toLowerCase()})
            </Label>
            <Select
              id="resp-person"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {eligibleCandidates.length === 0 ? (
                <option value="">— none assigned to this property —</option>
              ) : null}
              {eligibleCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.id}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="resp-priority">Priority (optional)</Label>
            <TextInput
              id="resp-priority"
              type="number"
              min={0}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <MyButton
              loading={busy}
              disabled={eligibleCandidates.length === 0}
              onClick={handleSave}
            >
              Save override
            </MyButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
