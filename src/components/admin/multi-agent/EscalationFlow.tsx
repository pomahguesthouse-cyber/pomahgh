import { useState } from 'react';
import { ArrowRight, Plus, Trash2, Save, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface EscalationFlowProps {
  agents: AgentDefinition[];
}

export const EscalationFlow = ({ agents }: EscalationFlowProps) => {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      const nextPriority = (rules?.length || 0) + 1;
      const { error } = await supabase.from('escalation_rules').insert({
        from_agent: agents[0]?.id || 'intent',
        to_agent: agents[1]?.id || 'booking',
        condition_text: '',
        priority: nextPriority,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalation-rules'] }),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('escalation_rules').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('escalation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast({ title: 'Alur dihapus' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Alur Eskalasi Antar Agent</h3>
          {saved && (
            <span className="text-[10px] text-primary flex items-center gap-0.5">
              <CheckCircle className="w-3 h-3" /> Tersimpan
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1"
          onClick={() => addRule.mutate()}
          disabled={addRule.isPending}
        >
          {addRule.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Tambah Alur
        </Button>
      </div>

      <div className="space-y-3">
        {rules?.map(rule => (
          <RuleRow
            key={rule.id}
            rule={rule}
            agents={agents}
            onUpdate={(updates) => updateRule.mutate({ id: rule.id, updates })}
            onDelete={() => deleteRule.mutate(rule.id)}
            isDeleting={deleteRule.isPending}
          />
        ))}
        {(!rules || rules.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada aturan eskalasi</p>
        )}
      </div>
    </div>
  );
};

interface RuleRowProps {
  rule: {
    id: string;
    from_agent: string;
    to_agent: string;
    condition_text: string;
    is_active: boolean | null;
  };
  agents: AgentDefinition[];
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const RuleRow = ({ rule, agents, onUpdate, onDelete, isDeleting }: RuleRowProps) => {
  const [condition, setCondition] = useState(rule.condition_text);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${rule.is_active ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}>
      <Switch
        checked={rule.is_active ?? true}
        onCheckedChange={(v) => onUpdate({ is_active: v })}
        className="scale-75"
      />
      <Select value={rule.from_agent} onValueChange={v => onUpdate({ from_agent: v })}>
        <SelectTrigger className="w-36 text-xs h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {agents.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.icon} {a.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
      <Select value={rule.to_agent} onValueChange={v => onUpdate({ to_agent: v })}>
        <SelectTrigger className="w-36 text-xs h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {agents.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.icon} {a.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        value={condition}
        onChange={e => setCondition(e.target.value)}
        onBlur={() => { if (condition !== rule.condition_text) onUpdate({ condition_text: condition }); }}
        placeholder="Kondisi eskalasi..."
        className="flex-1 text-xs h-8"
      />
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete} disabled={isDeleting}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};
