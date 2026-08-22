"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
    Badge,
    Button,
    Modal,
    ModalBody,
    ModalHeader,
    Select,
    Spinner,
    Textarea,
} from "flowbite-react";

import UserSelector from "@/components/UserSelector";

import {
    assignNewsFeedTicket,
    fetchNewsFeedTicket,
    updateNewsFeedTicketStatus,
} from "@/actions/newsFeedActions";

import { formatAdminDateTime } from "@/lib/dateUtils";

import {
    NEWS_FEED_ROLE_LABELS,
    priorityBadgeColor,
    statusBadgeColor,
    statusLabel,
} from "@/constants/newsFeed";

/**
 * Ticket triage drawer/modal: full ticket detail + audit trail + Assign and
 * Status controls. Valid transitions (mirrors the backend TRANSITIONS table):
 * open -> assigned | in_progress; assigned -> in_progress;
 * in_progress -> resolved; resolved -> reopened; reopened -> in_progress | resolved.
 */
export default function TicketDetailModal({
    ticketId,
    onClose,
    onUpdated,
}: {
    ticketId: string;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);

    // Assign controls
    const [roleLabel, setRoleLabel] = useState("");
    const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    // Status controls
    const [transitioning, setTransitioning] = useState(false);
    const [showResolveForm, setShowResolveForm] = useState(false);
    const [resolutionSummary, setResolutionSummary] = useState("");

    const loadTicket = async () => {
        setLoading(true);
        const result = await fetchNewsFeedTicket(ticketId);
        if (result.success && result.data) {
            setTicket(result.data.ticket);
            setEvents(result.data.events || []);
            setRoleLabel(result.data.ticket?.assignedRoleLabel || "");
            setAssigneeUserId(result.data.ticket?.assigneeUserId || null);
        } else {
            toast.error(result.message || result.error || "Failed to load ticket");
            onClose();
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTicket();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId]);

    const refreshAfterMutation = async () => {
        await loadTicket();
        onUpdated();
    };

    const handleAssign = async () => {
        if (!roleLabel && !assigneeUserId) {
            toast.error("Pick a role and/or an assignee");
            return;
        }
        setAssigning(true);
        const result = await assignNewsFeedTicket(ticketId, {
            ...(assigneeUserId ? { assigneeUserId } : {}),
            ...(roleLabel ? { roleLabel } : {}),
        });
        if (result.success) {
            toast.success("Ticket assigned");
            await refreshAfterMutation();
        } else {
            toast.error(result.message || result.error || "Failed to assign ticket");
        }
        setAssigning(false);
    };

    const handleTransition = async (
        status: "in_progress" | "resolved" | "reopened",
        summary?: string
    ) => {
        if (status === "resolved" && !summary?.trim()) {
            toast.error("Add a resolution summary");
            return;
        }
        setTransitioning(true);
        const result = await updateNewsFeedTicketStatus(ticketId, status, summary?.trim() || undefined);
        if (result.success) {
            toast.success(
                status === "resolved"
                    ? "Ticket resolved"
                    : status === "reopened"
                        ? "Ticket reopened"
                        : "Ticket moved to in progress"
            );
            setShowResolveForm(false);
            setResolutionSummary("");
            await refreshAfterMutation();
        } else {
            toast.error(result.message || result.error || "Failed to update status");
        }
        setTransitioning(false);
    };

    const status: string = ticket?.status || "";
    const canStartProgress = status === "open" || status === "assigned" || status === "reopened";
    const canResolve = status === "in_progress" || status === "reopened";
    const canReopen = status === "resolved";
    const canAssign = status !== "resolved";

    return (
        <Modal show onClose={onClose} size="4xl" dismissible>
            <ModalHeader>
                {ticket ? (
                    <span className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                            {ticket.ticketNumber}
                        </span>
                        <span>{ticket.title}</span>
                    </span>
                ) : (
                    "Ticket"
                )}
            </ModalHeader>
            <ModalBody>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Spinner size="lg" />
                    </div>
                ) : !ticket ? null : (
                    <div className="flex flex-col gap-5">
                        {/* Summary chips */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge color={statusBadgeColor(ticket.status)} className="text-xs font-semibold uppercase">
                                {statusLabel(ticket.status)}
                            </Badge>
                            <Badge color={priorityBadgeColor(ticket.priority)} className="text-xs font-semibold">
                                {ticket.priority}
                            </Badge>
                            {ticket.category && (
                                <Badge color="info" className="text-xs">
                                    {ticket.category}
                                </Badge>
                            )}
                            <Badge color="gray" className="text-xs">
                                {ticket.sourceType}
                            </Badge>
                        </div>

                        {/* Detail grid */}
                        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                            <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Property: </span>
                                <span className="text-gray-900 dark:text-white">
                                    {ticket.propertyName || "N/A"}
                                    {ticket.propertyCode ? ` (${ticket.propertyCode})` : ""}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Raised by: </span>
                                <span className="text-gray-900 dark:text-white">{ticket.raiserName || "N/A"}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Assigned to: </span>
                                <span className="text-gray-900 dark:text-white">
                                    {ticket.assignedRoleLabel || ticket.assignedToLabel || "Unassigned"}
                                </span>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400">Raised at: </span>
                                <span className="text-gray-900 dark:text-white">
                                    {formatAdminDateTime(ticket.createdAt, { fallback: "-" })}
                                </span>
                            </div>
                            {ticket.resolvedAt && (
                                <div>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">Resolved at: </span>
                                    <span className="text-gray-900 dark:text-white">
                                        {formatAdminDateTime(ticket.resolvedAt, { fallback: "-" })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="rounded-lg bg-slate-100 p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                            {ticket.description}
                        </div>

                        {ticket.resolutionSummary && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                                <span className="font-semibold">Resolution: </span>
                                {ticket.resolutionSummary}
                            </div>
                        )}

                        {/* Assign controls */}
                        {canAssign && (
                            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                                <h6 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Assign</h6>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                Role
                                            </label>
                                            <Select
                                                sizing="sm"
                                                value={roleLabel}
                                                onChange={(e) => setRoleLabel(e.target.value)}
                                            >
                                                <option value="">Select role…</option>
                                                {NEWS_FEED_ROLE_LABELS.map((label) => (
                                                    <option key={label} value={label}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                Assignee (optional)
                                            </label>
                                            <UserSelector data={assigneeUserId} update={setAssigneeUserId} />
                                        </div>
                                    </div>
                                    <div>
                                        <Button size="xs" color="blue" onClick={handleAssign} disabled={assigning}>
                                            {assigning ? <Spinner size="sm" /> : "Assign"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status controls */}
                        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                            <h6 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Status</h6>
                            <div className="flex flex-wrap items-center gap-2">
                                {canStartProgress && (
                                    <Button
                                        size="xs"
                                        color="yellow"
                                        onClick={() => handleTransition("in_progress")}
                                        disabled={transitioning}
                                    >
                                        Start Progress
                                    </Button>
                                )}
                                {canResolve && !showResolveForm && (
                                    <Button
                                        size="xs"
                                        color="green"
                                        onClick={() => setShowResolveForm(true)}
                                        disabled={transitioning}
                                    >
                                        Resolve…
                                    </Button>
                                )}
                                {canReopen && (
                                    <Button
                                        size="xs"
                                        color="red"
                                        onClick={() => handleTransition("reopened")}
                                        disabled={transitioning}
                                    >
                                        Reopen
                                    </Button>
                                )}
                                {transitioning && <Spinner size="sm" />}
                            </div>
                            {showResolveForm && (
                                <div className="mt-3 flex flex-col gap-2">
                                    <Textarea
                                        rows={3}
                                        placeholder="Resolution summary (required)"
                                        value={resolutionSummary}
                                        onChange={(e) => setResolutionSummary(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="xs"
                                            color="green"
                                            onClick={() => handleTransition("resolved", resolutionSummary)}
                                            disabled={transitioning}
                                        >
                                            {transitioning ? <Spinner size="sm" /> : "Confirm Resolve"}
                                        </Button>
                                        <Button
                                            size="xs"
                                            color="light"
                                            onClick={() => {
                                                setShowResolveForm(false);
                                                setResolutionSummary("");
                                            }}
                                            disabled={transitioning}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Audit trail */}
                        <div>
                            <h6 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Audit Trail</h6>
                            {events.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No events recorded.</p>
                            ) : (
                                <ol className="relative ml-2 border-l border-gray-200 dark:border-gray-700">
                                    {events.map((event) => (
                                        <li key={event.id} className="mb-4 ml-4">
                                            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-blue-400 dark:border-gray-800" />
                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                <Badge color="gray" className="text-[10px] uppercase">
                                                    {event.kind}
                                                </Badge>
                                                <span className="text-gray-900 dark:text-white">
                                                    {event.fromStatus ? `${statusLabel(event.fromStatus)} → ` : ""}
                                                    {statusLabel(event.toStatus)}
                                                </span>
                                                {event.roleLabel && (
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        ({event.roleLabel})
                                                    </span>
                                                )}
                                            </div>
                                            {event.note && (
                                                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                                                    {event.note}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                                {formatAdminDateTime(event.createdAt, { fallback: "-" })}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </div>
                )}
            </ModalBody>
        </Modal>
    );
}
