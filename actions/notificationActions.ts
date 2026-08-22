"use server";

import { cookies } from "next/headers";
import { apiGet, apiPatch, apiPost } from "@/utils/api-utils";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { captureError } from "@/lib/sentry";

// Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

// Get notification templates
export async function getNotificationTemplates(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);
    const filterParams = parseFilterParams(await searchParams);

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/notifications/templates/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    captureError(error);
    throw error;
  }
}

export type NotificationTemplate = {
  id: string;
  channel: string;
  eventTypeId: string;
  notificationType: string;
  recipientRole: string | null;
  templateName: string;
  subject: string | null;
  title: string | null;
  body: string;
  variables: Record<string, string> | null;
  isActive: boolean;
  version: number;
  language: string;
  createdAt: string;
  updatedAt: string;
};

// Create a new notification event type (no DB migration — just INSERT into notification_event_types)
export async function createNotificationEventType(name: string) {
  try {
    const token = await getAuthToken();
    const response = await apiPost<{ success: boolean; data?: { id: string; name: string }; error?: string }>(
      "/api/notifications/event-types",
      { name: name.trim() },
      { token }
    );
    if (!response?.success || !response.data) {
      return {
        success: false,
        error: (response as { error?: string })?.error ?? "Failed to create event type",
        data: null,
      };
    }
    const { id, name: eventName } = response.data;
    if (!id || !eventName) {
      return { success: false, error: "Invalid response from API", data: null };
    }
    return { success: true, data: { id, name: eventName }, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event type";
    console.error("Error creating notification event type:", error);
    captureError(error);
    return { success: false, error: message, data: null };
  }
}

// Get notification template enum options (for create form) — event types from table, rest from schema
export async function getNotificationTemplateEnums() {
  try {
    const token = await getAuthToken();
    const response = await apiGet<{
      success: boolean;
      data?: {
        eventTypes: { id: string; name: string }[];
        recipientRoles: string[];
        channels: string[];
      };
      error?: string;
    }>("/api/notifications/templates/enums", { token });
    if (!response.success || !response.data) {
      return {
        eventTypes: [],
        recipientRoles: [],
        channels: ["email", "whatsapp", "sms", "app"],
      };
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching notification template enums:", error);
    captureError(error);
    return {
      eventTypes: [],
      recipientRoles: [],
      channels: ["email", "whatsapp", "sms", "app"],
    };
  }
}

// Get single notification template by ID
export async function getNotificationTemplateById(id: string) {
  try {
    const token = await getAuthToken();
    const response = await apiGet<{ success: boolean; data?: NotificationTemplate; error?: string }>(
      `/api/notifications/templates/${id}`,
      { token }
    );
    if (!response.success || !response.data) {
      return { success: false, error: response.error ?? "Template not found", data: null };
    }
    return { success: true, data: response.data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch template";
    console.error("Error fetching notification template:", error);
    captureError(error);
    return { success: false, error: message, data: null };
  }
}

// Create notification template
export async function createNotificationTemplate(payload: {
  channel: string;
  eventTypeId: string;
  recipientRole?: string | null;
  templateName: string;
  subject?: string | null;
  title?: string | null;
  body: string;
  variables?: Record<string, string> | null;
  isActive?: boolean;
  language?: string;
  version?: number;
}) {
  try {
    const token = await getAuthToken();
    const response = await apiPost<{ success: boolean; data?: NotificationTemplate; error?: string }>(
      "/api/notifications/templates",
      payload,
      { token }
    );
    if (!response.success) {
      return { success: false, error: response.error ?? "Failed to create template", data: null };
    }
    return { success: true, data: response.data ?? null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    console.error("Error creating notification template:", error);
    captureError(error);
    return { success: false, error: message, data: null };
  }
}

// Update notification template
export async function updateNotificationTemplate(
  id: string,
  payload: {
    templateName?: string;
    eventTypeId?: string;
    recipientRole?: string | null;
    subject?: string | null;
    title?: string | null;
    body?: string;
    variables?: Record<string, string> | null;
    isActive?: boolean;
    language?: string;
    version?: number;
  }
) {
  try {
    const token = await getAuthToken();
    const response = await apiPatch<{ success: boolean; data?: NotificationTemplate; error?: string }>(
      `/api/notifications/templates/${id}`,
      payload,
      { token }
    );
    if (!response.success) {
      return { success: false, error: response.error ?? "Failed to update template", data: null };
    }
    return { success: true, data: response.data ?? null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update template";
    console.error("Error updating notification template:", error);
    captureError(error);
    return { success: false, error: message, data: null };
  }
}

// Get delivery logs
export async function getDeliveryLogs(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);
    const filterParams = parseFilterParams(await searchParams);

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/notifications/delivery-log/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching delivery logs:", error);
    captureError(error);
    throw error;
  }
}

// Get event logs
export async function getEventLogs(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);
    const filterParams = parseFilterParams(await searchParams);

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/notifications/event-log/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching event logs:", error);
    captureError(error);
    throw error;
  }
}

// Get dead letter queue
export async function getDeadLetterQueue(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  try {
    const token = await getAuthToken();
    const { limit, offset } = parseLimitOffset(await searchParams);
    const filterParams = parseFilterParams(await searchParams);

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody = {
      pageNumber,
      perPage,
      orderBy: "failedAt",
      sortorder: "desc" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/notifications/dead-letter-queue/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching dead letter queue:", error);
    captureError(error);
    throw error;
  }
}

