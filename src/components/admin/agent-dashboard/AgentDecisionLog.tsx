import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch } from 'lucide-react';
import type { AgentDecision } from '@/hooks/useAgentDashboard';

interface Props {
  decisions: AgentDecision[];
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: 'bg-amber-500',
  intent: 'bg-blue-500',
  booking: 'bg-green-500',
  pricing: 'bg-purple-500',
  manager: 'bg-red-500',
  faq: 'bg-cyan-500',
};

export function AgentDecisionLog({ decisions }: Props) {
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [showLong, setShowLong] = useState(false);

  const agents = [...new Set(decisions.map(d => d.from_agent))];

  const filtered = agentFilter === 'all'
    ? decisions
    : decisions.filter(d => d.from_agent === agentFilter || d.to_agent === agentFilter);

  const displayed = showLong ? filtered : filtered.slice(0, 20);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Agent Decision Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setShowLong(!showLong)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              {showLong ? 'Short' : 'Long'}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[350px]">
          {displayed.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Belum ada keputusan tercatat
            </p>
          ) : (
            <div className="px-4 py-2 space-y-2">
              {displayed.map((decision) => {
                const time = new Date(decision.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                const dotColor = AGENT_COLORS[decision.from_agent] || 'bg-gray-400';

                return (
                  <div key={decision.id} className="flex gap-3 items-start">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      <div className="w-px h-full bg-border" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-mono">[{time}]</span>
                        <span className="text-xs font-semibold capitalize">{decision.from_agent}</span>
                        {decision.to_agent && (
                          <>
                            <span className="text-xs text-muted-foreground">→</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize font-semibold">
                              {decision.to_agent}
                            </Badge>
                          </>
                        )}
                      </div>
                      {decision.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {decision.reason}
                        </p>
                      )}
                      {(decision.intent || decision.confidence !== null) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {decision.intent && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {decision.intent}
                            </Badge>
                          )}
                          {decision.confidence !== null && (
                            <span className="text-[10px] text-green-600 font-mono">
                              Conf: {Math.round(decision.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
