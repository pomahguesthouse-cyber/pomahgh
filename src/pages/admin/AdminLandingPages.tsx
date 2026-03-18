import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit, Trash2, Eye, Sparkles, MoreHorizontal, Copy, Home, EyeOff, Pencil, Settings } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { PageSettingsEditDialog } from "@/components/admin/landing-pages/PageSettingsEditDialog";

export interface LandingPage {
  id: string;
  page_title: string;
  slug: string;
  meta_description: string | null;
  primary_keyword: string;
  secondary_keywords: string[] | null;
  hero_headline: string;
  subheadline: string | null;
  page_content: string | null;
  page_schema: any;
  hero_slides: any | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  cta_text: string | null;
  whatsapp_number: string | null;
  whatsapp_message_template: string | null;
  og_image_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export default function AdminLandingPages() {
  const [deletingPage, setDeletingPage] = useState<LandingPage | null>(null);
  const [duplicatingPage, setDuplicatingPage] = useState<LandingPage | null>(null);
  const [settingHomepage, setSettingHomepage] = useState<string | null>(null);
  const [togglingMenu, setTogglingMenu] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["landing-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as LandingPage[];
    }
  });

  const { data: settings } = useQuery({
    queryKey: ["hotel-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_settings")
        .select("id, homepage_slug, hidden_page_slugs")
        .limit(1)
        .single();
      if (error) return null;
      return data as { id: string; homepage_slug: string | null; hidden_page_slugs: string[] | null } | null;
    }
  });

  const isHomepage = (page: LandingPage) => settings?.homepage_slug === page.slug;
  const isHiddenFromMenu = (page: LandingPage) => {
    const hiddenSlugs = settings?.hidden_page_slugs || [];
    return hiddenSlugs.includes(page.slug);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", id);
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
      const { data: existingPages } = await supabase
        .from("landing_pages")
        .select("page_title")
        .ilike("page_title", `${page.page_title}%`);

      let newTitle = page.page_title;
      const baseTitle = page.page_title.replace(/\s*\(\d+\)\s*$/, "").trim();

      if (existingPages && existingPages.length > 0) {
        const numbers = existingPages.map((p) => {
          const match = p.page_title.match(/\((\d+)\)\s*$/);
          return match ? parseInt(match[1]) : 1;
        });
        const maxNumber = Math.max(...numbers, 0);
        newTitle = `${baseTitle} (${maxNumber + 1})`;
      } else {
        newTitle = `${baseTitle} (2)`;
      }

      const newSlug = page.slug + "-copy-" + Date.now();

      const { data: newPage, error } = await supabase
        .from("landing_pages")
        .insert({
          page_title: newTitle,
          slug: newSlug,
          meta_description: page.meta_description,
          primary_keyword: page.primary_keyword,
          page_schema: [],
          status: "draft",
          display_order: (page.display_order ?? 0) + 1
        } as any)
        .select()
        .single();

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

  const setHomepageMutation = useMutation({
    mutationFn: async (page: LandingPage) => {
      const { error } = await supabase
        .from("hotel_settings")
        .update({ homepage_slug: page.slug })
        .eq("id", settings?.id || "");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-settings"] });
      toast.success("Berhasil设为 homepage");
      setSettingHomepage(null);
    },
    onError: () => {
      toast.error("Gagal mengatur homepage");
    }
  });

  const toggleMenuVisibilityMutation = useMutation({
    mutationFn: async (page: LandingPage) => {
      const currentHidden = settings?.hidden_page_slugs || [];
      const newHidden = currentHidden.includes(page.slug)
        ? currentHidden.filter((s: string) => s !== page.slug)
        : [...currentHidden, page.slug];
      
      const { error } = await supabase
        .from("hotel_settings")
        .update({ hidden_page_slugs: newHidden })
        .eq("id", settings?.id || "");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-settings"] });
      toast.success("Pengaturan menu berhasil diperbarui");
      setTogglingMenu(null);
    },
    onError: () => {
      toast.error("Gagal memperbarui pengaturan menu");
    }
  });

  const handleCreatePage = () => {
    navigate("/editor");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Page Editor</h2>
          <p className="text-muted-foreground">Kelola halaman website Anda</p>
        </div>
        <Button onClick={handleCreatePage} className="gap-2">
          <Plus className="h-4 w-4" />
          New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : pages?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada halaman</h3>
            <p className="text-muted-foreground text-center mb-4">
              Mulai buat halaman untuk website Anda
            </p>
            <Button onClick={handleCreatePage} className="gap-2">
              <Plus className="h-4 w-4" />
              Buat Halaman Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">URL</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Updated</th>
                    <th className="text-right p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {pages?.map((page) => (
                    <tr key={page.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{page.page_title}</span>
                          {isHomepage(page) && (
                            <Badge variant="secondary" className="text-xs">Homepage</Badge>
                          )}
                          {isHiddenFromMenu(page) && (
                            <Badge variant="outline" className="text-xs">Hidden</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground font-mono text-sm">
                          /{page.slug}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={page.status === "published" ? "default" : "secondary"}>
                          {page.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(page.updated_at), "dd MMM yyyy HH:mm", {
                          locale: localeId
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {page.status === "published" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              asChild
                            >
                              <a href={`/${page.slug}`} target="_blank" rel="noopener">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/editor?id=${page.id}`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingPage(page); setIsSettingsOpen(true); }}>
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDuplicatingPage(page)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSettingHomepage(page.id);
                                  setHomepageMutation.mutate(page);
                                }}
                                disabled={isHomepage(page) || settingHomepage === page.id}
                              >
                                <Home className="h-4 w-4 mr-2" />
                                Set as Homepage
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setTogglingMenu(page.id);
                                  toggleMenuVisibilityMutation.mutate(page);
                                }}
                                disabled={togglingMenu === page.id}
                              >
                                {isHiddenFromMenu(page) ? (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Show in Menu
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Hide from Menu
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeletingPage(page)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!duplicatingPage} onOpenChange={() => setDuplicatingPage(null)}>
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
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? "Menduplikasi..." : "Duplikasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageSettingsEditDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        page={editingPage}
      />
    </div>
  );
}
