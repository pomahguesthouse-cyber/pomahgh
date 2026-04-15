import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface AgentError {
  id: string;
  message: string;
  tool?: string;
  created_at: string;
}

interface Props {
  errors: AgentError[];
  onDismiss: (id: string) => void;
}

export function AgentErrorPanel({ errors, onDismiss }: Props) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="border-red-200 bg-red-50/95 backdrop-blur shadow-lg">
        <CardContent className="pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">Error Handling</span>
            </div>
            <Badge variant="destructive" className="text-[10px]">{errors.length}</Badge>
          </div>
          {errors.map((err) => (
            <div key={err.id} className="flex items-start gap-2 bg-white/80 rounded p-2 border border-red-100">
              <div className="flex-1 min-w-0">
                {err.tool && (
                  <p className="text-[10px] text-red-500 font-semibold">{err.tool}()</p>
                )}
                <p className="text-xs text-red-700 break-words">{err.message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0 text-red-400 hover:text-red-600"
                onClick={() => onDismiss(err.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
