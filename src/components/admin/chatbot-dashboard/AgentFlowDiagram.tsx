import { Bot, MessageSquare, Calendar, HelpCircle, DollarSign, CreditCard, UserCog, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const agents = [
  { id: 'intent', label: 'Intent Agent', icon: MessageSquare, x: 300, y: 60 },
  { id: 'booking', label: 'Booking Agent', icon: Calendar, x: 140, y: 180 },
  { id: 'faq', label: 'FAQ Agent', icon: HelpCircle, x: 300, y: 180 },
  { id: 'pricing', label: 'Pricing Agent', icon: DollarSign, x: 460, y: 180 },
  { id: 'payment', label: 'Payment Agent', icon: CreditCard, x: 220, y: 280 },
  { id: 'manager', label: 'Manager Agent', icon: UserCog, x: 380, y: 280 },
];

const connections = [
  { from: { x: 80, y: 40 }, to: { x: 270, y: 60 } },       // User → Intent
  { from: { x: 300, y: 100 }, to: { x: 160, y: 170 } },     // Intent → Booking
  { from: { x: 300, y: 100 }, to: { x: 300, y: 170 } },     // Intent → FAQ
  { from: { x: 300, y: 100 }, to: { x: 440, y: 170 } },     // Intent → Pricing
  { from: { x: 180, y: 220 }, to: { x: 220, y: 270 } },     // Booking → Payment
  { from: { x: 340, y: 220 }, to: { x: 380, y: 270 } },     // FAQ → Manager
];

interface AgentFlowDiagramProps {
  activeAgent?: string | null;
}

export const AgentFlowDiagram = ({ activeAgent }: AgentFlowDiagramProps) => {
  const activeIdx = agents.findIndex(a => a.id === activeAgent);
  const intentCtx = activeAgent
    ? `Intent: ${activeAgent.toUpperCase()}`
    : 'Waiting...';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Orchestration Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <svg viewBox="0 0 600 340" className="w-full max-w-2xl mx-auto" style={{ minWidth: 400 }}>
          {/* Connections */}
          {connections.map((c, i) => {
            const isActive = activeAgent && (
              (i === 1 && activeAgent === 'booking') ||
              (i === 2 && activeAgent === 'faq') ||
              (i === 3 && activeAgent === 'pricing') ||
              (i === 4 && activeAgent === 'payment') ||
              (i === 5 && activeAgent === 'manager') ||
              i === 0
            );
            return (
              <line
                key={i}
                x1={c.from.x} y1={c.from.y}
                x2={c.to.x} y2={c.to.y}
                stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.25)'}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeDasharray={isActive ? undefined : '6 4'}
              />
            );
          })}

          {/* User node */}
          <g>
            <circle cx={60} cy={35} r={22} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1.5} />
            <foreignObject x={44} y={19} width={32} height={32}>
              <div className="flex items-center justify-center h-full">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </foreignObject>
            <text x={60} y={72} textAnchor="middle" className="fill-muted-foreground text-[10px]">User</text>
          </g>

          {/* Agent nodes */}
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isActive = activeAgent === agent.id;
            return (
              <g key={agent.id}>
                <rect
                  x={agent.x - 55} y={agent.y - 18}
                  width={110} height={36} rx={8}
                  className={cn(
                    'transition-all',
                    isActive
                      ? 'fill-primary/15 stroke-primary'
                      : 'fill-muted stroke-border'
                  )}
                  strokeWidth={isActive ? 2 : 1}
                />
                <foreignObject x={agent.x - 50} y={agent.y - 12} width={24} height={24}>
                  <div className="flex items-center justify-center h-full">
                    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                </foreignObject>
                <text
                  x={agent.x + 5} y={agent.y + 4}
                  className={cn('text-[10px] font-medium', isActive ? 'fill-primary' : 'fill-foreground')}
                >
                  {agent.label}
                </text>
                {isActive && (
                  <circle cx={agent.x + 50} cy={agent.y} r={4} className="fill-primary animate-pulse" />
                )}
              </g>
            );
          })}

          {/* Intent badge */}
          <rect x={220} y={115} width={160} height={24} rx={12}
            className="fill-primary/10 stroke-primary/30" strokeWidth={1} />
          <text x={300} y={131} textAnchor="middle" className="fill-primary text-[10px] font-medium">
            {intentCtx}
          </text>
        </svg>
      </CardContent>
    </Card>
  );
};
