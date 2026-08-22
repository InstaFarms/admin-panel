"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { HiCheck, HiPencil, HiX } from "react-icons/hi";

import { Card, Badge, Button, Spinner, Modal, TextInput, Textarea, ModalHeader, ModalBody, ModalFooter } from "flowbite-react";

import { adminUpdateTicketPriority, adminReassignTicket, adminResolveTicket } from "@/actions/supervisorAuditActions";

import { priorityColors } from "@/constants/supervisorAudits";

export default function TicketCard({
    ticket,
    supervisors,
    onUpdated,
}: {
    ticket: any;
    supervisors: { id: string; name: string }[];
    onUpdated: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [priority, setPriority] = useState(ticket.priority);
    const [assignedTo, setAssignedTo] = useState(ticket.assignedTo || "");
    const [assigneeSearch, setAssigneeSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState("");
    const isResolved = ticket.status === "RESOLVED";

    const assignedSupervisorName = supervisors.find((s) => s.id === assignedTo)?.name || ticket.supervisorName || "Unassigned";

    const filteredSupervisors = supervisors.filter((s) =>
        s.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    );

    const handleSave = async () => {
        setSaving(true);
        let hasError = false;

        // Update priority if changed
        if (priority !== ticket.priority) {
            const res = await adminUpdateTicketPriority(ticket.id, priority as any);
            if (res.success) {
                toast.success("Priority updated");
            } else {
                toast.error(res.error || "Failed to update priority");
                hasError = true;
            }
        }

        // Reassign if changed
        if (assignedTo !== (ticket.assignedTo || "")) {
            const res = await adminReassignTicket(ticket.id, assignedTo);
            if (res.success) {
                toast.success("Ticket reassigned");
            } else {
                toast.error(res.error || "Failed to reassign");
                hasError = true;
            }
        }

        setSaving(false);
        if (!hasError) {
            setEditing(false);
            onUpdated();
        }
    };

    const handleCancelEdit = () => {
        setPriority(ticket.priority);
        setAssignedTo(ticket.assignedTo || "");
        setAssigneeSearch("");
        setEditing(false);
    };

    const handleForceClose = async () => {
        setResolving(true);
        const result = await adminResolveTicket(ticket.id, resolutionNotes || "Admin force-closed");
        if (result.success) {
            toast.success("Ticket resolved");
            setShowResolveModal(false);
            onUpdated();
        } else {
            toast.error(result.error || "Failed");
        }
        setResolving(false);
    };

    return (
        <Card className={`mb-3 ${isResolved ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                        {ticket.checkpointName && ticket.checkpointName !== "Unknown Item"
                            ? ticket.checkpointName
                            : `${ticket.auditSection} Issue`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Badge color="info" size="xs" className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                            {ticket.auditSection}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge color={isResolved ? "gray" : "warning"} className="text-xs">
                        {ticket.status}
                    </Badge>
                    {!isResolved && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit ticket"
                        >
                            <HiPencil className="h-4 w-4" />
                        </button>
                    )}
                    {!isResolved && editing && (
                        <button
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Cancel edit"
                        >
                            <HiX className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Read-only fields */}
            <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-20 shrink-0 text-xs">Priority:</span>
                    {editing ? (
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPriority("P1")}
                                className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${priority === "P1"
                                    ? "bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600"
                                    }`}
                            >
                                P1
                            </button>
                            <button
                                onClick={() => setPriority("P2")}
                                className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${priority === "P2"
                                    ? "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600"
                                    }`}
                            >
                                P2
                            </button>
                        </div>
                    ) : (
                        <Badge color={priorityColors[ticket.priority] || "gray"} className="text-xs font-bold">
                            {ticket.priority === "P1" ? "P1 - Critical" : "P2 - High"}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-20 shrink-0 text-xs">Assigned:</span>
                    {editing ? (
                        <div className="flex-1 relative">
                            <TextInput
                                sizing="sm"
                                placeholder="Search supervisor..."
                                value={assigneeSearch}
                                onChange={(e) => {
                                    setAssigneeSearch(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                            />
                            {showDropdown && (
                                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                    {filteredSupervisors.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-2 px-3">No supervisors found</p>
                                    ) : (
                                        filteredSupervisors.map((s) => (
                                            <button
                                                key={s.id}
                                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${assignedTo === s.id ? "bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"
                                                    }`}
                                                onClick={() => {
                                                    setAssignedTo(s.id);
                                                    setAssigneeSearch(s.name);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                {s.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-gray-800 dark:text-gray-200">{assignedSupervisorName}</span>
                    )}
                </div>
            </div>

            {/* Save Button (edit mode) */}
            {editing && (
                <Button
                    size="sm"
                    color="blue"
                    className="w-full mt-3"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Spinner size="sm" className="mr-2" /> : <HiCheck className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            )}

            {/* Force Close Button */}
            {!isResolved && !editing && (
                <Button
                    size="sm"
                    color="dark"
                    className="w-full mt-3"
                    onClick={() => setShowResolveModal(true)}
                >
                    <HiCheck className="mr-2 h-4 w-4" />
                    Force Close Ticket
                </Button>
            )}

            {/* Resolve Modal */}
            <Modal show={showResolveModal} onClose={() => setShowResolveModal(false)} size="md">
                <ModalHeader>Resolve Ticket</ModalHeader>
                <ModalBody>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Are you sure you want to force-close this ticket? Add optional resolution notes:
                        </p>
                        <Textarea
                            placeholder="Resolution notes (optional)..."
                            rows={3}
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={handleForceClose} disabled={resolving}>
                        {resolving ? <Spinner size="sm" className="mr-2" /> : null}
                        Confirm Resolve
                    </Button>
                    <Button color="gray" onClick={() => setShowResolveModal(false)}>
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>
        </Card>
    );
}
