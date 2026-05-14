import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Status panel: jumlah training contoh yang sudah / belum di-embed
 * untuk seleksi semantic similarity oleh chatbot.
 */
export function TrainingEmbeddingStatus() {
  const { toast } = useToast();
  const [stats, setStats] = useState<{ total: number; embedded: number } | null>(null);
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    const [{ count: total }, { count: embedded }] = await Promise.all([
      supabase.from("chatbot_training_examples").select("*", { count: "exact", head: true }),
      supabase.from("chatbot_training_examples").select("*", { count: "exact", head: true }).not("embedding", "is", null),
    ]);
    setStats({ total: total ?? 0, embedded: embedded ?? 0 });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runEmbed = async (force = false) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("embed-training-examples", {
        body: { force },
      });
      if (error) throw error;
      const guest = data?.results?.find((r: { table: string; embedded: number }) => r.table === "chatbot_training_examples");
      toast({
        title: "Embedding selesai",
        description: `${guest?.embedded ?? 0} contoh di-embed.`,
      });
      await refresh();
    } catch (e) {
      toast({
        title: "Gagal embed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  if (!stats) return null;
  const pending = stats.total - stats.embedded;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Semantic Search:</span>
      <Badge variant={pending === 0 ? "default" : "secondary"}>
        {stats.embedded}/{stats.total} ter-embed
      </Badge>
      {pending > 0 && (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          {pending} tertunda
        </Badge>
      )}
      <div className="ml-auto flex gap-2">
        {pending > 0 && (
          <Button size="sm" variant="default" onClick={() => runEmbed(false)} disabled={running}>
            {running ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Embed yang tertunda
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => runEmbed(true)} disabled={running}>
          Re-embed semua
        </Button>
      </div>
    </div>
  );
}