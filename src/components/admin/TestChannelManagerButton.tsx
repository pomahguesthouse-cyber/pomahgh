import { Button } from "@/components/ui/button";
import { Wifi } from "lucide-react";
import { useTestChannelManager } from "@/hooks/useTestChannelManager";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type ChannelManager = Tables<"channel_managers">;

interface TestChannelManagerButtonProps {
  channelManager: ChannelManager;
}

export const TestChannelManagerButton = ({ channelManager }: TestChannelManagerButtonProps) => {
  const testConnection = useTestChannelManager();

  const handleTest = () => {
    if (channelManager.type !== 'api') {
      toast.error("Test connection only available for API type");
      return;
    }

    if (!channelManager.api_endpoint) {
      toast.error("No API endpoint configured");
      return;
    }

    testConnection.mutate({
      api_endpoint: channelManager.api_endpoint,
      auth_type: channelManager.auth_type || undefined,
      api_key_secret: channelManager.api_key_secret || undefined,
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleTest}
      disabled={testConnection.isPending || channelManager.type !== 'api'}
      title="Test Connection"
    >
      <Wifi className={`h-4 w-4 ${testConnection.isPending ? 'animate-pulse' : ''}`} />
    </Button>
  );
};
