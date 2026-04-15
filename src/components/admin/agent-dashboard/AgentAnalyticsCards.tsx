import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';
import { formatRupiahID } from '@/utils/indonesianFormat';
import type { AgentAnalytics } from '@/hooks/useAgentDashboard';

interface Props {
  analytics: AgentAnalytics;
}

export function AgentAnalyticsCards({ analytics }: Props) {
  const cards = [
    {
      label: 'Total Chat',
      value: analytics.totalChats.toString(),
      icon: MessageSquare,
      color: 'amber',
      sub: 'Hari ini',
    },
    {
      label: 'Booking Conversion',
      value: `${analytics.bookingConversion}%`,
      icon: TrendingUp,
      color: 'green',
      sub: analytics.bookingConversion > 15 ? '▲ baik' : '— perlu ditingkatkan',
    },
    {
      label: 'Drop-off Rate',
      value: `${analytics.dropOffRate}%`,
      icon: TrendingDown,
      color: 'red',
      sub: analytics.dropOffRate < 5 ? '▼ bagus' : '▲ cek percakapan',
    },
    {
      label: 'Revenue (Today)',
      value: formatRupiahID(analytics.revenueToday),
      icon: DollarSign,
      color: 'purple',
      sub: 'Dari chatbot booking',
    },
    {
      label: 'Active Users',
      value: analytics.activeUsers.toString(),
      icon: Users,
      color: 'blue',
      sub: 'Sesi WA aktif',
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string; sub: string }> = {
    amber:  { bg: 'from-amber-50 to-amber-100/50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600', sub: 'text-amber-600/70' },
    green:  { bg: 'from-green-50 to-green-100/50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600', sub: 'text-green-600/70' },
    red:    { bg: 'from-red-50 to-red-100/50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600', sub: 'text-red-600/70' },
    purple: { bg: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600', sub: 'text-purple-600/70' },
    blue:   { bg: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600', sub: 'text-blue-600/70' },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => {
        const c = colorMap[card.color];
        return (
          <Card key={card.label} className={`bg-gradient-to-br ${c.bg} ${c.border}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${c.icon}`}>{card.label}</span>
                <card.icon className={`h-4 w-4 ${c.icon}`} />
              </div>
              <p className={`text-2xl font-bold ${c.text} truncate`}>{card.value}</p>
              <p className={`text-xs mt-1 ${c.sub}`}>{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
