import { useState } from "react";
import { Copy, Star, Trash2, Edit2, Eye, Check } from "lucide-react";
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
import { useToast } from "@/hooks/shared/useToast";
import { 
  PromptTemplate, 
  PROMPT_CATEGORIES,
  useDeletePromptTemplate,
  useToggleFavorite,
  useIncrementUseCount 
} from "@/hooks/shared/usePromptTemplates";
import { cn } from "@/lib/utils";

interface PromptTemplateCardProps {
  template: PromptTemplate;
  onEdit: (template: PromptTemplate) => void;
}

export function PromptTemplateCard({ template, onEdit }: PromptTemplateCardProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const deleteTemplate = useDeletePromptTemplate();
  const toggleFavorite = useToggleFavorite();
  const incrementUseCount = useIncrementUseCount();

  const categoryLabel = PROMPT_CATEGORIES.find(c => c.value === template.category)?.label || template.category;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.prompt_content);
      setCopied(true);
      incrementUseCount.mutate(template.id);
      toast({
        title: "Disalin!",
        description: "Prompt sudah dicopy ke clipboard. Paste di Lovable chat.",
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

  const handleToggleFavorite = () => {
    toggleFavorite.mutate({ id: template.id, is_favorite: !template.is_favorite });
  };

  const handleDelete = () => {
    deleteTemplate.mutate(template.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{template.title}</h3>
                {template.is_favorite && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {categoryLabel}
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
                onClick={handleToggleFavorite}
              >
                <Star className={cn(
                  "h-3.5 w-3.5",
                  template.is_favorite && "fill-yellow-400 text-yellow-400"
                )} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {template.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {template.description}
            </p>
          )}
          
          <div className="bg-muted/50 rounded-md p-2 mb-3">
            <pre className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-mono">
              {template.prompt_content}
            </pre>
          </div>

          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Dipakai {template.use_count}x
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onEdit(template)}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
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
              {template.title}
              {template.is_favorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge>{categoryLabel}</Badge>
              {template.tags?.map((tag, i) => (
                <Badge key={i} variant="outline">{tag}</Badge>
              ))}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {template.prompt_content}
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
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template "{template.title}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
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












