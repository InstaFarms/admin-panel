"use server";

import { cookies } from "next/headers";
import { apiPost } from "@/utils/api-utils";
import { parseFilterParams, parseLimitOffset } from "@/utils/server-utils";
import { ServerPageProps } from "@/utils/types";
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

// Get enquiries (for all enquiries page)
export async function getEnquiries(
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
      enquiryType: undefined, // Get all types
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
      orderBy: "createdAt",
      sortorder: "desc" as const,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/enquiries/admin/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    captureError(error);
    throw error;
  }
}

// Get property enquiries
export async function getPropertyEnquiries(
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
      enquiryType: "property_enquiry" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
      orderBy: "createdAt",
      sortorder: "desc" as const,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/enquiries/admin/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching property enquiries:", error);
    captureError(error);
    throw error;
  }
}

// Get event enquiries
export async function getEventEnquiries(
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
      enquiryType: "event_enquiry" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
      orderBy: "createdAt",
      sortorder: "desc" as const,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/enquiries/admin/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching event enquiries:", error);
    captureError(error);
    throw error;
  }
}

// Get contact requests
export async function getContactRequests(
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
      enquiryType: "contact_request" as const,
      searchBy: filterParams?.searchKey || undefined,
      searchKey: filterParams?.searchValue || undefined,
      orderBy: "createdAt",
      sortorder: "desc" as const,
    };

    const response = await apiPost<{ success: boolean; data: any[] }>(
      "/api/enquiries/admin/paginate",
      requestBody,
      { token }
    );

    return response.data || [];
  } catch (error) {
    console.error("Error fetching contact requests:", error);
    captureError(error);
    throw error;
  }
}

