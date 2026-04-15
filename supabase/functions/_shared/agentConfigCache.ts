/**
 * Shared agent config cache.
 * Populated by orchestrator per request, readable by all agents in the same invocation.
 */

export interface AgentConfigRecord {
  agent_id: string;
  is_active: boolean;
  system_prompt: string | null;
  temperature: number;
  escalation_target: string | null;
  auto_escalate: boolean;
}

export interface EscalationRule {
  from_agent: string;
  to_agent: string;
  condition_text: string;
  priority: number;
  is_active: boolean;
}

let _configMap: Map<string, AgentConfigRecord> = new Map();
let _rules: EscalationRule[] = [];

/** Store agent configs (called by orchestrator at start of request) */
export function setAgentConfigs(configs: AgentConfigRecord[], rules: EscalationRule[]): void {
  _configMap = new Map(configs.map(c => [c.agent_id, c]));
  _rules = rules;
}

/** Get config for a specific agent */
export function getAgentConfig(agentId: string): AgentConfigRecord | undefined {
  return _configMap.get(agentId);
}

/** Check if an agent is active (defaults to true if not in DB) */
export function isAgentActive(agentId: string): boolean {
  const config = _configMap.get(agentId);
  return config ? config.is_active : true;
}

/** Get escalation target for an agent using escalation_rules first, then agent_configs fallback */
export function getEscalationTarget(fromAgent: string): string | null {
  const rule = _rules.find(r => r.from_agent === fromAgent);
  if (rule) return rule.to_agent;
  return _configMap.get(fromAgent)?.escalation_target || null;
}
