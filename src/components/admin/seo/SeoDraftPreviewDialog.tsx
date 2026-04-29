import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, ExternalLink, Sparkles, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { useSeoLatestRunByAttraction, useSeoDrafts, type SeoDraft } from "@/hooks/useSeoAgent";

interface Props {
  draft: SeoDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate?: (draft: SeoDraft) => void;
  regenerating?: boolean;
}

export const SeoDraftPreviewDialog = ({ draft, open, onOpenChange, onRegenerate, regenerating }: Props) => {
  const { data: run, isLoading: loadingRun } = useSeoLatestRunByAttraction(draft?.id ?? null);
  const { setActive } = useSeoDrafts();

  if (!draft) return null;

  const issues = (run?.issues as string[] | null) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="truncate">{draft.name}</DialogTitle>
              <DialogDescription className="truncate">/{draft.slug}</DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Published</span>
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(c) => setActive.mutate({ id: draft.id, is_active: c })}
                />
              </div>
              {onRegenerate && (
                <Button size="sm" variant="outline" onClick={() => onRegenerate(draft)} disabled={regenerating}>
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Regenerate
                </Button>
              )}
              <Button asChild size="sm" variant="ghost">
                <a href={`/explore-semarang/${draft.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Tab baru
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] flex-1 overflow-hidden">
          {/* Sidebar meta */}
          <aside className="border-r bg-muted/30 overflow-y-auto p-4 space-y-4">
            <div className="aspect-video w-full rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {draft.image_url ? (
                <img src={draft.image_url} alt={draft.name} className="w-full h-full object-cover" />
              ) : (
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Meta Description</p>
              <p className="text-sm">{draft.description ?? "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Dibuat</p>
              <p className="text-sm">{format(new Date(draft.created_at), "dd/MM/yyyy HH:mm")}</p>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase">SEO Evaluasi</p>
              {loadingRun ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : run ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="SEO Score" value={run.seo_score?.toString() ?? "—"} />
                  <Stat label="Words" value={run.word_count?.toString() ?? "—"} />
                  <Stat label="Density %" value={run.keyword_density?.toFixed(2) ?? "—"} />
                  <Stat label="Readability" value={run.readability_score?.toFixed(0) ?? "—"} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada data evaluasi.</p>
              )}
              {issues.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Issues</p>
                  {issues.map((iss, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] block w-fit">{iss}</Badge>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Article body */}
          <article className="overflow-y-auto p-6">
            {draft.long_description ? (
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                <ReactMarkdown>{draft.long_description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada konten artikel.</p>
            )}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-background px-2 py-1.5">
    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);