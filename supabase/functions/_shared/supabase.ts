/**
 * Shared Supabase client factory for Edge Functions
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

/**
 * Get or create a service role Supabase client (singleton)
 * Use for operations that need to bypass RLS
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    serviceClient = createClient(supabaseUrl, serviceRoleKey);
  }
  return serviceClient;
}

/**
 * Get or create an anonymous Supabase client (singleton)
 * Use for public operations respecting RLS
 */
export function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    
    anonClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return anonClient;
}

/**
 * Create an authenticated Supabase client with user's JWT
 */
export function createAuthenticatedClient(token: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}
