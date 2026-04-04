import { useTrainerStore } from "@/stores/trainerStore";
import { Progress } from "@/components/ui/progress";
import { BarChart3, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const color = value >= 8 ? "text-green-600" : value >= 5 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-bold", color)}>{value}/10</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

export function EvaluationPanel() {
  const evaluation = useTrainerStore((s) => s.currentSession?.evaluation);

  if (!evaluation) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          Evaluation
        </div>
        <p className="text-xs text-muted-foreground text-center py-8">
          Run a training session to see evaluation scores here.
        </p>
      </div>
    );
  }

  const avg = ((evaluation.friendliness + evaluation.clarity + evaluation.persuasiveness + evaluation.conversion) / 4).toFixed(1);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          Evaluation
        </div>
        <span className="text-lg font-bold text-primary">{avg}<span className="text-xs text-muted-foreground">/10</span></span>
      </div>

      <div className="space-y-3">
        <ScoreBar label="Friendliness" value={evaluation.friendliness} />
        <ScoreBar label="Clarity" value={evaluation.clarity} />
        <ScoreBar label="Persuasiveness" value={evaluation.persuasiveness} />
        <ScoreBar label="Conversion Potential" value={evaluation.conversion} />
      </div>

      {evaluation.strengths.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 mb-1.5">
            <ThumbsUp className="h-3.5 w-3.5" /> Strengths
          </div>
          <ul className="space-y-1">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-green-200">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.weaknesses.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 mb-1.5">
            <ThumbsDown className="h-3.5 w-3.5" /> Weaknesses
          </div>
          <ul className="space-y-1">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-red-200">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.suggestedReply && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Suggested Reply
          </div>
          <p className="text-xs bg-primary/5 rounded-lg p-3 italic">{evaluation.suggestedReply}</p>
        </div>
      )}
    </div>
  );
}
