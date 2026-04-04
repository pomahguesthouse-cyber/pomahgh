import { useEffect, useCallback } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TrainingHistory() {
  const { sessions, setSessions, viewSession, currentSession } = useTrainerStore();

  const loadSessions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-trainer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "list_sessions" }),
      });
      if (!res.ok) throw new Error();
      const { sessions: data } = await res.json();
      setSessions(
        (data || []).map((s: any) => ({
          id: s.id,
          scenario: s.scenario,
          conversation: s.conversation,
          evaluation: s.evaluation,
          status: s.status,
          created_at: s.created_at,
        }))
      );
    } catch {
      toast.error("Failed to load history");
    }
  }, [setSessions]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  return (
    <div className="rounded-xl border bg-card flex flex-col">
      <div className="flex items-center gap-2 px-5 py-3 border-b text-sm font-semibold">
        <History className="h-4 w-4 text-primary" />
        Training History
      </div>
      <ScrollArea className="max-h-[400px]">
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No past sessions</p>
        ) : (
          <div className="divide-y">
            {sessions.map((s) => {
              const avg = s.evaluation
                ? ((s.evaluation.friendliness + s.evaluation.clarity + s.evaluation.persuasiveness + s.evaluation.conversion) / 4).toFixed(1)
                : "—";
              const isActive = currentSession?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => viewSession(s.id)}
                  className={cn(
                    "w-full text-left px-5 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3",
                    isActive && "bg-primary/5"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium capitalize truncate">
                      {s.scenario.persona} · {s.scenario.difficulty}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(s.created_at), "dd MMM yyyy HH:mm")} · {s.conversation.length} msgs
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">{avg}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
