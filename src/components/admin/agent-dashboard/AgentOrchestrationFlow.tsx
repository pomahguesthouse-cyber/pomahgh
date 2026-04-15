import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';
import type { AgentDecision } from '@/hooks/useAgentDashboard';
import { cn } from '@/lib/utils';

interface Props {
  decisions: AgentDecision[];
  selectedConvId: string | null;
}

interface AgentNode {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

const NODES: AgentNode[] = [
  { id: 'orchestrator', label: 'Orchestrator', icon: '🎯', x: 250, y: 30 },
  { id: 'intent',       label: 'Intent Agent', icon: '🧠', x: 80,  y: 120 },
  { id: 'booking',      label: 'Booking Agent', icon: '📋', x: 250, y: 120 },
  { id: 'faq',          label: 'FAQ Agent', icon: '📖', x: 420, y: 120 },
  { id: 'pricing',      label: 'Pricing Agent', icon: '💰', x: 165, y: 210 },
  { id: 'payment',      label: 'Payment Agent', icon: '💳', x: 335, y: 210 },
];

const EDGES: Array<[string, string]> = [
  ['orchestrator', 'intent'],
  ['orchestrator', 'booking'],
  ['orchestrator', 'faq'],
  ['intent', 'booking'],
  ['booking', 'faq'],
  ['booking', 'pricing'],
  ['booking', 'payment'],
];

export function AgentOrchestrationFlow({ decisions, selectedConvId }: Props) {
  // Determine which agents are "active" based on recent decisions
  const activeAgents = useMemo(() => {
    const relevant = selectedConvId
      ? decisions.filter(d => d.conversation_id === selectedConvId)
      : decisions.slice(0, 10);

    const agents = new Set<string>();
    const routes = new Set<string>();

    for (const d of relevant) {
      agents.add(d.from_agent);
      if (d.to_agent) {
        agents.add(d.to_agent);
        routes.add(`${d.from_agent}->${d.to_agent}`);
      }
    }

    const lastDecision = relevant[0];
    return { agents, routes, lastDecision };
  }, [decisions, selectedConvId]);

  const getNodePos = (id: string) => NODES.find(n => n.id === id);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Network className="h-4 w-4" />
            AI Orchestration
          </CardTitle>
          {activeAgents.lastDecision && (
            <Badge variant="outline" className="text-[10px]">
              Dispatched: {activeAgents.lastDecision.to_agent || activeAgents.lastDecision.from_agent}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="relative w-full" style={{ height: 260 }}>
          {/* SVG edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {EDGES.map(([from, to]) => {
              const fromNode = getNodePos(from);
              const toNode = getNodePos(to);
              if (!fromNode || !toNode) return null;

              const routeKey = `${from}->${to}`;
              const isActive = activeAgents.routes.has(routeKey);

              return (
                <line
                  key={routeKey}
                  x1={fromNode.x + 50}
                  y1={fromNode.y + 25}
                  x2={toNode.x + 50}
                  y2={toNode.y + 5}
                  stroke={isActive ? '#d97706' : '#e5e7eb'}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={isActive ? undefined : '4 4'}
                  markerEnd={isActive ? 'url(#arrow)' : undefined}
                />
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#d97706" />
              </marker>
            </defs>
          </svg>

          {/* Agent nodes */}
          {NODES.map((node) => {
            const isActive = activeAgents.agents.has(node.id);
            const lastForAgent = decisions.find(d =>
              d.to_agent === node.id || d.from_agent === node.id
            );

            return (
              <div
                key={node.id}
                className={cn(
                  'absolute flex flex-col items-center gap-0.5 w-[100px] text-center transition-all',
                  isActive && 'scale-105'
                )}
                style={{ left: node.x, top: node.y, zIndex: 1 }}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-lg border-2 bg-white shadow-sm transition-all',
                  isActive
                    ? 'border-amber-400 shadow-amber-200/50 shadow-md'
                    : 'border-gray-200'
                )}>
                  {node.icon}
                </div>
                <span className={cn(
                  'text-[10px] font-medium leading-tight',
                  isActive ? 'text-amber-700' : 'text-muted-foreground'
                )}>
                  {node.label}
                </span>
                {isActive && lastForAgent?.intent && (
                  <span className="text-[9px] text-amber-600 bg-amber-50 rounded px-1">
                    {lastForAgent.intent}
                    {lastForAgent.confidence && ` ${Math.round(lastForAgent.confidence * 100)}%`}
                  </span>
                )}
              </div>
            );
          })}

          {/* User icon */}
          <div className="absolute flex flex-col items-center gap-1" style={{ left: 10, top: 30, zIndex: 1 }}>
            <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-sm">
              👤
            </div>
            <span className="text-[10px] text-muted-foreground">User</span>
          </div>
          {/* Edge from user to orchestrator */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <line x1={55} y1={50} x2={250} y2={50} stroke="#d97706" strokeWidth={2} />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
