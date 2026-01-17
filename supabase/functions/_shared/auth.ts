/**
 * Shared authentication utilities for Edge Functions
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorResponses } from './error.ts';

interface AuthResult {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
  supabase: SupabaseClient;
}

/**
 * Verify JWT and return user info with authenticated Supabase client
 */
export async function verifyAuth(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return ErrorResponses.unauthorized();
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return ErrorResponses.unauthorized();
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    supabase,
  };
}

/**
 * Check if user has admin role
 */
export async function verifyAdmin(req: Request): Promise<AuthResult | Response> {
  const result = await verifyAuth(req);
  
  if (result instanceof Response) {
    return result;
  }

  // Check admin_users table
  const { data: adminUser, error } = await result.supabase
    .from('admin_users')
    .select('id, role')
    .eq('user_id', result.user.id)
    .single();

  if (error || !adminUser) {
    return ErrorResponses.forbidden();
  }

  return {
    ...result,
    user: {
      ...result.user,
      role: adminUser.role,
    },
  };
}

/**
 * Create a service role Supabase client (for operations bypassing RLS)
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Create an anonymous Supabase client
 */
export function createAnonClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  return createClient(supabaseUrl, supabaseAnonKey);
}
