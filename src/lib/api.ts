/**
 * API Wrapper for Supabase Edge Functions
 * Provides typed fetch methods with error handling
 */

import { supabase } from "@/integrations/supabase/client";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export const api = {
  /**
   * Call a Supabase Edge Function with GET method
   */
  get: async <T>(
    functionName: string,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> => {
    const queryString = params ? `?${new URLSearchParams(params)}` : "";
    const { data, error } = await supabase.functions.invoke(
      `${functionName}${queryString}`,
      {
        method: "GET",
      }
    );
    return {
      data: error ? null : (data as T),
      error: error?.message || null,
      status: error ? 500 : 200,
    };
  },

  /**
   * Call a Supabase Edge Function with POST method
   */
  post: async <T>(
    functionName: string,
    body?: unknown
  ): Promise<ApiResponse<T>> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      data: error ? null : (data as T),
      error: error?.message || null,
      status: error ? 500 : 200,
    };
  },

  /**
   * Call a Supabase Edge Function with PUT method
   */
  put: async <T>(
    functionName: string,
    body?: unknown
  ): Promise<ApiResponse<T>> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      data: error ? null : (data as T),
      error: error?.message || null,
      status: error ? 500 : 200,
    };
  },

  /**
   * Call a Supabase Edge Function with DELETE method
   */
  delete: async <T>(functionName: string): Promise<ApiResponse<T>> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: "DELETE",
    });
    return {
      data: error ? null : (data as T),
      error: error?.message || null,
      status: error ? 500 : 200,
    };
  },
};
