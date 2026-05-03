import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, MessageSquare, CheckCircle2, XCircle } from 'lucide-react';

const INTENT_BUCKETS = [
  'price',
  'availability',
  'brochure',
  'booking',
  'room',
  'facility',
  'location',
  'payment',
  'generic_question',
] as const;

const INTENT_LABELS: Record<string, string> = {
  price: '💰 Harga',
  availability: '📅 Ketersediaan',
  brochure: '📷 Foto/Brosur',
  booking: '🛏️ Booking',
  room: '🚪 Kamar',
  facility: '🛁 Fasilitas',
  location: '📍 Lokasi',
  payment: '💳 Pembayaran',
  generic_question: '❓ Pertanyaan Umum',
};

interface IntentLog {
  id: string;
  phone: string | null;
  first_message: string | null;
  matched_intents: string[];
  greeting_bypass: boolean;
  source: string;
  created_at: string;
}

const RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: '24 jam terakhir', days: 1 },
  { label: '7 hari terakhir', days: 7 },
  { label: '30 hari terakhir', days: 30 },
  { label: '90 hari terakhir', days: 90 },
];

export function IntentBypassStats() {
  const [rangeDays, setRangeDays] = useState<number>(7);

  const { data, isLoading } = useQuery({
    queryKey: ['session-intent-logs', rangeDays],
    queryFn: async () => {
      const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('session_intent_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as IntentLog[];
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const logs = data || [];
  const totalSessions = logs.length;
  const totalBypassed = logs.filter((l) => l.greeting_bypass).length;
  const overallBypassRate = totalSessions > 0 ? (totalBypassed / totalSessions) * 100 : 0;
  const noIntentSessions = logs.filter((l) => l.matched_intents.length === 0).length;

  // Statistik per bucket
  const bucketStats = INTENT_BUCKETS.map((bucket) => {
    const matched = logs.filter((l) => l.matched_intents.includes(bucket));
    const bypassed = matched.filter((l) => l.greeting_bypass).length;
    const matchRate = totalSessions > 0 ? (matched.length / totalSessions) * 100 : 0;
    const bypassRate = matched.length > 0 ? (bypassed / matched.length) * 100 : 0;
    return {
      bucket,
      label: INTENT_LABELS[bucket] || bucket,
      matched: matched.length,
      bypassed,
      matchRate,
      bypassRate,
    };
  }).sort((a, b) => b.matched - a.matched);

  const recentFailures = logs
    .filter((l) => !l.greeting_bypass)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Intent Bypass Statistics</h2>
          <p className="text-xs text-muted-foreground">
            Persentase greeting bypass per bucket intent dari log sesi WhatsApp baru.
          </p>
        </div>
        <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.days} value={String(opt.days)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Total Sesi Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Greeting Bypass
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalBypassed}</div>
            <p className="text-xs text-muted-foreground">
              {overallBypassRate.toFixed(1)}% dari total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Tanpa Intent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{noIntentSessions}</div>
            <p className="text-xs text-muted-foreground">
              Diminta nama dulu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Bypass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallBypassRate.toFixed(1)}%</div>
            <Progress value={overallBypassRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Per-bucket breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown per Intent Bucket</CardTitle>
        </CardHeader>
        <CardContent>
          {totalSessions === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Belum ada data sesi pada rentang ini.
            </p>
          ) : (
            <div className="space-y-3">
              {bucketStats.map((stat) => (
                <div key={stat.bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stat.label}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{stat.matched} sesi ({stat.matchRate.toFixed(1)}%)</span>
                      <Badge variant={stat.bypassRate >= 95 ? 'default' : stat.bypassRate >= 80 ? 'secondary' : 'destructive'}>
                        bypass {stat.bypassRate.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={stat.bypassRate} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent failures (debugging) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sesi Tanpa Bypass (Debug)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentFailures.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Semua sesi pada rentang ini berhasil bypass 🎉
            </p>
          ) : (
            <div className="divide-y">
              {recentFailures.map((log) => (
                <div key={log.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {log.phone || '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground line-clamp-2">"{log.first_message}"</p>
                  {log.matched_intents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {log.matched_intents.map((i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {INTENT_LABELS[i] || i}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}