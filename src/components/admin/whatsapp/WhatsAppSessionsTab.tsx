import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useWhatsAppSessions, useWhatsAppStats } from '@/hooks/useWhatsAppSessions';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Phone, Search, Users, ShieldCheck, ShieldX, MessageCircle, CalendarCheck, Hand, TrendingUp } from 'lucide-react';
import { StatCard, ResponseModeCard, SessionRow } from './components';
import type { WhatsAppMode } from './types';

const WhatsAppSessionsTab = () => {
  const { data: sessions, isLoading } = useWhatsAppSessions('guest');
  const { data: stats } = useWhatsAppStats('guest');
  const { settings, updateSettings, isUpdating } = useHotelSettings();
  const [search, setSearch] = useState('');

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(session =>
      session.phone_number.toLowerCase().includes(search.toLowerCase())
    );
  }, [sessions, search]);

  const handleModeChange = (mode: WhatsAppMode) => {
    updateSettings({ whatsapp_response_mode: mode });
  };

  return (
    <div className="space-y-6">
      {/* Response Mode Card */}
      <ResponseModeCard
        mode={settings?.whatsapp_response_mode}
        onModeChange={handleModeChange}
        isUpdating={isUpdating}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard title="Total Sessions" value={stats?.totalSessions || 0} icon={Users} />
        <StatCard title="Aktif" value={stats?.activeSessions || 0} icon={ShieldCheck} variant="success" />
        <StatCard title="Takeover" value={stats?.takeoverSessions || 0} icon={Hand} variant="warning" />
        <StatCard title="Diblokir" value={stats?.blockedSessions || 0} icon={ShieldX} variant="destructive" />
        <StatCard title="Total Pesan" value={stats?.totalMessages || 0} icon={MessageCircle} />
        <StatCard title="Booking" value={stats?.bookingsCreated || 0} icon={CalendarCheck} variant="success" />
        <StatCard title="Conversion" value={`${stats?.conversionRate || 0}%`} icon={TrendingUp} />
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            WhatsApp Guest Sessions
          </CardTitle>
          <CardDescription>
            Percakapan WhatsApp dari tamu hotel (menggunakan Guest Chatbot)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor HP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Memuat sessions...</p>
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Belum ada session WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tamu yang mengirim pesan WhatsApp akan muncul di sini
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSessionsTab;
