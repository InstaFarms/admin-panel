"use client";

/**
 * Schedules tab — how often the property's work is generated.
 *
 * Schedules hang off STANDARD ENTRIES, so the chain is
 * property → active standard assignment → entries → schedules. A property with
 * no active standard generates no scheduled work at all, and that is shown
 * honestly rather than papered over.
 *
 * The API can only create a schedule and toggle `enabled` — there is no update
 * and no delete — so no Edit/Delete buttons are rendered.
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
  ToggleSwitch,
} from "flowbite-react";
import { HiOutlineCalendar, HiOutlineClock } from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  assignStandard,
  createSchedule,
  getActiveStandard,
  getOperations,
  getPropertySchedules,
  getStandards,
  setScheduleEnabled,
  type OpsOperation,
  type OpsPropertyScheduleGroup,
  type OpsSchedule,
  type OpsStandard,
  type OpsStandardAssignment,
} from "@/actions/opsConfigActions";
import {
  RECURRENCE_HINT,
  SCHEDULE_EVENT_TYPES,
  SCHEDULE_TRIGGER_TYPES,
  TIME_OF_DAY_HINT,
} from "@/constants/opsConfig";
import { parseServerActionResult } from "@/utils/utils";

/** The engine parses these itself — validate before the 409 round-trip. */
const RECURRENCE_RE = /^(DAILY|WEEKLY:[A-Z]{3}(,[A-Z]{3})*|MONTHLY:\d{1,2}(,\d{1,2})*)$/;
const TIME_OF_DAY_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------------------------------------------------------------------------

function ScheduleTable({
  schedules,
  onToggled,
}: {
  schedules: OpsSchedule[];
  onToggled: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = useCallback(
    (schedule: OpsSchedule) => {
      setBusyId(schedule.id);
      toast
        .promise(
          parseServerActionResult(
            setScheduleEnabled(schedule.id, !schedule.enabled),
          ),
          {
            loading: "Updating schedule...",
            success: (message) => message || "Schedule updated",
            error: (error: Error) => error.message || "Failed to update schedule",
          },
        )
        .then(() => onToggled())
        .catch(() => undefined)
        .finally(() => setBusyId(null));
    },
    [onToggled],
  );

  if (schedules.length === 0) {
    return (
      <p className="py-3 text-sm text-gray-500 dark:text-gray-400">
        No schedules on this entry — it generates nothing on its own.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeadCell>Trigger</TableHeadCell>
            <TableHeadCell>When</TableHeadCell>
            <TableHeadCell>Due offset</TableHeadCell>
            <TableHeadCell>Lead</TableHeadCell>
            <TableHeadCell>Timezone</TableHeadCell>
            <TableHeadCell>Enabled</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody className="divide-y">
          {schedules.map((schedule) => (
            <TableRow
              key={schedule.id}
              className="bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <TableCell>
                <Badge
                  color={schedule.triggerType === "TIME" ? "info" : "purple"}
                  className="inline-flex w-fit"
                >
                  {schedule.triggerType}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm text-gray-700 dark:text-gray-200">
                {schedule.triggerType === "TIME"
                  ? `${schedule.recurrence ?? "—"} @ ${schedule.timeOfDay ?? "—"}`
                  : `${schedule.eventType ?? "—"}${
                      schedule.eventOffsetMinutes
                        ? ` +${schedule.eventOffsetMinutes}m`
                        : ""
                    }`}
              </TableCell>
              <TableCell className="text-sm">
                {schedule.dueOffsetMinutes} min
              </TableCell>
              <TableCell className="text-sm">{schedule.leadMinutes} min</TableCell>
              <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                {schedule.timezone}
              </TableCell>
              <TableCell>
                <ToggleSwitch
                  checked={schedule.enabled}
                  disabled={busyId === schedule.id}
                  label=""
                  onChange={() => toggle(schedule)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CreateScheduleForm({
  standardProfileMapId,
  onCreated,
}: {
  standardProfileMapId: string;
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [triggerType, setTriggerType] = useState<"TIME" | "EVENT">("TIME");
  const [recurrence, setRecurrence] = useState("DAILY");
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [eventType, setEventType] = useState<string>(SCHEDULE_EVENT_TYPES[0]);
  const [eventOffsetMinutes, setEventOffsetMinutes] = useState("0");
  const [dueOffsetMinutes, setDueOffsetMinutes] = useState("240");
  const [leadMinutes, setLeadMinutes] = useState("120");
  const [creating, startCreate] = useTransition();

  const handleCreate = useCallback(() => {
    const formData = new FormData();
    formData.append("standardProfileMapId", standardProfileMapId);
    formData.append("triggerType", triggerType);

    if (triggerType === "TIME") {
      const cleanRecurrence = recurrence.trim().toUpperCase();
      const cleanTime = timeOfDay.trim();
      if (!RECURRENCE_RE.test(cleanRecurrence)) {
        toast.error(`Recurrence must be one of ${RECURRENCE_HINT}`);
        return;
      }
      if (!TIME_OF_DAY_RE.test(cleanTime)) {
        toast.error(`Time of day must be ${TIME_OF_DAY_HINT}`);
        return;
      }
      formData.append("recurrence", cleanRecurrence);
      formData.append("timeOfDay", cleanTime);
    } else {
      if (!eventType.trim()) {
        toast.error("An EVENT schedule needs an event type");
        return;
      }
      formData.append("eventType", eventType.trim());
      formData.append("eventOffsetMinutes", String(Number(eventOffsetMinutes) || 0));
    }

    const due = Number(dueOffsetMinutes);
    const lead = Number(leadMinutes);
    if (!Number.isFinite(due) || due <= 0) {
      toast.error("Due offset must be a positive number of minutes");
      return;
    }
    if (!Number.isFinite(lead) || lead < 0) {
      toast.error("Lead minutes must be zero or more");
      return;
    }
    formData.append("dueOffsetMinutes", String(due));
    formData.append("leadMinutes", String(lead));

    startCreate(() => {
      toast
        .promise(parseServerActionResult(createSchedule(formData)), {
          loading: "Creating schedule...",
          success: (message) => message || "Schedule created",
          error: (error: Error) => error.message || "Failed to create schedule",
        })
        .then(() => {
          setOpen(false);
          return onCreated();
        })
        .catch(() => undefined);
    });
  }, [
    dueOffsetMinutes,
    eventOffsetMinutes,
    eventType,
    leadMinutes,
    onCreated,
    recurrence,
    standardProfileMapId,
    timeOfDay,
    triggerType,
  ]);

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
      <MyButton size="xs" color="light" onClick={() => setOpen((v) => !v)}>
        {open ? "Cancel" : "Add schedule"}
      </MyButton>

      {open ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor={`trigger-${standardProfileMapId}`}>Trigger</Label>
            <Select
              id={`trigger-${standardProfileMapId}`}
              value={triggerType}
              onChange={(e) =>
                setTriggerType(e.target.value === "EVENT" ? "EVENT" : "TIME")
              }
            >
              {SCHEDULE_TRIGGER_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          {triggerType === "TIME" ? (
            <>
              <div>
                <Label htmlFor={`rec-${standardProfileMapId}`}>
                  Recurrence — {RECURRENCE_HINT}
                </Label>
                <TextInput
                  id={`rec-${standardProfileMapId}`}
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  placeholder="DAILY"
                />
              </div>
              <div>
                <Label htmlFor={`tod-${standardProfileMapId}`}>
                  Time of day — {TIME_OF_DAY_HINT}
                </Label>
                <TextInput
                  id={`tod-${standardProfileMapId}`}
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  placeholder="09:00"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor={`evt-${standardProfileMapId}`}>Event type</Label>
                <Select
                  id={`evt-${standardProfileMapId}`}
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  {SCHEDULE_EVENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`evtoff-${standardProfileMapId}`}>
                  Event offset (min)
                </Label>
                <TextInput
                  id={`evtoff-${standardProfileMapId}`}
                  type="number"
                  value={eventOffsetMinutes}
                  onChange={(e) => setEventOffsetMinutes(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor={`due-${standardProfileMapId}`}>
              Due offset (min)
            </Label>
            <TextInput
              id={`due-${standardProfileMapId}`}
              type="number"
              min={1}
              value={dueOffsetMinutes}
              onChange={(e) => setDueOffsetMinutes(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`lead-${standardProfileMapId}`}>Lead (min)</Label>
            <TextInput
              id={`lead-${standardProfileMapId}`}
              type="number"
              min={0}
              value={leadMinutes}
              onChange={(e) => setLeadMinutes(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <MyButton size="sm" loading={creating} onClick={handleCreate}>
              Create schedule
            </MyButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function SchedulesSection({
  organizationId,
  propertyId,
}: {
  organizationId: string;
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<OpsStandardAssignment | null>(
    null,
  );
  const [standards, setStandards] = useState<OpsStandard[]>([]);
  const [groups, setGroups] = useState<OpsPropertyScheduleGroup[]>([]);
  const [operations, setOperations] = useState<OpsOperation[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [assigning, startAssign] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The active standard first: null is the whole story for this tab.
      const activeAssignment = await getActiveStandard(propertyId);
      setAssignment(activeAssignment);

      const [allStandards, allOperations] = await Promise.all([
        getStandards(organizationId),
        getOperations(organizationId),
      ]);
      setStandards(allStandards);
      setOperations(allOperations);

      setGroups(activeAssignment ? await getPropertySchedules(propertyId) : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load schedules",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Only PUBLISHED standards can be assigned — the API 409s otherwise. */
  const publishedStandards = useMemo(
    () => standards.filter((standard) => standard.status === "PUBLISHED"),
    [standards],
  );

  const operationById = useMemo(() => {
    const map = new Map<string, OpsOperation>();
    for (const operation of operations) map.set(operation.id, operation);
    return map;
  }, [operations]);

  const activeStandardName = useMemo(() => {
    if (!assignment) return null;
    return (
      standards.find((standard) => standard.id === assignment.standardId)?.name ??
      assignment.standardId
    );
  }, [assignment, standards]);

  const handleAssign = useCallback(() => {
    if (!selectedStandardId) {
      toast.error("Pick a published standard first");
      return;
    }
    startAssign(() => {
      toast
        .promise(
          parseServerActionResult(
            assignStandard({ propertyId, standardId: selectedStandardId }),
          ),
          {
            loading: "Assigning standard...",
            success: (message) =>
              message || "Standard assigned (future instances only)",
            error: (error: Error) => error.message || "Failed to assign standard",
          },
        )
        .then(() => load())
        .catch(() => undefined);
    });
  }, [load, propertyId, selectedStandardId]);

  const standardPicker = (label: string) => (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="assign-standard">{label}</Label>
        <Select
          id="assign-standard"
          value={selectedStandardId}
          onChange={(e) => setSelectedStandardId(e.target.value)}
        >
          <option value="">— select —</option>
          {publishedStandards.map((standard) => (
            <option key={standard.id} value={standard.id}>
              {standard.name}
            </option>
          ))}
        </Select>
      </div>
      <MyButton loading={assigning} onClick={handleAssign}>
        Assign
      </MyButton>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <JarvisLoader size="lg" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
            <HiOutlineCalendar className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              No standard assigned — this property generates no scheduled work
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Schedules hang off a standard&apos;s entries. Until a PUBLISHED
              standard is assigned here, nothing is ever generated for this
              property, however the catalog and operations are configured.
            </p>
          </div>
        </div>

        {publishedStandards.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            There are no PUBLISHED standards in this organization yet. Only
            published standards can be assigned.
          </p>
        ) : (
          standardPicker("Published standard")
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        Active standard: <strong>{activeStandardName}</strong>. Assigning a
        different standard affects <strong>future</strong> instances only —
        nothing already generated changes.
        <br />
        <br />
        Schedules are <strong>append-and-disable</strong>: only{" "}
        <span className="font-mono">enabled</span> can be changed and there is no
        delete. To change a recurrence or a time, create a new schedule and
        disable the old one — that is why there are no Edit/Delete buttons below.
        Timezone is read-only; the API cannot set it.
      </div>

      {publishedStandards.length > 0 ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          {standardPicker("Reassign standard")}
        </Card>
      ) : null}

      {groups.length === 0 ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The assigned standard has no entries, so there is nothing to
            schedule. Add operation → execution-profile entries to the standard
            first.
          </p>
        </Card>
      ) : (
        groups.map((group) => {
          const operation = operationById.get(group.operationId);
          return (
            <Card
              key={group.entry.id}
              className="w-full bg-white dark:bg-gray-800"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                  <HiOutlineClock className="h-5 w-5" />
                </span>
                <div>
                  <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                    {operation?.name ?? group.operationId}
                  </h5>
                  <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {operation?.code ?? "unknown operation"}
                    {group.entry.enabled ? "" : " · entry disabled in standard"}
                  </p>
                </div>
              </div>

              <ScheduleTable schedules={group.schedules} onToggled={load} />

              <CreateScheduleForm
                standardProfileMapId={group.entry.id}
                onCreated={load}
              />
            </Card>
          );
        })
      )}
    </div>
  );
}
