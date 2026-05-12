// src/features/multi-agent/orchestrator/core.ts
import { Agent, Task, AgentEvent, AgentResult } from './types';

class MultiAgentOrchestrator {
  private agents = new Map<string, Agent>();
  private eventListeners = new Map<string, ((event: AgentEvent) => void)[]>();

  registerAgent(agent: Agent) {
    this.agents.set(agent.id, agent);
    console.log(`[Orchestrator] Agent registered: ${agent.name}`);
  }

  async routeTask(task: Task): Promise<AgentResult> {
    console.log(`[Orchestrator] Routing task: ${task.type}`);

    // Simple Router Logic (bisa di-upgrade ke LLM Router nanti)
    const targetAgent = this.decideTargetAgent(task);

    if (!targetAgent) {
      return {
        success: false,
        error: 'No suitable agent found',
        agentId: 'orchestrator'
      };
    }

    const event: AgentEvent = {
      type: 'TASK_ASSIGNED',
      sourceAgent: 'orchestrator',
      targetAgent: targetAgent.id,
      data: { task },
      timestamp: new Date()
    };

    this.broadcast(event);

    // Simulate agent execution (nanti diganti dengan real agent call)
    try {
      const result = await this.executeAgent(targetAgent.id, task);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: targetAgent.id
      };
    }
  }

  private decideTargetAgent(task: Task): Agent | null {
    // Logic sederhana — bisa dikembangkan
    if (task.type.includes('booking') || task.type.includes('reservation')) {
      return this.getAgentByRole('booking');
    }
    if (task.type.includes('price') || task.type.includes('promotion')) {
      return this.getAgentByRole('pricing');
    }
    if (task.type.includes('whatsapp') || task.type.includes('chat')) {
      return this.getAgentByRole('whatsapp');
    }
    if (task.type.includes('competitor')) {
      return this.getAgentByRole('competitor');
    }
    return Array.from(this.agents.values())[0] || null;
  }

  private getAgentByRole(role: string): Agent | null {
    return Array.from(this.agents.values()).find(a => 
      a.role.toLowerCase().includes(role)
    ) || null;
  }

  private async executeAgent(agentId: string, task: Task): Promise<AgentResult> {
    // Di sini nanti panggil real agent logic / API / LLM
    await new Promise(resolve => setTimeout(resolve, 300)); // simulasi

    return {
      success: true,
      data: { message: `Task ${task.id} completed by ${agentId}` },
      agentId
    };
  }

  subscribe(eventType: string, callback: (event: AgentEvent) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  broadcast(event: AgentEvent) {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(callback => callback(event));
    
    // Optional: Simpan ke Supabase untuk persistence
    console.log(`[Orchestrator] Broadcast: ${event.type}`);
  }
}

// Singleton
export const orchestrator = new MultiAgentOrchestrator();