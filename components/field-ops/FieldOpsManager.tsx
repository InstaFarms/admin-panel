"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

import { JarvisLoader } from "@/components/JarvisLogo";
import {
  HiOutlineClipboardCheck,
  HiOutlineClipboardList,
  HiOutlineExclamation,
  HiOutlineLightningBolt,
  HiOutlineOfficeBuilding,
  HiOutlinePhotograph,
  HiOutlineRefresh,
  HiOutlineUsers,
} from "react-icons/hi";

import PropertySelector from "@/components/PropertySelector";
import MyButton from "@/components/MyButton";
import {
  createTaskTemplate,
  updateTaskTemplate,
  setPrimaryAssignment,
  getAssignments,
  getMeterConfig,
  getPropertyActivityFeed,
  getTaskTemplates,
  updateMeterConfig,
  type PropertyActivityFeed,
  type StaffAssignment,
  type TaskTemplate,
} from "@/actions/fieldOpsActions";

const TASK_KINDS = ["DAILY", "EVENT"] as const;

// ---------------------------------------------------------------------------
// Meter threshold config
// ---------------------------------------------------------------------------

function MeterConfigSection({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(true);
  const [bookingDay, setBookingDay] = useState("");
  const [nonBookingDay, setNonBookingDay] = useState("");
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMeterConfig(propertyId)
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          toast.error(res.error || "Failed to load meter config");
          return;
        }
        setBookingDay(
          res.data?.bookingDayExpectedUnits != null
            ? String(res.data.bookingDayExpectedUnits)
            : "",
        );
        setNonBookingDay(
          res.data?.nonBookingDayExpectedUnits != null
            ? String(res.data.nonBookingDayExpectedUnits)
            : "",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId]);

  const handleSave = () => {
    const bookingDayValue = Number(bookingDay);
    const nonBookingDayValue = Number(nonBookingDay);
    if (
      !Number.isFinite(bookingDayValue) ||
      !Number.isFinite(nonBookingDayValue) ||
      bookingDayValue < 0 ||
      nonBookingDayValue < 0
    ) {
      toast.error("Please enter valid non-negative unit values.");
      return;
    }

    startSaving(async () => {
      const res = await updateMeterConfig({
        propertyId,
        bookingDayExpectedUnits: bookingDayValue,
        nonBookingDayExpectedUnits: nonBookingDayValue,
      });
      if (res.success) {
        toast.success("Meter thresholds saved.");
      } else {
        toast.error(res.error || "Failed to save meter config");
      }
    });
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          <HiOutlineLightningBolt className="h-5 w-5" />
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Meter Thresholds
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Expected electricity units used to flag abnormal consumption.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <JarvisLoader size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bookingDayUnits">Booking-day expected units</Label>
              <TextInput
                id="bookingDayUnits"
                type="number"
                min={0}
                value={bookingDay}
                onChange={(e) => setBookingDay(e.target.value)}
                placeholder="e.g. 40"
              />
            </div>
            <div>
              <Label htmlFor="nonBookingDayUnits">
                Non-booking-day expected units
              </Label>
              <TextInput
                id="nonBookingDayUnits"
                type="number"
                min={0}
                value={nonBookingDay}
                onChange={(e) => setNonBookingDay(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <div>
            <MyButton onClick={handleSave} loading={saving} type="button">
              Save Thresholds
            </MyButton>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Task templates
// ---------------------------------------------------------------------------

function TaskTemplatesSection({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof TASK_KINDS)[number]>("DAILY");
  const [saving, startSaving] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (template: TaskTemplate) => {
    const next = template.isActive === false;
    setTogglingId(template.id);
    const res = await updateTaskTemplate(template.id, { isActive: next });
    setTogglingId(null);
    if (res.success) {
      toast.success(
        next
          ? "Task activated — caretakers see it from today."
          : "Task disabled — hidden from caretakers, linked generation stops.",
      );
      load();
    } else {
      toast.error(res.error || "Failed to update task");
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    getTaskTemplates(propertyId)
      .then((res) => {
        if (!res.success) {
          toast.error(res.error || "Failed to load task templates");
          return;
        }
        setTemplates(res.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Please enter a task title.");
      return;
    }
    startSaving(async () => {
      const res = await createTaskTemplate({
        propertyId,
        title: trimmed,
        // The API enum is RECURRING|EVENT; "DAILY" is only the display word.
        // Sending "DAILY" made every create 400.
        kind: kind === "DAILY" ? "RECURRING" : kind,
      });
      if (res.success) {
        toast.success("Task template created.");
        setTitle("");
        load();
      } else {
        toast.error(res.error || "Failed to create task template");
      }
    });
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          <HiOutlineClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Task Templates
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recurring (daily) and event-based task definitions for caretakers.
          </p>
        </div>
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <Label htmlFor="taskTitle">Task title</Label>
          <TextInput
            id="taskTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Clean the pool"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
        </div>
        <div>
          <Label htmlFor="taskKind">Kind</Label>
          <Select
            id="taskKind"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as (typeof TASK_KINDS)[number])
            }
          >
            {TASK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </div>
        <MyButton onClick={handleCreate} loading={saving} type="button">
          Add Task
        </MyButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <JarvisLoader size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>Title</TableHeadCell>
                <TableHeadCell>Kind</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {templates.map((template) => {
                const active = template.isActive !== false;
                const pending = !active && template.config?.pendingRequest === true;
                return (
                  <TableRow
                    key={template.id}
                    className="bg-white hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {template.title}
                      {pending && template.config?.requestNote ? (
                        <p className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400 whitespace-pre-line">
                          {template.config.requestNote}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={template.kind === "EVENT" ? "warning" : "info"}
                        className="w-fit"
                      >
                        {template.kind === "RECURRING" ? "DAILY" : template.kind}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={active ? "success" : pending ? "warning" : "gray"}
                        className="w-fit"
                      >
                        {active ? "Active" : pending ? "Requested by supervisor" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <MyButton
                        color={active ? "light" : "success"}
                        size="xs"
                        type="button"
                        loading={togglingId === template.id}
                        onClick={() => handleToggleActive(template)}
                        title={
                          active
                            ? "Hide from caretakers and stop linked generation"
                            : "Approve: caretakers see this task from today"
                        }
                      >
                        {active ? "Disable" : pending ? "Approve & activate" : "Activate"}
                      </MyButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No task templates yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Staff assignments
// ---------------------------------------------------------------------------

function AssignmentsSection({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAssignments(propertyId)
      .then((res) => {
        if (!res.success) {
          toast.error(res.error || "Failed to load assignments");
          return;
        }
        // The endpoint returns soft-deactivated rows too — hide them here.
        setAssignments((res.data ?? []).filter((a) => a.isActive !== false));
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMakePrimary = async (assignment: StaffAssignment) => {
    setRemovingId(assignment.id);
    const res = await setPrimaryAssignment(assignment.id);
    setRemovingId(null);
    if (res.success) {
      toast.success("Primary assignee updated — generated work goes to them first.");
      load();
    } else {
      toast.error(res.error || "Failed to set primary");
    }
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
          <HiOutlineUsers className="h-5 w-5" />
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Staff Assignments
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Synchronized scope. Assign inspection, maintenance, and guest
            supervisors in Properties &rarr; People &amp; Roles; assign
            caretakers in Users &rarr; Caretakers. Changes are mirrored here
            automatically, so field ops and audit access cannot disagree. The
            primary selector only controls who receives generated work first.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <JarvisLoader size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>Staff</TableHeadCell>
                <TableHeadCell>Role</TableHeadCell>
                <TableHeadCell>Primary</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {assignments.map((assignment) => (
                <TableRow
                  key={assignment.id}
                  className="bg-white hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {assignment.staffName || assignment.staffId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={
                        assignment.role === "SUPERVISOR" ? "purple" : "info"
                      }
                      className="w-fit"
                    >
                      {assignment.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignment.isPrimary ? (
                      <Badge color="success" className="w-fit">
                        Primary
                      </Badge>
                    ) : (
                      <MyButton
                        color="light"
                        size="xs"
                        type="button"
                        loading={removingId === assignment.id}
                        onClick={() => handleMakePrimary(assignment)}
                        title="Generated work is assigned to the primary staff member first"
                      >
                        Make primary
                      </MyButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No staff assigned to this property yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Manager shell (property selection + sections)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Caretaker activity feed (READ-ONLY)
// ---------------------------------------------------------------------------

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** A photo cell: thumbnail that opens the full image in a new tab. */
function PhotoThumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
        <HiOutlinePhotograph className="h-4 w-4" />
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open full photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="h-10 w-10 rounded-md object-cover ring-1 ring-gray-200 transition hover:ring-2 hover:ring-blue-400 dark:ring-gray-600"
      />
    </a>
  );
}

function ActivityStat({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint?: "red";
}) {
  return (
    <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
      <p
        className={`text-xl font-bold ${
          tint === "red"
            ? "text-red-600 dark:text-red-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ActivitySection({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<PropertyActivityFeed | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getPropertyActivityFeed(propertyId)
      .then((res) => {
        if (!res.success) {
          toast.error(res.error || "Failed to load activity");
          setFeed(null);
          return;
        }
        setFeed(res.data ?? null);
      })
      .finally(() => setLoading(false));
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const tasks = feed?.tasks ?? [];
  const meters = feed?.meters ?? [];
  const guestIds = feed?.guestIds ?? [];
  const deposits = feed?.deposits ?? [];
  const declarations = feed?.declarations ?? [];
  const reviews = feed?.reviews ?? [];
  const anomalyCount = meters.filter((m) => m.isAnomaly).length;
  const isEmpty =
    !!feed &&
    tasks.length === 0 &&
    meters.length === 0 &&
    guestIds.length === 0 &&
    deposits.length === 0 &&
    declarations.length === 0 &&
    reviews.length === 0;

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
            <HiOutlineClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Caretaker Activity
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Read-only view of recent caretaker work — tasks, meter readings,
              guest IDs, deposits, declarations &amp; reviews (with photos).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Refresh"
        >
          <HiOutlineRefresh className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <JarvisLoader size="md" />
        </div>
      ) : isEmpty ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No caretaker activity recorded for this property yet.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Summary */}
          <div className="flex gap-3">
            <ActivityStat label="Task logs" value={tasks.length} />
            <ActivityStat label="Meter readings" value={meters.length} />
            <ActivityStat
              label="Anomalies"
              value={anomalyCount}
              tint={anomalyCount > 0 ? "red" : undefined}
            />
          </div>

          {/* Tasks */}
          {tasks.length > 0 && (
            <div>
              <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tasks
              </h6>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Photo</TableHeadCell>
                      <TableHeadCell>Task</TableHeadCell>
                      <TableHeadCell>For date</TableHeadCell>
                      <TableHeadCell>AI / Verdict</TableHeadCell>
                      <TableHeadCell>Logged</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {tasks.map((t) => (
                      <TableRow
                        key={t.id}
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        <TableCell>
                          <PhotoThumb url={t.mediaUrl} alt={t.title} />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {t.title}
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            {t.kind}
                          </span>
                        </TableCell>
                        <TableCell>{t.forDate}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {t.aiPoolStatus && (
                              <Badge
                                color={
                                  t.aiPoolStatus === "CLEAN"
                                    ? "success"
                                    : t.aiPoolStatus === "DIRTY"
                                      ? "failure"
                                      : "warning"
                                }
                              >
                                AI: {t.aiPoolStatus}
                              </Badge>
                            )}
                            {t.supervisorVerdict && (
                              <Badge
                                color={
                                  t.supervisorVerdict === "CLEAN"
                                    ? "success"
                                    : "failure"
                                }
                              >
                                Verdict: {t.supervisorVerdict}
                              </Badge>
                            )}
                            {!t.aiPoolStatus && !t.supervisorVerdict && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {fmtDateTime(t.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Meters */}
          {meters.length > 0 && (
            <div>
              <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Meter readings
              </h6>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Photo</TableHeadCell>
                      <TableHeadCell>Reading</TableHeadCell>
                      <TableHeadCell>Consumption</TableHeadCell>
                      <TableHeadCell>For date</TableHeadCell>
                      <TableHeadCell>Flags</TableHeadCell>
                      <TableHeadCell>Logged</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {meters.map((m) => (
                      <TableRow
                        key={m.id}
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        <TableCell>
                          <PhotoThumb url={m.mediaUrl} alt="Meter reading" />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {m.readingValue}
                        </TableCell>
                        <TableCell>
                          {m.consumption != null ? `+${m.consumption}` : "—"}
                        </TableCell>
                        <TableCell>{m.forDate}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {m.isAnomaly && (
                              <Badge color="failure" icon={HiOutlineExclamation}>
                                Anomaly
                              </Badge>
                            )}
                            {m.needsReview && (
                              <Badge color="warning">Check reading</Badge>
                            )}
                            {m.reviewedAt && (
                              <Badge color="success">Verified</Badge>
                            )}
                            {!m.isAnomaly && !m.needsReview && !m.reviewedAt && (
                              <span className="text-xs text-gray-400">OK</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {fmtDateTime(m.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Guest IDs / Deposits / Declarations / Reviews — compact rows */}
          <div className="grid gap-4 md:grid-cols-2">
            {guestIds.length > 0 && (
              <div>
                <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Guest IDs
                </h6>
                <div className="flex flex-col gap-2">
                  {guestIds.map((g) => (
                    <div
                      key={`${g.bookingId}-${g.createdAt}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <span className="text-gray-700 dark:text-gray-200">
                        Booking · {g.bookingId.slice(-6).toUpperCase()}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {g.collectedCount}/{g.expectedCount}
                        </span>
                        <Badge
                          color={
                            g.status === "CLOSED" ||
                            g.collectedCount >= g.expectedCount
                              ? "success"
                              : "warning"
                          }
                        >
                          {g.status}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deposits.length > 0 && (
              <div>
                <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Security deposits
                </h6>
                <div className="flex flex-col gap-2">
                  {deposits.map((d, i) => (
                    <div
                      key={`${d.bookingId}-${d.createdAt}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <span className="flex items-center gap-2">
                        <PhotoThumb url={d.proofMediaUrl} alt="Deposit proof" />
                        <span className="text-gray-700 dark:text-gray-200">
                          ₹{d.amount} · {d.method}
                        </span>
                      </span>
                      <Badge
                        color={d.direction === "COLLECTED" ? "info" : "success"}
                      >
                        {d.direction}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {declarations.length > 0 && (
              <div>
                <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Declarations
                </h6>
                <div className="flex flex-col gap-2">
                  {declarations.map((d, i) => (
                    <div
                      key={`${d.bookingId}-${d.createdAt}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <PhotoThumb url={d.mediaUrl} alt="Declaration" />
                      <span className="text-gray-700 dark:text-gray-200">
                        Booking · {d.bookingId.slice(-6).toUpperCase()}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">
                        {fmtDateTime(d.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviews.length > 0 && (
              <div>
                <h6 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Guest reviews
                </h6>
                <div className="flex flex-col gap-2">
                  {reviews.map((r, i) => (
                    <div
                      key={`${r.bookingId}-${r.createdAt}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <PhotoThumb url={r.mediaUrl} alt="Review" />
                      <span className="text-gray-700 dark:text-gray-200">
                        Booking · {r.bookingId.slice(-6).toUpperCase()}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">
                        {fmtDateTime(r.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function FieldOpsManager() {
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const update = useCallback((next: string | null) => {
    setPropertyId(next);
  }, []);

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fieldOpsProperty">Property</Label>
          <div className="max-w-xl">
            <PropertySelector propertyId={propertyId} update={update} loadAllByDefault />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a property to configure its field-ops settings.
          </p>
        </div>
      </Card>

      {propertyId ? (
        <>
          <ActivitySection key={`activity-${propertyId}`} propertyId={propertyId} />
          <MeterConfigSection key={`meter-${propertyId}`} propertyId={propertyId} />
          <TaskTemplatesSection
            key={`tasks-${propertyId}`}
            propertyId={propertyId}
          />
          <AssignmentsSection
            key={`assign-${propertyId}`}
            propertyId={propertyId}
          />
        </>
      ) : (
        <Card className="w-full bg-white dark:bg-gray-800">
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              <HiOutlineOfficeBuilding className="h-6 w-6" />
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose a property above to view caretaker activity and manage meter
              thresholds, task templates, and staff assignments.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
