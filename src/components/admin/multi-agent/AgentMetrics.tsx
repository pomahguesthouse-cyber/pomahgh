import { MessageSquare, CalendarCheck, Zap, AlertTriangle } from 'lucide-react';

interface AgentMetricsProps {
  activeSessions: number;
  bookingsToday: number;
  totalMessages: number;
  escalations: number;
}

export const AgentMetrics = ({ activeSessions, bookingsToday, totalMessages, escalations }: AgentMetricsProps) => {
  const metrics = [
    { label: 'Chat Aktif', value: activeSessions, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Reservasi Hari Ini', value: bookingsToday, icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'Pesan Hari Ini', value: totalMessages, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Eskalasi', value: escalations, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
      {metrics.map(m => (
        <div key={m.label} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <div className={`p-2 rounded-lg ${m.bg}`}>
            <m.icon className={`w-4 h-4 ${m.color}`} />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
