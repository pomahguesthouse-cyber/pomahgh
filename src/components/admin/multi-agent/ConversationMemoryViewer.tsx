import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Clock, MessageSquare, Route, ShoppingCart, Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ConversationMemoryViewerProps {
  session: {
    id: string;
    phone_number: string;
    guest_name?: string | null;
    conversation_id?: string | null;
    session_type?: string | null;
    awaiting_name?: boolean | null;
    is_takeover?: boolean | null;
    is_active?: boolean | null;
    last_message_at?: string | null;
    created_at?: string | null;
    chat_conversations?: {
      message_count?: number | null;
      started_at?: string | null;
      booking_created?: boolean | null;
      fallback_count?: number | null;
    } | null;
  };
}

export const ConversationMemoryViewer = ({ session }: ConversationMemoryViewerProps) => {
  // Fetch routing logs for this phone
  const { data: routingLogs } = useQuery({
    queryKey: ['memory-routing', session.phone_number],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_routing_logs')
        .select('*')
        .eq('phone_number', session.phone_number)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!session.phone_number,
  });

  // Fetch booking drafts for this phone
  const { data: bookingDrafts } = useQuery({
    queryKey: ['memory-drafts', session.phone_number],
    queryFn: async () => {
      const { data } = await supabase
        .from('booking_drafts')
        .select('*')
        .eq('phone', session.phone_number)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!session.phone_number,
  });

  // Fetch recent bookings for this phone
  const { data: recentBookings } = useQuery({
    queryKey: ['memory-bookings', session.phone_number],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_code, status, check_in, check_out, total_price, guest_name')
        .eq('guest_phone', session.phone_number)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!session.phone_number,
  });

  const conv = session.chat_conversations;

  return (
    <div className="w-64 border-l overflow-y-auto bg-muted/30">
      <div className="p-3 border-b">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-emerald-600" />
          Konteks Percakapan
        </h3>
      </div>

      {/* Guest Info */}
      <div className="p-3 space-y-2">
        <SectionTitle icon={<User className="w-3 h-3" />} title="Info Tamu" />
        <InfoRow label="Nama" value={session.guest_name || '—'} />
        <InfoRow label="Telepon" value={session.phone_number} />
        <InfoRow label="Status" value={
          <Badge variant={session.is_takeover ? 'destructive' : 'secondary'} className="text-[9px] px-1">
            {session.is_takeover ? 'Manual' : session.awaiting_name ? 'Menunggu Nama' : 'AI Aktif'}
          </Badge>
        } />
      </div>

      <Separator />

      {/* Session Stats */}
      <div className="p-3 space-y-2">
        <SectionTitle icon={<Clock className="w-3 h-3" />} title="Sesi" />
        <InfoRow label="Mulai" value={
          session.created_at
            ? formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: idLocale })
            : '—'
        } />
        <InfoRow label="Pesan" value={`${conv?.message_count || 0}`} />
        <InfoRow label="Fallback" value={
          <span className={conv?.fallback_count ? 'text-amber-500 font-medium' : ''}>
            {conv?.fallback_count || 0}
          </span>
        } />
        <InfoRow label="Booking?" value={
          conv?.booking_created
            ? <span className="text-emerald-600 font-medium">✓ Ya</span>
            : <span className="text-muted-foreground">Belum</span>
        } />
      </div>

      <Separator />

      {/* Booking Drafts */}
      {bookingDrafts && bookingDrafts.length > 0 && (
        <>
          <div className="p-3 space-y-2">
            <SectionTitle icon={<ShoppingCart className="w-3 h-3" />} title="Draft Booking" />
            {bookingDrafts.map(draft => (
              <div key={draft.id} className="bg-background rounded p-2 text-[10px] space-y-0.5">
                <p className="font-medium">{draft.room_type}</p>
                <p className="text-muted-foreground">{draft.check_in} → {draft.check_out}</p>
                <p className="text-muted-foreground">{draft.nights} malam, {draft.guests} tamu</p>
                <Badge variant="outline" className="text-[9px] px-1">{draft.status}</Badge>
              </div>
            ))}
          </div>
          <Separator />
        </>
      )}

      {/* Recent Bookings */}
      {recentBookings && recentBookings.length > 0 && (
        <>
          <div className="p-3 space-y-2">
            <SectionTitle icon={<MessageSquare className="w-3 h-3" />} title="Riwayat Booking" />
            {recentBookings.map(booking => (
              <div key={booking.id} className="bg-background rounded p-2 text-[10px] space-y-0.5">
                <p className="font-medium">{booking.booking_code}</p>
                <p className="text-muted-foreground">{booking.check_in} → {booking.check_out}</p>
                <Badge
                  variant={booking.status === 'confirmed' ? 'default' : 'outline'}
                  className="text-[9px] px-1"
                >
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
          <Separator />
        </>
      )}

      {/* Agent Routing Trail */}
      <div className="p-3 space-y-2">
        <SectionTitle icon={<Route className="w-3 h-3" />} title="Alur Agent" />
        {routingLogs && routingLogs.length > 0 ? (
          <div className="space-y-1.5">
            {routingLogs.map(log => (
              <div key={log.id} className="flex items-start gap-1.5 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="font-medium">
                    {log.from_agent}
                    {log.to_agent && <span className="text-muted-foreground"> → {log.to_agent}</span>}
                  </p>
                  <p className="text-muted-foreground">{log.reason}</p>
                  {log.created_at && (
                    <p className="text-muted-foreground/60">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Belum ada routing</p>
        )}
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <h4 className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
    {icon} {title}
  </h4>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center text-[11px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground font-medium text-right max-w-[140px] truncate">{value}</span>
  </div>
);
