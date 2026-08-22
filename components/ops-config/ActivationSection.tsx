"use client";

/**
 * Activate tab — the answer to "why is this property producing no work?".
 *
 * The engine only creates an instance when the ENTIRE chain exists:
 *
 *   organization + catalogs → PUBLISHED workflow → PUBLISHED execution profile
 *   → standard ENTRIES (operation → profile) → standard PUBLISHED + ASSIGNED to
 *   this property → SCHEDULE on each entry → engine tick
 *
 * Break any link and the property is silently inert. This tab shows each link
 * as PRESENT, MISSING or UNKNOWN (a link that could not be READ is never drawn
 * as absent), and offers one button that builds every missing link at once.
 *
 * Fan-out is shown as REAL ROWS, never a count: an asset-gated operation at a
 * property with two pools is listed as two named targets, because that is
 * literally two tasks for the caretaker. Those rows, and the verdict on whether
 * the operation applies here at all, are the ENGINE's own — this tab asks it
 * rather than re-deriving it (see fanOutTargets below).
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Card,
  Checkbox,
  Label,
  Select,
  TextInput,
} from "flowbite-react";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineLightningBolt,
  HiOutlineQuestionMarkCircle,
  HiOutlineXCircle,
} from "react-icons/hi";

import { JarvisLoader } from "@/components/JarvisLogo";
import MyButton from "@/components/MyButton";
import {
  activateOperationsForProperty,
  getPropertyChainState,
  type ActivationReport,
  type ActivationStepStatus,
  type OpsOperation,
  type OpsPropertyChainState,
} from "@/actions/opsConfigActions";
import { applicabilityByOperation } from "@/components/ops-config/OperationsSection";
import {
  ACTIVATION_DEFAULTS,
  ACTIVATION_STEP_LABELS,
  RECURRENCE_HINT,
  SCHEDULE_EVENT_TYPES,
  SCHEDULE_TRIGGER_TYPES,
  TIME_OF_DAY_HINT,
  type ActivationStepKey,
} from "@/constants/opsConfig";

const RECURRENCE_RE = /^(DAILY|WEEKLY:[A-Z]{3}(,[A-Z]{3})*|MONTHLY:\d{1,2}(,\d{1,2})*)$/;
const TIME_OF_DAY_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type LinkState = "PRESENT" | "MISSING" | "UNKNOWN";

const STEP_BADGE_COLORS: Record<ActivationStepStatus, string> = {
  CREATED: "success",
  REUSED: "info",
  OK: "success",
  WARNING: "warning",
  SKIPPED: "gray",
  FAILED: "failure",
};

function LinkRow({
  state,
  title,
  detail,
}: {
  state: LinkState;
  title: string;
  detail: string;
}) {
  const Icon =
    state === "PRESENT"
      ? HiOutlineCheckCircle
      : state === "MISSING"
        ? HiOutlineXCircle
        : HiOutlineQuestionMarkCircle;
  const tone =
    state === "PRESENT"
      ? "text-green-600 dark:text-green-400"
      : state === "MISSING"
        ? "text-red-600 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400";

  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="break-words text-sm text-gray-500 dark:text-gray-400">
          {detail}
        </p>
      </div>
    </li>
  );
}

/**
 * The targets an operation would fan out to here, AS THE ENGINE SEES THEM.
 *
 * This used to be a local re-implementation that compared the required asset
 * type against the property's ACTIVE assets and claimed to be "exactly the rule
 * the engine uses". It was not — the engine also honours the V0 admin gates
 * (METER_READING needs the property's meter configuration; a linked task
 * deactivated in the tasks admin is a kill-switch), so this tab offered to
 * activate work that every tick then declined to generate. The verdict now
 * comes from ops-engine-service.explainApplicability, served with the
 * property's responsibility status; absent it, the row says so.
 */
function fanOutTargets(
  operation: OpsOperation,
  state: OpsPropertyChainState,
): { label: string; applies: boolean; reason: string; known: boolean } {
  const verdict = applicabilityByOperation(state.responsibilityStatus).get(
    operation.id,
  );
  if (!verdict) {
    return {
      label: "—",
      applies: true,
      known: false,
      reason:
        "The engine's verdict for this property could not be read, so this row is unknown — it is not the same as “does not apply”.",
    };
  }
  return {
    label:
      verdict.targets.length > 0
        ? verdict.targets.map((target) => target.label).join(", ")
        : "—",
    applies: verdict.applies,
    known: true,
    reason: verdict.reason,
  };
}

// ---------------------------------------------------------------------------

export default function ActivationSection({
  organizationId,
  propertyId,
}: {
  organizationId: string;
  propertyId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OpsPropertyChainState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [report, setReport] = useState<ActivationReport | null>(null);
  const [activating, startActivate] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [standardName, setStandardName] = useState<string>(
    ACTIVATION_DEFAULTS.standardName,
  );
  const [triggerType, setTriggerType] = useState<"TIME" | "EVENT">("TIME");
  const [recurrence, setRecurrence] = useState<string>(
    ACTIVATION_DEFAULTS.recurrence,
  );
  const [timeOfDay, setTimeOfDay] = useState<string>(
    ACTIVATION_DEFAULTS.timeOfDay,
  );
  const [eventType, setEventType] = useState<string>(SCHEDULE_EVENT_TYPES[0]);
  const [eventOffsetMinutes, setEventOffsetMinutes] = useState("0");
  const [dueOffsetMinutes, setDueOffsetMinutes] = useState(
    String(ACTIVATION_DEFAULTS.dueOffsetMinutes),
  );
  const [leadMinutes, setLeadMinutes] = useState(
    String(ACTIVATION_DEFAULTS.leadMinutes),
  );
  const [runTick, setRunTick] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await getPropertyChainState(organizationId, propertyId);
      setState(next);
      // Pre-select whatever the property is already running, so a re-run is a
      // confirmation rather than a silent reduction of scope.
      const alreadyMapped = next.chain
        .map((link) => link.operation?.id)
        .filter((id): id is string => Boolean(id));
      setSelectedIds((current) =>
        current.length > 0 ? current : alreadyMapped,
      );
      if (next.activeStandard?.name) setStandardName(next.activeStandard.name);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load this property's operations chain.";
      setLoadError(message);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleOperation = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }, []);

  const links = useMemo((): { title: string; state: LinkState; detail: string }[] => {
    if (!state) return [];
    const chainHasEntries = state.chain.length > 0;
    const publishedProfiles = state.chain.filter(
      (link) => link.profile?.status === "PUBLISHED",
    ).length;
    const enabledSchedules = state.chain.reduce(
      (total, link) =>
        total + link.schedules.filter((schedule) => schedule.enabled).length,
      0,
    );
    const blockers = state.responsibilityStatus?.blockers ?? [];

    return [
      {
        title: "Organization, catalogs and workflows",
        state:
          state.organization &&
          state.assetTypeCount > 0 &&
          state.spaceTypeCount > 0 &&
          state.publishedWorkflows.length > 0
            ? "PRESENT"
            : "MISSING",
        detail: state.organization
          ? `${state.organization.name} — ${state.assetTypeCount} asset types, ${state.spaceTypeCount} space types, ${state.publishedWorkflows.length} published workflows.`
          : "No operations organization resolved.",
      },
      {
        title: "Operations defined",
        state: state.operations.length > 0 ? "PRESENT" : "MISSING",
        detail:
          state.operations.length > 0
            ? `${state.operations.length} operations in the catalog.`
            : "No operations exist yet — define one on the Operations tab first.",
      },
      {
        title: "Active standard assigned to this property",
        state: state.activeStandardError
          ? "UNKNOWN"
          : state.assignment
            ? "PRESENT"
            : "MISSING",
        detail:
          state.activeStandardError ??
          (state.assignment
            ? `“${state.activeStandard?.name ?? state.assignment.standardId}” since ${state.assignment.effectiveFrom}.`
            : "No active standard — the engine generates NOTHING for this property."),
      },
      {
        title: "Standard entries → published execution profiles",
        state: !state.assignment
          ? "MISSING"
          : chainHasEntries && publishedProfiles === state.chain.length
            ? "PRESENT"
            : "MISSING",
        detail: !state.assignment
          ? "There is no assigned standard to hold entries."
          : chainHasEntries
            ? `${state.chain.length} entries, ${publishedProfiles} pointing at a PUBLISHED profile.`
            : "The assigned standard has no entries, so it maps no operations.",
      },
      {
        title: "Enabled schedules",
        state: enabledSchedules > 0 ? "PRESENT" : "MISSING",
        detail:
          enabledSchedules > 0
            ? `${enabledSchedules} enabled schedule${enabledSchedules === 1 ? "" : "s"} across the entries.`
            : "No enabled schedule — nothing is generated on a timer.",
      },
      {
        title: "Executor resolvable (who gets the task)",
        state: state.staffAssignmentsError
          ? "UNKNOWN"
          : state.executorResolved
            ? "PRESENT"
            : "MISSING",
        detail:
          state.staffAssignmentsError ??
          (state.executorResolved
            ? `The engine resolves an EXECUTOR here${blockers.length > 0 ? `, but still reports: ${blockers.join(", ")}` : ""}.`
            : "No EXECUTOR resolvable — the engine files NO_EXECUTOR_RESOLVABLE instead of creating work. Assign a caretaker; activation cannot invent one."),
      },
    ];
  }, [state]);

  const handleActivate = useCallback(() => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one operation to activate");
      return;
    }
    if (triggerType === "TIME") {
      const cleanRecurrence = recurrence.trim().toUpperCase();
      if (!RECURRENCE_RE.test(cleanRecurrence)) {
        toast.error(`Recurrence must be one of ${RECURRENCE_HINT}`);
        return;
      }
      if (!TIME_OF_DAY_RE.test(timeOfDay.trim())) {
        toast.error(`Time of day must be ${TIME_OF_DAY_HINT}`);
        return;
      }
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

    startActivate(() => {
      void activateOperationsForProperty({
        organizationId,
        propertyId,
        operationIds: selectedIds,
        standardName: standardName.trim() || ACTIVATION_DEFAULTS.standardName,
        schedule:
          triggerType === "TIME"
            ? {
                triggerType: "TIME",
                recurrence: recurrence.trim().toUpperCase(),
                timeOfDay: timeOfDay.trim(),
                dueOffsetMinutes: due,
                leadMinutes: lead,
              }
            : {
                triggerType: "EVENT",
                eventType,
                eventOffsetMinutes: Number(eventOffsetMinutes) || 0,
                dueOffsetMinutes: due,
                leadMinutes: lead,
              },
        runTick,
      })
        .then((result) => {
          // The report is returned on failure too — always show the progress.
          setReport(result.data ?? null);
          if (result.error) toast.error(result.error);
          else toast.success(result.success ?? "Operations activated");
          return load();
        })
        .catch((error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : "Activation failed",
          );
        });
    });
  }, [
    dueOffsetMinutes,
    eventOffsetMinutes,
    eventType,
    leadMinutes,
    load,
    organizationId,
    propertyId,
    recurrence,
    runTick,
    selectedIds,
    standardName,
    timeOfDay,
    triggerType,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <JarvisLoader size="lg" />
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
            <HiOutlineExclamation className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Could not read this property&apos;s operations chain
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loadError ?? "Unknown error."}
            </p>
          </div>
        </div>
        <MyButton color="light" size="sm" onClick={() => void load()}>
          Retry
        </MyButton>
      </Card>
    );
  }

  const ready = state.ready;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Verdict ────────────────────────────────────────────────────── */}
      <Card
        className={`w-full border ${
          ready
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
            : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              ready
                ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300"
                : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
            }`}
          >
            {ready ? (
              <HiOutlineCheckCircle className="h-6 w-6" />
            ) : (
              <HiOutlineExclamation className="h-6 w-6" />
            )}
          </span>
          <div className="min-w-0">
            <h5
              className={`text-lg font-semibold ${
                ready
                  ? "text-green-900 dark:text-green-100"
                  : "text-amber-900 dark:text-amber-100"
              }`}
            >
              {ready
                ? "This property is configured to generate work"
                : "This property generates NO work yet"}
            </h5>
            {ready ? (
              <p className="text-sm text-green-800 dark:text-green-200">
                Every link of the chain exists. Work still only appears once the
                engine ticks — the tick runs on a cron, and Activate runs one
                immediately.
              </p>
            ) : (
              <>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Missing, in chain order:
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                  {state.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── The chain, link by link ────────────────────────────────────── */}
      <Card className="w-full bg-white dark:bg-gray-800">
        <h5 className="text-base font-semibold text-gray-900 dark:text-white">
          The generation chain
        </h5>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          property → active standard → entries (operation → published profile) →
          schedules → engine tick → tasks. A link shown as{" "}
          <span className="font-medium text-amber-600 dark:text-amber-400">
            unknown
          </span>{" "}
          could not be read — it is not the same as absent.
        </p>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {links.map((link) => (
            <LinkRow
              key={link.title}
              state={link.state}
              title={link.title}
              detail={link.detail}
            />
          ))}
        </ul>
      </Card>

      {/* ── Activate ───────────────────────────────────────────────────── */}
      <Card className="w-full bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <HiOutlineLightningBolt className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activate operations for this property
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Builds every missing link in one go: catalogs → published workflow
              → a published execution profile per operation → a standard holding
              those entries → published → assigned here → a schedule per entry →
              an engine tick. Safe to press repeatedly: each object is found by
              name and reused, never duplicated.
            </p>
          </div>
        </div>

        {state.operations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            There are no operations in this organization yet, so there is nothing
            to activate. Create one on the <strong>Operations</strong> tab first
            — an operation is the unit of business activity (POOL_CLEANING,
            METER_READING).
          </p>
        ) : (
          <>
            <div>
              <Label>Operations to run at this property</Label>
              <div className="mt-2 flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {state.operations.map((operation) => {
                  const targets = fanOutTargets(operation, state);
                  const mapped = state.chain.some(
                    (link) => link.entry.operationId === operation.id,
                  );
                  return (
                    <label
                      key={operation.id}
                      className="flex cursor-pointer items-start gap-3 p-3"
                    >
                      <Checkbox
                        className="mt-1"
                        checked={selectedIds.includes(operation.id)}
                        onChange={() => toggleOperation(operation.id)}
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {operation.name}
                          </span>
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {operation.code}
                          </span>
                          {mapped ? (
                            <Badge color="info" className="inline-flex w-fit">
                              already in the standard
                            </Badge>
                          ) : null}
                          {targets.known ? null : (
                            <Badge color="warning" className="inline-flex w-fit">
                              applicability unknown
                            </Badge>
                          )}
                          {targets.known && !targets.applies ? (
                            <Badge color="gray" className="inline-flex w-fit">
                              does not apply here
                            </Badge>
                          ) : null}
                        </span>
                        <span className="block text-sm text-gray-500 dark:text-gray-400">
                          {targets.reason}
                        </span>
                        <span className="block break-words text-xs text-gray-400 dark:text-gray-500">
                          Targets: {targets.label}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Targets are real rows, never counts — two pools are two separate
                tasks per occurrence.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <Label htmlFor="activate-standard-name">Standard name</Label>
                <TextInput
                  id="activate-standard-name"
                  value={standardName}
                  onChange={(e) => setStandardName(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This name is the idempotency key. Reusing it extends the same
                  standard; a new name starts a separate one.
                </p>
              </div>

              <div>
                <Label htmlFor="activate-trigger">Schedule trigger</Label>
                <Select
                  id="activate-trigger"
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
                    <Label htmlFor="activate-recurrence">
                      Recurrence — {RECURRENCE_HINT}
                    </Label>
                    <TextInput
                      id="activate-recurrence"
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="activate-time">
                      Time of day — {TIME_OF_DAY_HINT}
                    </Label>
                    <TextInput
                      id="activate-time"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="activate-event">Event type</Label>
                    <Select
                      id="activate-event"
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
                    <Label htmlFor="activate-event-offset">
                      Event offset (min)
                    </Label>
                    <TextInput
                      id="activate-event-offset"
                      type="number"
                      value={eventOffsetMinutes}
                      onChange={(e) => setEventOffsetMinutes(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="activate-due">Due offset (min)</Label>
                <TextInput
                  id="activate-due"
                  type="number"
                  min={1}
                  value={dueOffsetMinutes}
                  onChange={(e) => setDueOffsetMinutes(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="activate-lead">Lead (min)</Label>
                <TextInput
                  id="activate-lead"
                  type="number"
                  min={0}
                  value={leadMinutes}
                  onChange={(e) => setLeadMinutes(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-200">
                  <Checkbox
                    checked={runTick}
                    onChange={() => setRunTick((value) => !value)}
                  />
                  Run an engine tick afterwards
                </label>
              </div>
            </div>

            <MyButton loading={activating} onClick={handleActivate}>
              Activate operations for this property
            </MyButton>
          </>
        )}
      </Card>

      {/* ── Last run report ────────────────────────────────────────────── */}
      {report ? (
        <Card className="w-full bg-white dark:bg-gray-800">
          <h5 className="text-base font-semibold text-gray-900 dark:text-white">
            Last activation run
          </h5>
          {report.failedAt ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Stopped at “{ACTIVATION_STEP_LABELS[report.failedAt]}”. Everything
              above it was written — fix the cause and press Activate again to
              resume.
            </p>
          ) : null}
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {report.steps.map((step) => (
              <li
                key={`${step.key}-${step.status}`}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-3"
              >
                <Badge
                  color={STEP_BADGE_COLORS[step.status]}
                  className="inline-flex w-fit shrink-0"
                >
                  {step.status}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {ACTIVATION_STEP_LABELS[step.key as ActivationStepKey]}
                  </p>
                  <p className="break-words text-sm text-gray-500 dark:text-gray-400">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
