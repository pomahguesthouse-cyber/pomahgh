import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "@/stores/editorStore";

interface PageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageSettingsDialog({ open, onOpenChange }: PageSettingsDialogProps) {
  const { pageSettings, setPageSettings } = useEditorStore();

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from title
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setPageSettings({ slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Page Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input
              value={pageSettings.title}
              onChange={(e) => setPageSettings({ title: e.target.value })}
              placeholder="My Landing Page"
            />
          </div>

          <div className="space-y-2">
            <Label>URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">/</span>
              <Input
                value={pageSettings.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-page"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>SEO Meta Title</Label>
            <Input
              value={pageSettings.metaTitle}
              onChange={(e) => setPageSettings({ metaTitle: e.target.value })}
              placeholder="Page title for search engines"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {pageSettings.metaTitle.length}/60 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>SEO Meta Description</Label>
            <Textarea
              value={pageSettings.metaDescription}
              onChange={(e) => setPageSettings({ metaDescription: e.target.value })}
              placeholder="Brief description for search engines"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {pageSettings.metaDescription.length}/160 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={pageSettings.status}
              onValueChange={(v: "draft" | "published") => setPageSettings({ status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
