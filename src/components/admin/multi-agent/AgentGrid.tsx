import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface AgentGridProps {
  agents: AgentDefinition[];
  onSelectAgent: (agent: AgentDefinition) => void;
  selectedAgentId?: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  idle: 'bg-gray-400',
  busy: 'bg-amber-500',
  error: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  active: 'Aktif',
  idle: 'Idle',
  busy: 'Sibuk',
  error: 'Error',
};

type Filter = 'semua' | 'active' | 'idle' | 'busy';

export const AgentGrid = ({ agents, onSelectAgent, selectedAgentId }: AgentGridProps) => {
  const [filter, setFilter] = useState<Filter>('semua');

  const filtered = filter === 'semua' ? agents : agents.filter(a => a.status === filter);
  const filters: { key: Filter; label: string }[] = [
    { key: 'semua', label: 'Semua' },
    { key: 'active', label: 'Aktif' },
    { key: 'idle', label: 'Idle' },
    { key: 'busy', label: 'Sibuk' },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f.key ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(agent => (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`text-left p-4 rounded-lg border bg-card hover:shadow-md transition-all ${selectedAgentId === agent.id ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{agent.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] text-muted-foreground">{statusLabels[agent.status]}</span>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Chat aktif</span>
                <span className="font-medium text-foreground">{agent.chatCount}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Sukses rate</span>
                <span className="font-medium text-foreground">{agent.successRate.toFixed(1)}%</span>
              </div>
              <Progress value={agent.successRate} className="h-1.5" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Avg response</span>
                <span className="font-medium text-foreground">{agent.avgResponseTime}</span>
              </div>
              <div className="flex gap-1 flex-wrap mt-1">
                {'category' in agent && (
                  <Badge variant={agent.category === 'core' ? 'default' : agent.category === 'manager' ? 'destructive' : 'outline'} className="text-[9px] px-1.5 py-0">
                    {agent.category === 'core' ? '⚡ Core' : agent.category === 'manager' ? '🔐 Manager' : '🧩 Specialist'}
                  </Badge>
                )}
                {agent.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
