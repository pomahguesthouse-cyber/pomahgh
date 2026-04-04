import { useCallback, useEffect, useRef } from "react";
import { useTrainerStore } from "@/stores/trainerStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, SkipForward, Zap, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function callTrainer(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-trainer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error("Rate limited");
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function TrainingPanel() {
  const {
    currentSession, isRunning, isThinking,
    startSession, addMessage, setEvaluation, completeSession,
    setIsThinking, scenario,
  } = useTrainerStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentSession?.conversation]);

  const runTurn = useCallback(async () => {
    if (!currentSession || isThinking) return;
    const conv = currentSession.conversation;
    setIsThinking(true);
    try {
      // Guest turn
      const guestRes = await callTrainer("trainer_message", { scenario: currentSession.scenario, conversation: conv });
      addMessage(guestRes);

      // Bot turn
      const updatedConv = [...conv, guestRes];
      const botRes = await callTrainer("pomah_reply", { scenario: currentSession.scenario, conversation: updatedConv });
      addMessage(botRes);
    } catch (e: any) {
      toast.error(e.message || "Failed to run turn");
    } finally {
      setIsThinking(false);
    }
  }, [currentSession, isThinking, addMessage, setIsThinking, scenario]);

  const handleStart = useCallback(async () => {
    startSession();
    // Run first turn after starting
    setTimeout(() => {
      useTrainerStore.getState().currentSession && runTurn();
    }, 100);
  }, [startSession]);

  // We need to re-trigger runTurn after state updates
  const handleNextTurn = useCallback(() => runTurn(), [runTurn]);

  const handleAutoRun = useCallback(async () => {
    for (let i = 0; i < 5; i++) {
      const st = useTrainerStore.getState();
      if (!st.currentSession || !st.isRunning) break;
      if (st.currentSession.conversation.length >= 10) break;
      await new Promise<void>((resolve) => {
        const run = async () => {
          const state = useTrainerStore.getState();
          if (!state.currentSession) { resolve(); return; }
          state.setIsThinking(true);
          try {
            const conv = state.currentSession.conversation;
            const guestRes = await callTrainer("trainer_message", { scenario: state.currentSession.scenario, conversation: conv });
            state.addMessage(guestRes);
            const updatedConv = [...conv, guestRes];
            const botRes = await callTrainer("pomah_reply", { scenario: state.currentSession.scenario, conversation: updatedConv });
            state.addMessage(botRes);
          } catch (e: any) {
            toast.error(e.message);
          } finally {
            state.setIsThinking(false);
            resolve();
          }
        };
        run();
      });
    }
    // Evaluate after auto-run
    handleEvaluate();
  }, []);

  const handleEvaluate = useCallback(async () => {
    const st = useTrainerStore.getState();
    if (!st.currentSession || st.currentSession.conversation.length < 2) return;
    st.setIsThinking(true);
    try {
      const res = await callTrainer("evaluate", {
        scenario: st.currentSession.scenario,
        conversation: st.currentSession.conversation,
        sessionId: st.currentSession.id,
      });
      st.setEvaluation(res.evaluation);
      st.completeSession();
      toast.success("Training session completed & evaluated!");
    } catch (e: any) {
      toast.error(e.message || "Evaluation failed");
    } finally {
      st.setIsThinking(false);
    }
  }, []);

  const conversation = currentSession?.conversation ?? [];

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
        <span className="font-semibold text-sm flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Training Chat
        </span>
        {currentSession?.scenario && (
          <span className="text-xs text-muted-foreground capitalize">
            {currentSession.scenario.persona} · {currentSession.scenario.difficulty} · {currentSession.scenario.language.toUpperCase()}
          </span>
        )}
      </div>

      {/* Chat */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef as any}>
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16">
            <Bot className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No conversation yet</p>
            <p className="text-xs mt-1">Configure scenario and click Start Training</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversation.map((msg, i) => (
              <div key={i} className={cn("flex gap-2.5", msg.role === "bot" ? "justify-start" : "justify-end")}>
                {msg.role === "guest" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mt-0.5">
                    <User className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                    msg.role === "bot"
                      ? "bg-primary/10 text-foreground rounded-bl-sm"
                      : "bg-orange-500 text-white rounded-br-sm"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "bot" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-2.5 justify-start">
                <div className="rounded-2xl px-4 py-2.5 bg-muted text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Controls */}
      <div className="border-t p-3 flex gap-2 flex-wrap">
        {!isRunning ? (
          <Button onClick={handleStart} className="gap-2">
            <Play className="h-4 w-4" /> Start Training
          </Button>
        ) : (
          <>
            <Button onClick={handleNextTurn} disabled={isThinking} variant="outline" className="gap-2">
              <SkipForward className="h-4 w-4" /> Next Turn
            </Button>
            <Button onClick={handleAutoRun} disabled={isThinking} variant="outline" className="gap-2">
              <Zap className="h-4 w-4" /> Auto Run (5)
            </Button>
            <Button onClick={handleEvaluate} disabled={isThinking || conversation.length < 2} className="gap-2 ml-auto">
              Evaluate & Finish
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
