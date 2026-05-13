import { useState, useEffect } from "react";
import { useMultiAgentDashboard } from "@/hooks/useMultiAgentDashboard";
import { useChatbotAlerts } from "@/hooks/useChatbotAlerts";
import type { AgentDefinition } from "@/hooks/useMultiAgentDashboard";
import { DashboardLayout } from "@/features/multi-agent/DashboardLayout";
import { useMultiAgentOrchestrator } from "@/hooks/useMultiAgentOrchestrator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const toOrchestratorStatus = (status: AgentDefinition["status"]): "idle" | "busy" | "error" => {
  if (status === "error") return "error";
  if (status === "active" || status === "busy") return "busy";
  return "idle";
};

const AdminMultiAgentDashboard = () => {
  // Existing hooks
  const { agents, allAgents, sessions, stats, activityLog, routingLogs, saveAgentConfig } = useMultiAgentDashboard();

  const { data: alerts } = useChatbotAlerts({ onlyUnresolved: true });
  const unresolvedCount = (alerts || []).length;

  // === NEW: Orchestrator Integration ===
  const { executeTask, isProcessing, lastResult, registerAgent } = useMultiAgentOrchestrator();

  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  // Register all agents ke Orchestrator saat component mount
  useEffect(() => {
    agents.forEach((agent) => {
      registerAgent({
        id: agent.id,
        name: agent.name,
        role: agent.role || agent.name,
        status: toOrchestratorStatus(agent.status),
        capabilities: agent.tags || [],
      });
    });
  }, [agents, registerAgent]);

  const handleSaveConfig = (configId: string, data: Record<string, unknown>) => {
    saveAgentConfig.mutate({ configId, data });
  };

  // Contoh tombol test orchestrator
  const handleTestBooking = () => {
    executeTask({
      type: "booking.new",
      payload: {
        roomId: "101",
        guestName: "John Doe",
        checkIn: "2026-05-15",
        checkOut: "2026-05-18",
        source: "multi-agent-dashboard",
      },
      priority: "high",
    });
  };

  const handleTestPricing = () => {
    executeTask({
      type: "pricing.analyze",
      payload: { dateRange: "next_30_days" },
      priority: "medium",
    });
  };

  return (
    <div className="space-y-6">
      {/* Orchestrator Test Controls */}
      <Card className="mx-6 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🧠 Multi-Agent Orchestrator Test</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={handleTestBooking} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Test New Booking Agent"}
          </Button>
          <Button onClick={handleTestPricing} variant="outline" disabled={isProcessing}>
            Test Pricing Agent
          </Button>
        </CardContent>
      </Card>

      {/* Last Result Display */}
      {lastResult && (
        <Card className="mx-6">
          <CardHeader>
            <CardTitle>Last Orchestrator Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-auto max-h-60">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Original Dashboard Layout */}
      <DashboardLayout
        unresolvedCount={unresolvedCount}
        sessionsError={!!sessions.isError}
        stats={stats}
        agents={agents}
        allAgents={allAgents}
        selectedAgent={selectedAgent}
        setSelectedAgent={setSelectedAgent}
        handleSaveConfig={handleSaveConfig}
        isSaving={saveAgentConfig.isPending}
        sessions={sessions}
        activityLog={activityLog}
        routingLogs={routingLogs}
      />
    </div>
  );
};

export default AdminMultiAgentDashboard;
