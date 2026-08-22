"use client";

/**
 * Generation Errors tab — the honesty panel.
 *
 * Saving configuration does not create work: an instance only exists once the
 * engine generates one. On this environment the scheduler is disabled
 * (OPS_ENGINE_ENABLED=false) and even when enabled the cron runs every five
 * minutes, so this tab exposes an explicit tick and an explicit one-off
 * generation rather than pretending a save is enough.
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Card,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from "flowbite-react";
import {
  HiOutlineExclamation,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
} from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  generateInstanceNow,
  getGenerationErrors,
  resolveGenerationError,
  tickOpsEngine,
  type OpsGenerationError,
} from "@/actions/opsConfigActions";
import { parseServerActionResult } from "@/utils/utils";

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN");
}

function summarisePayload(payload: unknown): string {
  if (payload === null || payload === undefined) return "—";
  try {
    const text = JSON.stringify(payload);
    return text.length > 180 ? `${text.slice(0, 180)}…` : text;
  } catch {
    return "—";
  }
}

export default function GenerationHealthSection({
  propertyId,
}: {
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<OpsGenerationError[]>([]);
  const [ticking, startTick] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [operationCode, setOperationCode] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setErrors(await getGenerationErrors());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load generation errors",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTick = useCallback(() => {
    startTick(() => {
      toast
        .promise(parseServerActionResult(tickOpsEngine()), {
          loading: "Running engine tick...",
          success: (message) => message || "Engine tick complete",
          error: (error: Error) => error.message || "Engine tick failed",
        })
        .then(() => load())
        .catch(() => undefined);
    });
  }, [load]);

  const handleGenerate = useCallback(() => {
    const code = operationCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter the operation code to generate");
      return;
    }
    let dueAtIso: string | undefined;
    if (dueAt) {
      const parsed = new Date(dueAt);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Due at is not a valid date/time");
        return;
      }
      dueAtIso = parsed.toISOString();
    }

    startGenerate(() => {
      toast
        .promise(
          parseServerActionResult(
            generateInstanceNow({
              propertyId,
              operationCode: code,
              ...(dueAtIso ? { dueAt: dueAtIso } : {}),
            }),
          ),
          {
            loading: "Generating instance...",
            success: (message) => message || "Instance generated",
            error: (error: Error) =>
              error.message || "Failed to generate instance",
          },
        )
        .then(() => load())
        .catch(() => undefined);
    });
  }, [dueAt, load, operationCode, propertyId]);

  /**
   * Resolving RECORDS that a human fixed the cause — it does not retry
   * generation, so the row is cleared and the engine re-tried separately.
   */
  const handleResolve = useCallback(
    (id: string) => {
      setResolvingId(id);
      toast
        .promise(parseServerActionResult(resolveGenerationError(id)), {
          loading: "Marking resolved...",
          success: (message) => message || "Generation error resolved",
          error: (error: Error) => error.message || "Failed to resolve",
        })
        .then(() => load())
        .catch(() => undefined)
        .finally(() => setResolvingId(null));
    },
    [load],
  );

  const orderedErrors = [
    ...errors.filter((row) => row.propertyId === propertyId),
    ...errors.filter((row) => row.propertyId !== propertyId),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
        <strong>Saving configuration does not create work.</strong> Work exists
        only once the engine generates an instance, and the scheduler is
        currently disabled on this API (
        <span className="font-mono">OPS_ENGINE_ENABLED=false</span>); even where
        it is enabled the cron runs every five minutes. Use the buttons below to
        force generation.
        <br />
        <br />
        The caretaker and supervisor apps refetch{" "}
        <span className="font-mono">/ops/my-work</span> on screen focus and
        pull-to-refresh — there are no sockets and no polling — so a newly
        generated instance appears the next time that screen is focused.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <HiOutlineRefresh className="h-5 w-5" />
            </span>
            <div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Run engine tick now
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Runs TIME-based generation immediately, for every property. It is
                idempotent — safe to press repeatedly and safe alongside the
                cron.
              </p>
            </div>
          </div>
          <MyButton loading={ticking} onClick={handleTick}>
            Run engine tick now
          </MyButton>
        </Card>

        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <HiOutlineLightningBolt className="h-5 w-5" />
            </span>
            <div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generate one instance now
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ad-hoc &quot;run this operation at this property&quot;. It goes
                through the identical generation pipeline — no side door.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="gen-op-code">Operation code</Label>
              <TextInput
                id="gen-op-code"
                value={operationCode}
                onChange={(e) => setOperationCode(e.target.value)}
                onBlur={() =>
                  setOperationCode(operationCode.trim().toUpperCase())
                }
                placeholder="POOL_CLEANING"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must match an existing operation code exactly — copy it from the
                Operations tab.
              </p>
            </div>
            <div>
              <Label htmlFor="gen-due-at">Due at (optional)</Label>
              <TextInput
                id="gen-due-at"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
          <MyButton loading={generating} onClick={handleGenerate}>
            Generate one instance now
          </MyButton>
        </Card>
      </div>

      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
              <HiOutlineExclamation className="h-5 w-5" />
            </span>
            <div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generation errors
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Unresolved failures where configuration existed but no work could
                be created. The commonest reason is{" "}
                <span className="font-mono">NO_EXECUTOR_RESOLVABLE</span>: the
                property has no CARETAKER row in staff assignments, so the engine
                has nobody to give the task to and silently produces nothing.
              </p>
            </div>
          </div>
          <MyButton size="xs" color="light" onClick={() => void load()}>
            Refresh
          </MyButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <JarvisLoader size="lg" />
          </div>
        ) : orderedErrors.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No unresolved generation errors.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Reason</TableHeadCell>
                  <TableHeadCell>Scope</TableHeadCell>
                  <TableHeadCell>Schedule</TableHeadCell>
                  <TableHeadCell>Detail</TableHeadCell>
                  <TableHeadCell>When</TableHeadCell>
                  <TableHeadCell>
                    <span className="sr-only">Resolve</span>
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {orderedErrors.map((row) => (
                  <TableRow
                    key={row.id}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <TableCell>
                      <Badge color="failure" className="inline-flex w-fit">
                        {row.reason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.propertyId === propertyId ? (
                        <Badge color="warning" className="inline-flex w-fit">
                          This property
                        </Badge>
                      ) : (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {row.propertyId ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {row.scheduleId ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-md break-words font-mono text-xs text-gray-500 dark:text-gray-400">
                      {summarisePayload(row.payload)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatWhen(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <MyButton
                        size="xs"
                        color="light"
                        loading={resolvingId === row.id}
                        onClick={() => handleResolve(row.id)}
                      >
                        Resolve
                      </MyButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
