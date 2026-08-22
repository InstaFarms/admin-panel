"use client";

import {
  transitionReservationLifecycle,
  updateReservationAssignment,
  type ReservationLifecycleActionStatus,
} from "@/actions/bookingActions";
import { getAdmins } from "@/actions/adminActions";
import { getSupervisors } from "@/actions/supervisorActions";
import MyButton from "@/components/MyButton";
import type { Admin } from "@/utils/types";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import toast from "react-hot-toast";

type LifecycleStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW"
  | "COMPLETED";

type SupervisorOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
};

type TimelineEntry = Record<string, unknown>;

const lifecycleLabels: Record<LifecycleStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  COMPLETED: "Checked Out",
};

const lifecycleTransitions: Record<
  LifecycleStatus,
  ReservationLifecycleActionStatus[]
> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
  COMPLETED: [],
};

function displayName(admin: Admin) {
  return (
    `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || admin.email
  );
}

function humanize(value: unknown) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimelineTime(value: unknown) {
  if (!value) return "Time unavailable";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function getTimelineNote(entry: TimelineEntry) {
  const metadata = entry.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const note = (metadata as Record<string, unknown>).note;
  return typeof note === "string" && note.trim() ? note.trim() : null;
}

function getTimelineTitle(entry: TimelineEntry) {
  const event = String(entry.event || "");
  if (event === "reservation_status_changed") {
    const previous =
      lifecycleLabels[
        String(entry.previousBookingStatus || "") as LifecycleStatus
      ];
    const next =
      lifecycleLabels[String(entry.nextBookingStatus || "") as LifecycleStatus];
    return previous && next
      ? `Reservation moved from ${previous} to ${next}`
      : "Reservation status updated";
  }
  if (event === "reservation_executive_assigned")
    return "Reservation executive updated";
  if (event === "reservation_supervisor_assigned")
    return "Reservation supervisor updated";
  if (event === "booking_created") return "Reservation created";
  if (event.includes("payment")) return "Payment recorded";
  if (event === "guest_details_updated") return "Guest details updated";
  if (event === "internal_note_added") return "Internal note added";
  return humanize(event || entry.status || "Booking activity");
}

function getTimelineTone(entry: TimelineEntry) {
  const text = `${entry.event || ""} ${entry.status || ""}`.toLowerCase();
  if (
    text.includes("cancel") ||
    text.includes("fail") ||
    text.includes("no_show")
  ) {
    return "border-rose-400 bg-rose-400";
  }
  if (
    text.includes("payment") ||
    text.includes("confirm") ||
    text.includes("check")
  ) {
    return "border-emerald-400 bg-emerald-400";
  }
  if (text.includes("pending")) return "border-amber-400 bg-amber-400";
  return "border-blue-400 bg-blue-400";
}

function AssignmentSelect({
  id,
  label,
  value,
  disabled,
  children,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  children: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

export default function ReservationOperationsPanel({
  bookingId,
  brandId,
  status,
  assignedExecutiveAdminId,
  assignedSupervisorId,
  bookingLogs,
  onUpdated,
}: {
  bookingId: string;
  brandId?: string | null;
  status?: string | null;
  assignedExecutiveAdminId?: string | null;
  assignedSupervisorId?: string | null;
  bookingLogs: TimelineEntry[];
  onUpdated: () => Promise<void> | void;
}) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState(
    assignedExecutiveAdminId || "",
  );
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(
    assignedSupervisorId || "",
  );
  const [timelineNote, setTimelineNote] = useState("");
  const [isTransitioning, startLifecycleTransition] = useTransition();
  const [isSavingAssignment, startAssignmentTransition] = useTransition();

  const lifecycleStatus = String(
    status || "PENDING",
  ).toUpperCase() as LifecycleStatus;
  const validLifecycleStatus = lifecycleLabels[lifecycleStatus]
    ? lifecycleStatus
    : "PENDING";
  const nextStatuses = lifecycleTransitions[validLifecycleStatus];

  useEffect(() => {
    setSelectedExecutiveId(assignedExecutiveAdminId || "");
    setSelectedSupervisorId(assignedSupervisorId || "");
  }, [assignedExecutiveAdminId, assignedSupervisorId]);

  useEffect(() => {
    let isActive = true;

    const loadRoster = async () => {
      setIsLoadingRoster(true);
      const [adminResult, supervisorResult] = await Promise.all([
        getAdmins(1, 100),
        getSupervisors(),
      ]);

      if (!isActive) return;

      if ("success" in adminResult && Array.isArray(adminResult.success)) {
        setAdmins(adminResult.success);
      } else if ("error" in adminResult) {
        toast.error(adminResult.error);
      }

      const supervisorData =
        supervisorResult && typeof supervisorResult === "object"
          ? (supervisorResult as { data?: unknown }).data
          : null;
      if (Array.isArray(supervisorData)) {
        setSupervisors(
          supervisorData
            .filter(
              (item): item is SupervisorOption =>
                !!item &&
                typeof item === "object" &&
                typeof (item as SupervisorOption).id === "string" &&
                typeof (item as SupervisorOption).name === "string",
            )
            .filter((supervisor) => supervisor.isActive !== false),
        );
      }

      setIsLoadingRoster(false);
    };

    void loadRoster();
    return () => {
      isActive = false;
    };
  }, []);

  const timeline = useMemo(() => bookingLogs.slice(0, 20), [bookingLogs]);
  const hasAssignmentChanges =
    selectedExecutiveId !== (assignedExecutiveAdminId || "") ||
    selectedSupervisorId !== (assignedSupervisorId || "");

  const adminNameById = useMemo(
    () => new Map(admins.map((admin) => [admin.id, displayName(admin)])),
    [admins],
  );
  const supervisorNameById = useMemo(
    () =>
      new Map(
        supervisors.map((supervisor) => [supervisor.id, supervisor.name]),
      ),
    [supervisors],
  );

  const handleLifecycleTransition = (
    nextStatus: ReservationLifecycleActionStatus,
  ) => {
    const nextLabel = lifecycleLabels[nextStatus];
    if (
      (nextStatus === "CANCELLED" || nextStatus === "NO_SHOW") &&
      !window.confirm(
        `Mark this reservation as ${nextLabel}? This lifecycle transition cannot be reversed.`,
      )
    ) {
      return;
    }

    startLifecycleTransition(() => {
      const promise = transitionReservationLifecycle({
        bookingId,
        brandId: brandId || undefined,
        nextStatus,
        note: timelineNote,
      }).then(async (result) => {
        if (result.error) throw new Error(result.error);
        setTimelineNote("");
        await onUpdated();
        return nextLabel;
      });

      toast.promise(promise, {
        loading: `Moving reservation to ${nextLabel}...`,
        success: (label) => `Reservation moved to ${label}.`,
        error: (error) =>
          error instanceof Error
            ? error.message
            : "Unable to update reservation",
      });
    });
  };

  const handleSaveAssignment = () => {
    if (!hasAssignmentChanges) return;

    startAssignmentTransition(() => {
      const promise = updateReservationAssignment({
        bookingId,
        brandId: brandId || undefined,
        assignedExecutiveAdminId: selectedExecutiveId || null,
        assignedSupervisorId: selectedSupervisorId || null,
      }).then(async (result) => {
        if (result.error) throw new Error(result.error);
        await onUpdated();
      });

      toast.promise(promise, {
        loading: "Saving reservation assignment...",
        success: "Reservation assignment updated.",
        error: (error) =>
          error instanceof Error
            ? error.message
            : "Unable to update reservation assignment",
      });
    });
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-5 shadow-[0_18px_45px_-32px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
              Reservation operations
            </p>
            <h4 className="mt-2 text-xl font-semibold text-white">
              {lifecycleLabels[validLifecycleStatus]}
            </h4>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Use only the next valid lifecycle step. Checked Out, Cancelled and
              No Show are terminal states.
            </p>
          </div>
          <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-blue-100 uppercase">
            {lifecycleLabels[validLifecycleStatus]}
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
          <label className="block">
            <span className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              Timeline note (optional)
            </span>
            <textarea
              value={timelineNote}
              onChange={(event) => setTimelineNote(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Why is this reservation being updated?"
              className="mt-2 block w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 transition outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          {nextStatuses.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStatuses.map((nextStatus) => (
                <MyButton
                  key={nextStatus}
                  type="button"
                  color={nextStatus === "CANCELLED" ? "failure" : "light"}
                  loading={isTransitioning}
                  disabled={isTransitioning}
                  onClick={() => handleLifecycleTransition(nextStatus)}
                >
                  Mark {lifecycleLabels[nextStatus]}
                </MyButton>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              This reservation has reached its final lifecycle state.
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                Responsibility
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Assignment is operational ownership. The reservation creator
                remains in the audit history.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AssignmentSelect
              id="reservation-executive"
              label="Reservation executive"
              value={selectedExecutiveId}
              disabled={isLoadingRoster || isSavingAssignment}
              onChange={setSelectedExecutiveId}
            >
              <option value="">Unassigned</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {displayName(admin)}
                </option>
              ))}
            </AssignmentSelect>
            <AssignmentSelect
              id="reservation-supervisor"
              label="Reservation supervisor"
              value={selectedSupervisorId}
              disabled={isLoadingRoster || isSavingAssignment}
              onChange={setSelectedSupervisorId}
            >
              <option value="">Unassigned</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.name}
                </option>
              ))}
            </AssignmentSelect>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {isLoadingRoster
                ? "Loading available staff..."
                : "Every responsibility change is added to the timeline."}
            </p>
            <MyButton
              type="button"
              color="light"
              loading={isSavingAssignment}
              disabled={
                !hasAssignmentChanges || isLoadingRoster || isSavingAssignment
              }
              onClick={handleSaveAssignment}
            >
              Save assignment
            </MyButton>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-700 bg-slate-900/70 p-5 shadow-[0_18px_45px_-32px_rgba(0,0,0,0.9)]">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Reservation timeline
          </p>
          <h4 className="mt-2 text-xl font-semibold text-white">Audit trail</h4>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Creation, payment, assignment and lifecycle activity are retained
            here automatically.
          </p>
        </div>

        <div className="mt-5 max-h-[520px] space-y-5 overflow-y-auto pr-2">
          {timeline.length > 0 ? (
            timeline.map((entry, index) => {
              const actorType = String(entry.actorType || "SYSTEM");
              const actorId =
                actorType === "ADMIN"
                  ? String(entry.actorAdminId || "")
                  : actorType === "SUPERVISOR"
                    ? String(entry.actorSupervisorId || "")
                    : "";
              const actorName =
                actorType === "ADMIN"
                  ? adminNameById.get(actorId)
                  : actorType === "SUPERVISOR"
                    ? supervisorNameById.get(actorId)
                    : null;
              const note = getTimelineNote(entry);
              const message =
                typeof entry.message === "string" && entry.message.trim()
                  ? entry.message.trim()
                  : null;

              return (
                <div
                  key={String(entry.id || `${entry.createdAt}-${index}`)}
                  className="relative pl-6"
                >
                  {index < timeline.length - 1 ? (
                    <span className="absolute top-4 bottom-[-22px] left-[7px] w-px bg-slate-700" />
                  ) : null}
                  <span
                    className={`absolute top-1.5 left-0 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${getTimelineTone(entry)}`}
                  />
                  <div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <p className="text-sm font-semibold text-slate-100">
                        {getTimelineTitle(entry)}
                      </p>
                      <p className="shrink-0 text-xs text-slate-500">
                        {formatTimelineTime(entry.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-medium tracking-[0.08em] text-slate-400 uppercase">
                      {actorName ? `${actorType}: ${actorName}` : actorType}
                    </p>
                    {message ? (
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {message}
                      </p>
                    ) : null}
                    {note ? (
                      <p className="mt-2 rounded-xl border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm text-slate-300 italic">
                        {note}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
              Timeline entries will appear as this reservation is created and
              operated.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
