import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { MediaPickerField } from "@/components/admin/landing-pages/MediaPickerField";
import { Loader2 } from "lucide-react";

interface LandingPage {
  id: string;
  page_title: string;
  slug: string;
  meta_description: string | null;
  primary_keyword: string;
  page_schema: any;
  status: "draft" | "published";
  display_order: number;
  created_at: string;
  updated_at: string;
  og_image_url?: string | null;
}

interface PageSettingsEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: LandingPage | null;
}

export function PageSettingsEditDialog({ open, onOpenChange, page }: PageSettingsEditDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");
  const [formData, setFormData] = useState({
    page_title: "",
    slug: "",
    meta_description: "",
    primary_keyword: "",
    status: "draft" as "draft" | "published",
    og_image_url: "",
    og_title: "",
    og_description: "",
  });

  useEffect(() => {
    if (page) {
      setFormData({
        page_title: page.page_title || "",
        slug: page.slug || "",
        meta_description: page.meta_description || "",
        primary_keyword: page.primary_keyword || "",
        status: page.status || "draft",
        og_image_url: page.og_image_url || "",
        og_title: "",
        og_description: "",
      });
    }
  }, [page]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          page_title: formData.page_title,
          slug: formData.slug,
          meta_description: formData.meta_description,
          primary_keyword: formData.primary_keyword,
          status: formData.status,
          og_image_url: formData.og_image_url || null,
        })
        .eq("id", page?.id ?? "");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Pengaturan halaman berhasil disimpan");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Gagal menyimpan pengaturan halaman");
    }
  });

  const handleSlugChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setFormData({ ...formData, slug });
  };

  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengaturan Halaman: {page.page_title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="social">Social Share</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Judul Halaman</Label>
              <Input
                value={formData.page_title}
                onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
                placeholder="Judul halaman"
              />
            </div>

            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="url-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v: "draft" | "published") => setFormData({ ...formData, status: v })}
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
              <Label>Meta Title</Label>
              <Input
                value={formData.meta_description ? formData.page_title : ""}
                onChange={(e) => setFormData({ ...formData, page_title: e.target.value })}
                placeholder="Judul untuk SEO"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                {formData.page_title.length}/60 karakter
              </p>
            </div>

            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={formData.meta_description || ""}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                placeholder="Deskripsi untuk search engines"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_description?.length || 0}/160 karakter
              </p>
            </div>

            <div className="space-y-2">
              <Label>Primary Keyword</Label>
              <Input
                value={formData.primary_keyword || ""}
                onChange={(e) => setFormData({ ...formData, primary_keyword: e.target.value })}
                placeholder="Kata kunci utama"
              />
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>OG Image</Label>
              <p className="text-xs text-muted-foreground">
                Gambar yang ditampilkan saat dibagikan di sosial media (1200x630 disarankan)
              </p>
              <MediaPickerField
                value={formData.og_image_url}
                onChange={(url) => setFormData({ ...formData, og_image_url: url })}
              />
            </div>

            <div className="space-y-2">
              <Label>OG Title</Label>
              <Input
                value={formData.og_title || ""}
                onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                placeholder="Judul untuk social media"
              />
            </div>

            <div className="space-y-2">
              <Label>OG Description</Label>
              <Textarea
                value={formData.og_description || ""}
                onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                placeholder="Deskripsi untuk social media"
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
