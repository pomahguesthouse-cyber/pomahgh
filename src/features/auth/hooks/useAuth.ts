/**
 * useAuth hook
 * Provides authentication state and methods
 */
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { authService } from "../services";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    authService.getSession().then(({ session }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await authService.signOut();
  };

  return { user, isLoading, signOut };
};
