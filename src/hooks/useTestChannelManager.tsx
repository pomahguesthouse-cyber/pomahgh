import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestConnectionParams {
  api_endpoint: string;
  auth_type?: string;
  api_key_secret?: string;
}

interface TestConnectionResult {
  success: boolean;
  status?: number;
  statusText?: string;
  duration_ms?: number;
  message: string;
  response_preview?: any;
  error?: string;
}

export const useTestChannelManager = () => {
  return useMutation({
    mutationFn: async (params: TestConnectionParams): Promise<TestConnectionResult> => {
      const { data, error } = await supabase.functions.invoke('test-channel-manager', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Connection Test Successful", {
          description: data.message,
          duration: 5000,
        });
      } else {
        toast.error("Connection Test Failed", {
          description: data.message,
          duration: 8000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Test Connection Error", {
        description: error.message,
        duration: 8000,
      });
    },
  });
};
