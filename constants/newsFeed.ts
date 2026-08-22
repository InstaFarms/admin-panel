/** Shared constants/helpers for the News Feed admin section. */

/** Role labels the backend routes tickets to (news-feed-ticket-service ROLE_LABELS). */
export const NEWS_FEED_ROLE_LABELS = [
    "Caretaker",
    "Maintenance Supervisor",
    "Inspection Supervisor",
    "Guest-Comm Supervisor",
] as const;

export const TICKET_STATUSES = ["open", "assigned", "in_progress", "resolved", "reopened"] as const;

export const TICKET_PRIORITIES = ["P1", "P2", "P3"] as const;

export const QUESTION_STATUSES = ["open", "awaiting_response", "resolved", "ticket_raised"] as const;

export function statusLabel(status: string): string {
    return (status || "").replace(/_/g, " ");
}

export function statusBadgeColor(status: string): string {
    switch (status) {
        case "open":
            return "info";
        case "assigned":
            return "purple";
        case "in_progress":
        case "awaiting_response":
            return "warning";
        case "resolved":
            return "success";
        case "reopened":
        case "ticket_raised":
            return "failure";
        default:
            return "gray";
    }
}

export function priorityBadgeColor(priority: string): string {
    switch (priority) {
        case "P1":
            return "failure";
        case "P2":
            return "warning";
        default:
            return "gray";
    }
}

/** Compact "2d 4h" style age from an ISO timestamp. */
export function formatAge(iso: string | null | undefined): string {
    if (!iso) return "-";
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "-";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}
