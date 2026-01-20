import { useState } from "react";
import { Zap, Eye, Trash2, ToggleLeft, ToggleRight, Check, Copy } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  useDeleteAdminKnowledge,
  useToggleAdminKnowledge,
  AdminKnowledgeEntry
} from "@/hooks/useAdminKnowledgeBase";
import { cn } from "@/lib/utils";

interface TokenSaverTipCardProps {
  tip: AdminKnowledgeEntry;
}

export function TokenSaverTipCard({ tip }: TokenSaverTipCardProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const deleteKnowledge = useDeleteAdminKnowledge();
  const toggleKnowledge = useToggleAdminKnowledge();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tip.content || "");
      setCopied(true);
      toast({
        title: "Disalin!",
        description: "Tips sudah dicopy ke clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Gagal menyalin",
        description: "Tidak bisa mengakses clipboard",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = () => {
    toggleKnowledge.mutate({ id: tip.id, is_active: !tip.is_active });
  };

  const handleDelete = () => {
    deleteKnowledge.mutate(tip.id);
    setShowDeleteDialog(false);
  };

  // Extract summary from content (first paragraph or first 150 chars)
  const getSummary = (content: string | null) => {
    if (!content) return "";
    const firstParagraph = content.split("\n\n")[0];
    return firstParagraph.length > 150 
      ? firstParagraph.substring(0, 150) + "..." 
      : firstParagraph;
  };

  return (
    <>
      <Card className={cn(
        "group hover:shadow-md transition-shadow",
        !tip.is_active && "opacity-60"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{tip.title}</h3>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                <Zap className="h-3 w-3 mr-1" />
                Token Saver
              </Badge>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleToggleActive}
                title={tip.is_active ? "Nonaktifkan" : "Aktifkan"}
              >
                {tip.is_active ? (
                  <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tip.summary ? (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {tip.summary}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {getSummary(tip.content)}
            </p>
          )}
          
          <div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-md p-2 mb-3">
            <pre className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-mono">
              {tip.content?.substring(0, 200)}...
            </pre>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {tip.is_active ? "Aktif" : "Nonaktif"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {tip.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                <Zap className="h-3 w-3 mr-1" />
                Token Saver Tips
              </Badge>
              <Badge variant={tip.is_active ? "default" : "secondary"}>
                {tip.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            {tip.summary && (
              <p className="text-sm text-muted-foreground">{tip.summary}</p>
            )}
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {tip.content}
              </pre>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Token Saver Tip?</AlertDialogTitle>
            <AlertDialogDescription>
              Tip "{tip.title}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
