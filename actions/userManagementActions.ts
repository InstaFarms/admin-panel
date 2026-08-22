"use server";

import { cookies } from "next/headers";
import { apiGet, apiPost } from "@/utils/api-utils";
import { ServerSearchResult } from "@/utils/types";
import { USERS_ERRORS } from "@/constants/users";
import { captureError } from "@/lib/sentry";

function parseUserError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("not found")) return USERS_ERRORS.notFound;
    if (msg.includes("unauthorized") || msg.includes("token")) return USERS_ERRORS.unauthorized;
    if (msg.includes("network") || msg.includes("fetch")) return USERS_ERRORS.fetchFailed;
    return err.message;
  }
  return fallback;
}

// ✅ Helper to get token from cookies
async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("jarvis-admin-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }
  
  return token;
}

// Get owners with pagination and search
export async function getOwners(params: {
  limit: number;
  offset: number;
  searchKey?: "Name" | "Email" | "Phone";
  searchValue?: string;
  brandId?: string;
}): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const { limit, offset, searchKey, searchValue, brandId } = params;

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody: any = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc",
    };

    if (searchKey && searchValue) {
      if (searchKey === "Name") {
        requestBody.searchBy = "name";
      } else if (searchKey === "Email") {
        requestBody.searchBy = "email";
      } else if (searchKey === "Phone") {
        requestBody.searchBy = "mobileNumber";
      }
      requestBody.searchKey = searchValue.toLowerCase();
    }
    if (brandId) {
      requestBody.brandId = brandId;
    }

    const response = await apiPost("/api/owners/admin/paginate", requestBody, {
      token,
      cache: "no-store",
    });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting owners:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.ownerFetchFailed) };
  }
}

// Get managers with pagination and search
export async function getManagers(params: {
  limit: number;
  offset: number;
  searchKey?: "Name" | "Email" | "Phone";
  searchValue?: string;
  brandId?: string;
}): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const { limit, offset, searchKey, searchValue, brandId } = params;

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody: any = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc",
    };

    if (searchKey && searchValue) {
      if (searchKey === "Name") {
        requestBody.searchBy = "name";
      } else if (searchKey === "Email") {
        requestBody.searchBy = "email";
      } else if (searchKey === "Phone") {
        requestBody.searchBy = "mobileNumber";
      }
      requestBody.searchKey = searchValue.toLowerCase();
    }
    if (brandId) {
      requestBody.brandId = brandId;
    }

    const response = await apiPost("/api/managers/admin/paginate", requestBody, {
      token,
      cache: "no-store",
    });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting managers:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.managerFetchFailed) };
  }
}

// Get caretakers with pagination and search
export async function getCaretakers(params: {
  limit: number;
  offset: number;
  searchKey?: "Name" | "Email" | "Phone";
  searchValue?: string;
  brandId?: string;
}): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const { limit, offset, searchKey, searchValue, brandId } = params;

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody: any = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc",
    };

    if (searchKey && searchValue) {
      if (searchKey === "Name") {
        requestBody.searchBy = "name";
      } else if (searchKey === "Email") {
        requestBody.searchBy = "email";
      } else if (searchKey === "Phone") {
        requestBody.searchBy = "phone";
      }
      requestBody.searchKey = searchValue.toLowerCase();
    }
    if (brandId) {
      requestBody.brandId = brandId;
    }

    const response = await apiPost("/api/caretakers/admin/paginate", requestBody, {
      token,
      cache: "no-store",
    });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting caretakers:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.caretakerFetchFailed) };
  }
}

// Get all users with pagination, search, and role filtering
export async function getAllUsers(params: {
  limit: number;
  offset: number;
  role?: "all" | "owners" | "managers" | "caretakers";
  searchKey?: "Name" | "Email" | "Phone";
  searchValue?: string;
}): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const { limit, offset, role = "all", searchKey, searchValue } = params;

    const pageNumber = Math.floor(offset / limit) + 1;
    const perPage = limit;

    const requestBody: any = {
      pageNumber,
      perPage,
      orderBy: "createdAt",
      sortorder: "desc",
      role,
    };

    if (searchKey && searchValue) {
      if (searchKey === "Name") {
        requestBody.searchBy = "name";
      } else if (searchKey === "Email") {
        requestBody.searchBy = "email";
      } else if (searchKey === "Phone") {
        requestBody.searchBy = "mobileNumber";
      }
      requestBody.searchKey = searchValue.toLowerCase();
    }

    const response = await apiPost("/api/users/admin/paginate", requestBody, {
      token,
    });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting all users:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.allUsersFetchFailed) };
  }
}

// Get owner by ID
export async function getOwnerById(id: string): Promise<ServerSearchResult<any>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/owners/${id}`, { token });

    if (!response.data) {
      return { error: USERS_ERRORS.notFound };
    }

    return { data: response.data };
  } catch (err) {
    console.error("API Error getting owner:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.ownerFetchFailed) };
  }
}

// Get manager by ID
export async function getManagerById(id: string): Promise<ServerSearchResult<any>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/managers/${id}`, { token });

    if (!response.data) {
      return { error: USERS_ERRORS.notFound };
    }

    return { data: response.data };
  } catch (err) {
    console.error("API Error getting manager:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.managerFetchFailed) };
  }
}

// Get caretaker by ID
export async function getCaretakerById(id: string): Promise<ServerSearchResult<any>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/caretakers/${id}`, { token });

    if (!response.data) {
      return { error: USERS_ERRORS.notFound };
    }

    return { data: response.data };
  } catch (err) {
    console.error("API Error getting caretaker:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.caretakerFetchFailed) };
  }
}

// Get owner properties with details
export async function getOwnerProperties(id: string): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/owners/${id}/properties`, { token });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting owner properties:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.ownerFetchFailed) };
  }
}

// Get manager properties with details
export async function getManagerProperties(id: string): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/managers/${id}/properties`, { token });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting manager properties:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.managerFetchFailed) };
  }
}

// Get caretaker properties with details
export async function getCaretakerProperties(id: string): Promise<ServerSearchResult<any[]>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/caretakers/${id}/properties`, { token });

    return { data: response.data || [] };
  } catch (err) {
    console.error("API Error getting caretaker properties:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.caretakerFetchFailed) };
  }
}

// Get user by ID (for general user lookup)
export async function getUser(id: string): Promise<ServerSearchResult<any>> {
  try {
    const token = await getAuthToken();
    const response = await apiGet(`/api/users/admin/${id}`, { token });

    if (!response.success || !response.data) {
      return { error: USERS_ERRORS.notFound };
    }

    return { data: response.data };
  } catch (err) {
    console.error("API Error getting user:", err);
    captureError(err);
    return { error: parseUserError(err, USERS_ERRORS.allUsersFetchFailed) };
  }
}

