import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Sparkles, Settings, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LandingPageFormDialog } from "@/components/admin/landing-pages/LandingPageFormDialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

export interface HeroSlide {
  id: string;
  image_url: string;
  alt_text: string;
}

export interface LandingPage {
  id: string;
  page_title: string;
  slug: string;
  meta_description: string | null;
  primary_keyword: string;
  secondary_keywords: string[];
  hero_headline: string;
  subheadline: string | null;
  page_content: string | null;
  page_schema: any;
  cta_text: string | null;
  whatsapp_number: string | null;
  whatsapp_message_template: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  hero_slides: HeroSlide[] | null;
  og_image_url: string | null;
  status: "draft" | "published";
  display_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export default function AdminLandingPages() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [deletingPage, setDeletingPage] = useState<LandingPage | null>(null);
  const [duplicatingPage, setDuplicatingPage] = useState<LandingPage | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["landing-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.
      from("landing_pages").
      select("*").
      order("display_order", { ascending: true });

      if (error) throw error;
      // Transform hero_slides from JSON to proper type
      return (data || []).map((page) => ({
        ...page,
        hero_slides: Array.isArray(page.hero_slides) ?
        page.hero_slides as unknown as HeroSlide[] :
        []
      })) as LandingPage[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.
      from("landing_pages").
      delete().
      eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Halaman berhasil dihapus");
      setDeletingPage(null);
    },
    onError: () => {
      toast.error("Gagal menghapus halaman");
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (page: LandingPage) => {
      // Find existing pages to determine new title number
      const { data: existingPages } = await supabase.
      from("landing_pages").
      select("page_title").
      ilike("page_title", `${page.page_title}%`);

      let newTitle = page.page_title;
      const baseTitle = page.page_title.replace(/\s*\(\d+\)\s*$/, "").trim();

      if (existingPages && existingPages.length > 0) {
        const numbers = existingPages.
        map((p) => {
          const match = p.page_title.match(/\((\d+)\)\s*$/);
          return match ? parseInt(match[1]) : 1;
        });
        const maxNumber = Math.max(...numbers, 0);
        newTitle = `${baseTitle} (${maxNumber + 1})`;
      } else {
        newTitle = `${baseTitle} (2)`;
      }

      // Generate new slug
      const newSlug = page.slug + "-copy-" + Date.now();

      // Create new page
      const { data: newPage, error } = await supabase.
      from("landing_pages").
      insert({
        page_title: newTitle,
        slug: newSlug,
        meta_description: page.meta_description,
        primary_keyword: page.primary_keyword,
        secondary_keywords: page.secondary_keywords,
        hero_headline: page.hero_headline,
        subheadline: page.subheadline,
        page_content: page.page_content,
        page_schema: page.page_schema,
        cta_text: page.cta_text,
        whatsapp_number: page.whatsapp_number,
        whatsapp_message_template: page.whatsapp_message_template,
        hero_image_url: page.hero_image_url,
        hero_image_alt: page.hero_image_alt,
        og_image_url: page.og_image_url,
        status: "draft",
        display_order: page.display_order + 1
      } as any).
      select().
      single();

      if (error) throw error;

      return newPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Halaman berhasil diduplikasi");
      setDuplicatingPage(null);
    },
    onError: () => {
      toast.error("Gagal menduplikasi halaman");
    }
  });

  const handleEdit = (page: LandingPage) => {
    setEditingPage(page);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingPage(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Page Editor</h2>
          

          
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Page
          </Button>
        </div>
      </div>

      {isLoading ?
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) =>
        <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
        )}
        </div> :
      pages?.length === 0 ?
      <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada halaman</h3>
            <p className="text-muted-foreground text-center mb-4">
              Mulai buat halaman landing untuk meningkatkan SEO lokal
            </p>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Halaman Pertama
            </Button>
          </CardContent>
        </Card> :

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages?.map((page) =>
        <Card key={page.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-2">
                      {page.page_title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">
                      /{page.slug}
                    </p>
                  </div>
                  <Badge
                variant={page.status === "published" ? "default" : "secondary"}>
                
                    {page.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Keyword:</span>
                    <Badge variant="outline" className="font-normal">
                      {page.primary_keyword}
                    </Badge>
                  </div>
                  {page.meta_description &&
              <p className="text-sm text-muted-foreground line-clamp-2">
                      {page.meta_description}
                    </p>
              }
                  <p className="text-xs text-muted-foreground">
                    Diperbarui:{" "}
                    {format(new Date(page.updated_at), "dd MMM yyyy HH:mm", {
                  locale: localeId
                })}
                  </p>
                </div>

                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleEdit(page)}>
                
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate(`/editor?id=${page.id}`)}>
                
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {page.status === "published" &&
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                asChild>
                
                      <a href={`/${page.slug}`} target="_blank" rel="noopener">
                        <Eye className="h-3 w-3" />
                      </a>
                    </Button>
              }
                  <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setDuplicatingPage(page)}
                disabled={duplicateMutation.isPending}>
                
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => setDeletingPage(page)}>
                
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
        )}
        </div>
      }

      <LandingPageFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        editingPage={editingPage} />
      

      <AlertDialog
        open={!!deletingPage}
        onOpenChange={() => setDeletingPage(null)}>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Halaman?</AlertDialogTitle>
            <AlertDialogDescription>
              Halaman "{deletingPage?.page_title}" akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPage && deleteMutation.mutate(deletingPage.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!duplicatingPage}
        onOpenChange={() => setDuplicatingPage(null)}>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplikasi Halaman?</AlertDialogTitle>
            <AlertDialogDescription>
              Halaman "{duplicatingPage?.page_title}" akan diduplikasi dengan nama baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => duplicatingPage && duplicateMutation.mutate(duplicatingPage)}
              disabled={duplicateMutation.isPending}>
              
              {duplicateMutation.isPending ? "Menduplikasi..." : "Duplikasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}