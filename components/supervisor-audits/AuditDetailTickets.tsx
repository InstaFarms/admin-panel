"use client";

import { Card } from "flowbite-react";

import TicketCard from "@/components/supervisor-audits/TicketCard";

interface AuditDetailTicketsProps {
    tickets: any[];
    supervisors: { id: string; name: string }[];
    onUpdated: () => void;
}

export default function AuditDetailTickets({ tickets, supervisors, onUpdated }: AuditDetailTicketsProps) {
    const openTickets = tickets?.filter((t: any) => t.status === "OPEN") || [];
    const resolvedTickets = tickets?.filter((t: any) => t.status === "RESOLVED") || [];

    return (
        <Card className="w-full bg-white dark:bg-gray-800 sticky top-4">
            <h6 className="text-md font-bold text-gray-900 dark:text-white mb-2">
                Ticket Action Center ({tickets?.length || 0})
            </h6>

            {(!tickets || tickets.length === 0) ? (
                <p className="text-center text-gray-400 py-8">No tickets generated from this audit.</p>
            ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                    {/* Open Tickets */}
                    {openTickets.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Open ({openTickets.length})
                            </p>
                            {openTickets.map((ticket: any) => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    supervisors={supervisors}
                                    onUpdated={onUpdated}
                                />
                            ))}
                        </>
                    )}

                    {/* Resolved Tickets */}
                    {resolvedTickets.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4">
                                Resolved ({resolvedTickets.length})
                            </p>
                            {resolvedTickets.map((ticket: any) => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    supervisors={supervisors}
                                    onUpdated={onUpdated}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
