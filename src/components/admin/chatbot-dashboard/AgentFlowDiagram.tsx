import { ArrowRight, Bot, MessageSquare, Calendar, HelpCircle, DollarSign, CreditCard, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const agents = [
  { id: 'intent', label: 'Intent Agent', icon: MessageSquare, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { id: 'booking', label: 'Booking Agent', icon: Calendar, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { id: 'faq', label: 'FAQ Agent', icon: HelpCircle, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { id: 'pricing', label: 'Pricing Agent', icon: DollarSign, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { id: 'payment', label: 'Payment Agent', icon: CreditCard, color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  { id: 'manager', label: 'Manager Agent', icon: UserCog, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
];

interface AgentFlowDiagramProps {
  activeAgent?: string | null;
}

export const AgentFlowDiagram = ({ activeAgent }: AgentFlowDiagramProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Orchestration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          {/* Orchestrator node */}
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
            Orchestrator
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />

          {/* Agent grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
            {agents.map((agent) => {
              const Icon = agent.icon;
              const isActive = activeAgent === agent.id;
              return (
                <div
                  key={agent.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${agent.color} ${isActive ? 'ring-2 ring-primary shadow-md scale-105' : 'opacity-70'}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{agent.label}</span>
                  {isActive && <Badge variant="default" className="ml-auto text-[10px] px-1 py-0">Active</Badge>}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
