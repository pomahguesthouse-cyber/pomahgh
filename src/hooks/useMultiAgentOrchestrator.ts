// src/hooks/useMultiAgentOrchestrator.ts
import { useState, useEffect } from 'react';
import { orchestrator } from '@/features/multi-agent/orchestrator/core';
import { Task, AgentEvent } from '@/features/multi-agent/orchestrator/types';

export const useMultiAgentOrchestrator = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const executeTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    setIsProcessing(true);
    
    const fullTask: Task = {
      ...task,
      id: `task_${Date.now()}`,
      createdAt: new Date()
    };

    const result = await orchestrator.routeTask(fullTask);
    setLastResult(result);
    setIsProcessing(false);
    
    return result;
  };

  return {
    executeTask,
    isProcessing,
    lastResult,
    registerAgent: orchestrator.registerAgent.bind(orchestrator),
    subscribe: orchestrator.subscribe.bind(orchestrator)
  };
};