/**
 * API Utilities
 * HTTP request helpers, error handling, etc.
 */

import { API_ENDPOINTS, getApiBaseUrl } from "@/constants/apiEndpoints";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiErrorResponse {
  constructor(public status: number, public message: string) {}
}

/**
 * Make GET request
 */
export const apiGet = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiErrorResponse(response.status, ERROR_MESSAGES.SERVER_ERROR);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Make POST request
 */
export const apiPost = async <T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new ApiErrorResponse(response.status, ERROR_MESSAGES.SERVER_ERROR);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Make PUT request
 */
export const apiPut = async <T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new ApiErrorResponse(response.status, ERROR_MESSAGES.SERVER_ERROR);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Make DELETE request
 */
export const apiDelete = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiErrorResponse(response.status, ERROR_MESSAGES.SERVER_ERROR);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Handle API errors
 */
const handleApiError = (error: any): ApiResponse => {
  console.error("API Error:", error);

  if (error instanceof ApiErrorResponse) {
    return { success: false, error: error.message };
  }

  if (error instanceof TypeError) {
    return { success: false, error: ERROR_MESSAGES.NETWORK_ERROR };
  }

  return { success: false, error: ERROR_MESSAGES.UNKNOWN_ERROR };
};

/**
 * Check if response is successful
 */
export const isApiSuccess = <T>(response: ApiResponse<T>): boolean => {
  return response.success === true;
};

/**
 * Get error message from response
 */
export const getApiErrorMessage = (response: ApiResponse): string => {
  return response.error || response.message || ERROR_MESSAGES.UNKNOWN_ERROR;
};
