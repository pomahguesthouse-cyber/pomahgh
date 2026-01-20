/**
 * Auth Service
 * Centralized authentication operations using Supabase
 */
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

export interface SignUpInput {
  email: string;
  password: string;
  fullName?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp({ email, password, fullName }: SignUpInput): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign in an existing user
   */
  async signIn({ email, password }: SignInInput): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      error,
    };
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getUser();
    return {
      user: data.user,
      error,
    };
  },

  /**
   * Reset password for a user
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return {
      user: data.user,
      error,
    };
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};
