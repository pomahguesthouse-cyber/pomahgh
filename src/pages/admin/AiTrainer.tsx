import { TrainingPanel } from "@/components/ai-trainer/TrainingPanel";
import { ScenarioSettings } from "@/components/ai-trainer/ScenarioSettings";
import { EvaluationPanel } from "@/components/ai-trainer/EvaluationPanel";
import { TrainingHistory } from "@/components/ai-trainer/TrainingHistory";
import { Brain } from "lucide-react";

export default function AiTrainer() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <Brain className="h-6 w-6 text-primary" />
          Pomah AI Trainer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-agent training system — simulate guests, train the chatbot, and evaluate performance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Settings + History */}
        <div className="lg:col-span-3 space-y-6">
          <ScenarioSettings />
          <TrainingHistory />
        </div>

        {/* Center: Chat */}
        <div className="lg:col-span-5">
          <TrainingPanel />
        </div>

        {/* Right: Evaluation */}
        <div className="lg:col-span-4">
          <EvaluationPanel />
        </div>
      </div>
    </div>
  );
}
