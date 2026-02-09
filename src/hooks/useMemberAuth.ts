import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  created_at: string;
}

interface UseMemberAuthReturn {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

export const useMemberAuth = (): UseMemberAuthReturn => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await fetchUserProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUser(null);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserProfile(data.user.id);
        toast.success("Login berhasil!");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || "Login gagal");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (
    email: string, 
    password: string, 
    fullName: string,
    phone?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phone
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Registrasi berhasil! Silakan verifikasi email Anda.");
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || "Registrasi gagal");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast.success("Logout berhasil");
    } catch (error: any) {
      toast.error(error.message || "Logout gagal");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success("Link reset password telah dikirim ke email Anda");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim link reset");
      return false;
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<boolean> => {
    try {
      if (!user) {
        toast.error("Anda harus login terlebih dahulu");
        return false;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;

      // Refresh user data
      await fetchUserProfile(user.id);
      toast.success("Profil berhasil diperbarui");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui profil");
      return false;
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
    updateProfile
  };
};
