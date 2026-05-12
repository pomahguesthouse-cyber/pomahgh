export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
}

export interface Task {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
}

export interface AgentEvent {
  type: string;
  sourceAgent: string;
  targetAgent?: string;
  data: any;
  timestamp: Date;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  agentId: string;
}