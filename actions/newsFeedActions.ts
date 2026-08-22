"use server";

import { apiGet, apiPatch, buildQueryString } from "@/utils/api-utils";
import { getApiAuthToken } from "@/utils/auth-utils";
import { captureError } from "@/lib/sentry";

/**
 * Server actions for the News Feed admin section.
 * Calls the if-api `/api/news-feed-admin/*` endpoints (requireAuth — admin JWT
 * from the `jarvis-admin-token` cookie, sent as a Bearer token like every other
 * admin action).
 */

export async function fetchNewsFeedTickets(params: {
    status?: string;
    priority?: string;
    propertyId?: string;
    assignedRole?: string;
    q?: string;
    cursor?: string;
}) {
    try {
        const token = await getApiAuthToken();
        const queryString = buildQueryString(params);
        const response = await apiGet(`/api/news-feed-admin/tickets${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching news feed tickets:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to fetch tickets" };
    }
}

export async function fetchNewsFeedTicket(ticketId: string) {
    try {
        const token = await getApiAuthToken();
        const response = await apiGet(`/api/news-feed-admin/tickets/${ticketId}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching news feed ticket:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to fetch ticket" };
    }
}

export async function assignNewsFeedTicket(
    ticketId: string,
    body: { assigneeUserId?: string; roleLabel?: string }
) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(`/api/news-feed-admin/tickets/${ticketId}/assign`, body, { token });
        return response;
    } catch (error: any) {
        console.error("Error assigning news feed ticket:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to assign ticket" };
    }
}

export async function updateNewsFeedTicketStatus(
    ticketId: string,
    status: "in_progress" | "resolved" | "reopened",
    resolutionSummary?: string
) {
    try {
        const token = await getApiAuthToken();
        const response = await apiPatch(
            `/api/news-feed-admin/tickets/${ticketId}/status`,
            { status, ...(resolutionSummary ? { resolutionSummary } : {}) },
            { token }
        );
        return response;
    } catch (error: any) {
        console.error("Error updating news feed ticket status:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to update ticket status" };
    }
}

export async function fetchNewsFeedQuestions(params: {
    status?: string;
    propertyId?: string;
    cursor?: string;
}) {
    try {
        const token = await getApiAuthToken();
        const queryString = buildQueryString(params);
        const response = await apiGet(`/api/news-feed-admin/questions${queryString}`, { token });
        return response;
    } catch (error: any) {
        console.error("Error fetching news feed questions:", error);
        captureError(error);
        return { success: false, error: error.message || "Failed to fetch questions" };
    }
}
