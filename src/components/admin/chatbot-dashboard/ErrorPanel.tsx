import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardMessage } from '@/hooks/useChatbotDashboard';

interface ErrorPanelProps {
  messages: DashboardMessage[] | undefined;
}

export const ErrorPanel = ({ messages }: ErrorPanelProps) => {
  const fallbackMsgs = messages?.filter(m => m.is_fallback) || [];

  if (fallbackMsgs.length === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{fallbackMsgs.length} Fallback Response(s)</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          AI tidak bisa memproses beberapa pesan dan memberikan respons fallback.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
};
