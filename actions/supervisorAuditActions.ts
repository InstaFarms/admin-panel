"use server";

import { apiGet, apiPost, apiPatch, buildQueryString } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { captureError } from "@/lib/sentry";

export async function fetchSupervisorAudits(params: {
    pageNumber: number;
    perPage: number;
    searchKey?: string;
    statusFilter?: string;
}) {
    try {
        const token = await getApiAuthToken();
        const queryString = buildQueryString(params);
        const response = await apiGet(`/api/supervisor-audits/list${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching supervisor audits:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to fetch audits" };
    }
}

/**
 * The OPERATIONAL ticket queue (the `tickets` table), which is a different store
 * from the news-feed tickets the Tickets page has always listed. A ticket raised
 * by a supervisor, resolved by a caretaker and verified back was reachable by
 * neither the admin list nor an audit report (many carry no auditSessionId), so
 * the whole round trip was invisible to an admin. Bounded by `limit` because the
 * table holds thousands of rows.
 */
export async function fetchOperationalTickets(params: {
    status?: "OPEN" | "RESOLVED";
    propertyId?: string;
    limit?: number;
}) {
    try {
        const token = await getApiAuthToken();
        const queryString = buildQueryString(params);
        const response = await apiGet(`/api/supervisor-audits/tickets${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching operational tickets:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to fetch operational tickets" };
    }
}

export async function fetchAuditReportDetails(auditId: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiGet(`/api/supervisor-audits/${auditId}/report`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching audit details:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to fetch audit details" };
    }
}

export async function adminUpdateTicketPriority(ticketId: string, priority: "P1" | "P2") {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(`/api/supervisor-audits/tickets/${ticketId}/priority`, { priority }, { token });
        return response;
    } catch (error: any) {
        console.error("Error updating ticket priority:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to update priority" };
    }
}

export async function adminReassignTicket(ticketId: string, newSupervisorId: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(`/api/supervisor-audits/tickets/${ticketId}/reassign`, { newSupervisorId }, { token });
        return response;
    } catch (error: any) {
        console.error("Error reassigning ticket:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to reassign ticket" };
    }
}

export async function adminResolveTicket(ticketId: string, notes: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPost(`/api/supervisor-audits/tickets/${ticketId}/resolve`, { resolutionNotes: notes }, { token });
        return response;
    } catch (error: any) {
        console.error("Error resolving ticket:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to resolve ticket" };
    }
}
