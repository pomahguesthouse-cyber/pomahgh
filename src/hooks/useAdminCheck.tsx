import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdminCheck = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;

      if (!user) {
        setIsLoading(false);
        setIsAdmin(false);
        navigate("/admin");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          setIsLoading(false);
          navigate("/admin");
          return;
        }

        if (data) {
          setIsAdmin(true);
          hasChecked.current = true;
        } else {
          setIsAdmin(false);
          navigate("/");
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
      }

      setIsLoading(false);
    };

    // Don't re-check if already verified admin in this session
    if (hasChecked.current && user) {
      setIsAdmin(true);
      setIsLoading(false);
      return;
    }

    checkAdminStatus();
  }, [user, authLoading, navigate]);

  return { isAdmin, isLoading };
};
