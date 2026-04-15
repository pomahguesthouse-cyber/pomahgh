import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Clock, Route, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

export const AgentAnalytics = () => {
  const [days, setDays] = useState('7');

  const sinceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString();
  }, [days]);

  const { data: routingLogs, isLoading } = useQuery({
    queryKey: ['agent-analytics', days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_routing_logs')
        .select('*')
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const analytics = useMemo(() => {
    if (!routingLogs?.length) return null;

    // Routing count per agent
    const agentCounts: Record<string, number> = {};
    const agentDurations: Record<string, number[]> = {};
    const intentCounts: Record<string, number> = {};
    const flowCounts: Record<string, number> = {};

    routingLogs.forEach(log => {
      // From agent counts
      agentCounts[log.from_agent] = (agentCounts[log.from_agent] || 0) + 1;

      // Duration tracking
      if (log.duration_ms) {
        if (!agentDurations[log.from_agent]) agentDurations[log.from_agent] = [];
        agentDurations[log.from_agent].push(log.duration_ms);
      }

      // Intent distribution
      if (log.intent) {
        intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1;
      }

      // Flow tracking
      if (log.to_agent) {
        const flowKey = `${log.from_agent} → ${log.to_agent}`;
        flowCounts[flowKey] = (flowCounts[flowKey] || 0) + 1;
      }
    });

    const routingByAgent = Object.entries(agentCounts)
      .map(([agent, count]) => ({
        agent,
        count,
        avgMs: agentDurations[agent]
          ? Math.round(agentDurations[agent].reduce((a, b) => a + b, 0) / agentDurations[agent].length)
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const intentDistribution = Object.entries(intentCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topFlows = Object.entries(flowCounts)
      .map(([flow, count]) => ({ flow, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { routingByAgent, intentDistribution, topFlows, total: routingLogs.length };
  }, [routingLogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Performa Agent
        </h3>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hari ini</SelectItem>
            <SelectItem value="7">7 hari</SelectItem>
            <SelectItem value="30">30 hari</SelectItem>
            <SelectItem value="90">90 hari</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!analytics || analytics.total === 0 ? (
        <div className="border rounded-lg bg-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Belum ada data routing dalam periode ini</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Routing" value={analytics.total} icon={<Route className="w-3.5 h-3.5" />} />
            <StatCard label="Agent Aktif" value={analytics.routingByAgent.length} icon={<TrendingUp className="w-3.5 h-3.5" />} />
            <StatCard
              label="Avg Response"
              value={`${analytics.routingByAgent.filter(a => a.avgMs > 0).reduce((sum, a) => sum + a.avgMs, 0) / Math.max(1, analytics.routingByAgent.filter(a => a.avgMs > 0).length) | 0}ms`}
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <StatCard label="Intent Types" value={analytics.intentDistribution.length} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Routing count per agent */}
            <div className="border rounded-lg bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">Routing per Agent</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.routingByAgent} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="agent" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(value: number) => [`${value}x`, 'Routing']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Intent distribution */}
            <div className="border rounded-lg bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">Distribusi Intent</h4>
              {analytics.intentDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.intentDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      style={{ fontSize: 10 }}
                    >
                      {analytics.intentDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Belum ada data intent</p>
              )}
            </div>
          </div>

          {/* Top flows */}
          <div className="border rounded-lg bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">Alur Routing Terpopuler</h4>
            <div className="space-y-2">
              {analytics.topFlows.map((flow, i) => {
                const maxCount = analytics.topFlows[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-40 truncate">{flow.flow}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(flow.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-foreground w-8 text-right">{flow.count}x</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Response time per agent */}
          {analytics.routingByAgent.some(a => a.avgMs > 0) && (
            <div className="border rounded-lg bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3">Avg Response Time per Agent (ms)</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.routingByAgent.filter(a => a.avgMs > 0)}>
                  <XAxis dataKey="agent" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(value: number) => [`${value}ms`, 'Avg']}
                  />
                  <Bar dataKey="avgMs" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
  <div className="border rounded-lg bg-card p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      {icon}
      <span className="text-[10px]">{label}</span>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </div>
);
