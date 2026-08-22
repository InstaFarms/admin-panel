/**
 * Utility functions for making API calls to the backend
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_DEV_BASE_URL || 'http://localhost:3001';

interface APIRequestOptions extends RequestInit {
  token?: string;
  /** Overrides default X-App-Type (e.g. MAGO_ADMIN for Mago-scoped data). */
  appType?: string;
}

/**
 * Generic function to make API calls with proper error handling
 */
export async function fetchAPI<T = any>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<T> {
  const { token, appType, ...fetchOptions } = options;

  // Use lowercase keys throughout so that custom headers passed via `options.headers`
  // (which the `Headers` API normalizes to lowercase) correctly override the defaults.
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-app-type": (appType || "INSTAFARMS_ADMIN").trim(),
  };

  // Merge any existing headers (Headers API yields lowercase keys, so they match)
  if (fetchOptions.headers) {
    const existingHeaders = new Headers(fetchOptions.headers);
    existingHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  }

  // Add authorization header if token is provided
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    cache: 'no-store', // Disable caching to always get fresh data
  });

  // Handle empty responses (common for DELETE operations)
  const contentType = response.headers.get("content-type");
  const text = await response.text();

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;

    // Handle 404 Not Found with empty body gracefully
    if (response.status === 404 && (!text || !text.trim())) {
      errorMessage = `Not Found: ${response.statusText}`;
    } else {
      try {
        if (text && text.trim()) {
          const error = JSON.parse(text);

          // Handle direct Zod validation errors (e.g. from some middlewares)
          const issues = error?.issues || error?.error?.issues;

          if (issues && Array.isArray(issues)) {
            const zodErrors = issues.map((issue: any) =>
              `${issue.path?.join('.') || 'field'}: ${issue.message}`
            ).join(', ');
            errorMessage = `Validation Error: ${zodErrors}`;
          } else {
            // Handle standard error responses
            // If error is an object, try to extract message or error property
            if (typeof error === 'object' && error !== null) {
              errorMessage = error.message || error.error?.message || error.error || JSON.stringify(error);
            } else {
              errorMessage = String(error);
            }
          }
        }
      } catch {
        // Response body is not JSON (e.g. plain "404 Not Found"); use status and body
        errorMessage = text?.trim() ? `${response.status} ${response.statusText}: ${text.trim()}` : `API Error: ${response.status} ${response.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }

  // If response is empty, return empty object
  if (!text || text.trim() === "") {
    return {} as T;
  }

  // If content-type is JSON, parse it
  if (contentType && contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // If parsing fails, return empty object
      return {} as T;
    }
  }

  // For non-JSON responses, return the text as-is
  return text as T;
}

/**
 * Make a GET request to the API
 */
export async function apiGet<T = any>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "GET",
  });
}

/**
 * Make a POST request to the API
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
  options: APIRequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a PATCH request to the API
 */
export async function apiPatch<T = any>(
  endpoint: string,
  data?: any,
  options: APIRequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a PUT request to the API
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
  options: APIRequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a DELETE request to the API
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<T> {
  return fetchAPI<T>(endpoint, {
    ...options,
    method: "DELETE",
  });
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}