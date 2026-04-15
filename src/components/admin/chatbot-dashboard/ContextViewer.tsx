import { Braces, Calendar, Users, BedDouble, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardSession } from '@/hooks/useChatbotDashboard';

interface ContextViewerProps {
  session: DashboardSession | null;
}

export const ContextViewer = ({ session }: ContextViewerProps) => {
  const ctx = session?.context as Record<string, unknown> | null;

  if (!session) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Braces className="h-5 w-5 text-primary" />
            Context & Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">Pilih percakapan untuk melihat konteks</p>
        </CardContent>
      </Card>
    );
  }

  const intent = (ctx?.intent as string) || (ctx?.last_agent as string) || 'unknown';
  const fields = [
    { label: 'Check-in', value: ctx?.check_in_date || ctx?.checkin, icon: Calendar },
    { label: 'Check-out', value: ctx?.check_out_date || ctx?.checkout, icon: Calendar },
    { label: 'Guests', value: ctx?.guest_count || ctx?.guests, icon: Users },
    { label: 'Room', value: ctx?.room_type || ctx?.preferred_room, icon: BedDouble },
    { label: 'Phone', value: session.phone_number, icon: Phone },
    { label: 'Name', value: session.guest_name || ctx?.guest_name, icon: Mail },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Braces className="h-5 w-5 text-primary" />
          Context & Memory
          <Badge className="ml-auto uppercase text-xs">{intent}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {fields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <span className="text-sm font-medium">{String(value ?? '-')}</span>
          </div>
        ))}

        {ctx && Object.keys(ctx).length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Raw JSON
            </summary>
            <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-40 font-mono">
              {JSON.stringify(ctx, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
