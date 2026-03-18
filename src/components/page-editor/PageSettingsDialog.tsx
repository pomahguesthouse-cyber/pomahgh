import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/stores/editorStore";
import { MediaPickerField } from "@/components/admin/landing-pages/MediaPickerField";

interface PageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageSettingsDialog({ open, onOpenChange }: PageSettingsDialogProps) {
  const { pageSettings, setPageSettings } = useEditorStore();
  const [activeTab, setActiveTab] = useState("info");

  const handleSlugChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setPageSettings({ slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Page Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Page Info</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="social">Social Share</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 py-4">
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
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 py-4">
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
          </TabsContent>

          <TabsContent value="social" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>OG Image</Label>
              <p className="text-xs text-muted-foreground">
                Image shown when shared on social media (1200x630 recommended)
              </p>
              <MediaPickerField
                value={pageSettings.ogImage || ""}
                onChange={(url) => setPageSettings({ ogImage: url })}
              />
            </div>

            <div className="space-y-2">
              <Label>OG Title</Label>
              <Input
                value={pageSettings.ogTitle || ""}
                onChange={(e) => setPageSettings({ ogTitle: e.target.value })}
                placeholder="Title for social media share"
              />
            </div>

            <div className="space-y-2">
              <Label>OG Description</Label>
              <Textarea
                value={pageSettings.ogDescription || ""}
                onChange={(e) => setPageSettings({ ogDescription: e.target.value })}
                placeholder="Description for social media share"
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>

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
