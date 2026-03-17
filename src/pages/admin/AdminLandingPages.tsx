import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, Sparkles, Settings, Pencil, Copy, Home, Compass } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface SitePage {
  id: string;
  title: string;
  route_path: string;
  page_kind: "home" | "explore" | "landing";
  status: "draft" | "published";
  page_schema: unknown[] | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

const RESERVED_NON_MARKETING_ROUTES = [
  "/auth",
  "/bookings",
  "/payment",
  "/member",
  "/admin",
  "/editor",
  "/chat",
  "/rooms",
  "/manager",
];

export default function AdminLandingPages() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deletingPage, setDeletingPage] = useState<SitePage | null>(null);
  const [duplicatingPage, setDuplicatingPage] = useState<SitePage | null>(null);
  const [editingPage, setEditingPage] = useState<SitePage | null>(null);

  const [draftSettings, setDraftSettings] = useState({
    title: "",
    route_path: "",
    status: "draft" as "draft" | "published",
  });

  const { data: pages, isLoading } = useQuery({
    queryKey: ["site-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as SitePage[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const ts = Date.now();
      const routePath = `/landing-page-${ts}`;
      const { data, error } = await supabase
        .from("site_pages")
        .insert({
          title: `Landing Page ${new Date().toLocaleDateString("id-ID")}`,
          route_path: routePath,
          page_kind: "landing",
          status: "draft",
          sort_order: (pages?.length || 0) + 10,
          is_system: false,
          meta_title: "",
          meta_description: "",
          page_schema: [],
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success("Halaman berhasil dibuat");
      navigate(`/editor?id=${data.id}`);
    },
    onError: () => toast.error("Gagal membuat halaman"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success("Halaman berhasil dihapus");
      setDeletingPage(null);
    },
    onError: () => toast.error("Gagal menghapus halaman"),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (page: SitePage) => {
      const similar = (pages || []).filter((p) => p.title.startsWith(page.title.replace(/\s*\(\d+\)\s*$/, "")));
      const nextNumber = Math.max(
        1,
        ...similar.map((p) => {
          const m = p.title.match(/\((\d+)\)$/);
          return m ? parseInt(m[1], 10) : 1;
        }),
      ) + 1;

      const baseTitle = page.title.replace(/\s*\(\d+\)\s*$/, "").trim();
      const newTitle = `${baseTitle} (${nextNumber})`;
      const newRoute = `${page.route_path.replace(/\/+$/, "")}-copy-${Date.now()}`;

      const { error } = await supabase.from("site_pages").insert({
        title: newTitle,
        route_path: newRoute,
        page_kind: page.page_kind,
        status: "draft",
        page_schema: page.page_schema as any,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        og_image_url: page.og_image_url,
        is_system: false,
        sort_order: (page.sort_order || 0) + 1,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success("Halaman berhasil diduplikasi");
      setDuplicatingPage(null);
    },
    onError: () => toast.error("Gagal menduplikasi halaman"),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { id: string; title: string; route_path: string; status: "draft" | "published" }) => {
      const normalizedRoute = payload.route_path.startsWith("/") ? payload.route_path : `/${payload.route_path}`;
      const { error } = await supabase
        .from("site_pages")
        .update({
          title: payload.title,
          route_path: normalizedRoute,
          status: payload.status,
          meta_title: payload.title,
        } as any)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-pages"] });
      toast.success("Pengaturan halaman tersimpan");
      setEditingPage(null);
    },
    onError: (error) => toast.error(error.message || "Gagal menyimpan pengaturan"),
  });

  const openSettings = (page: SitePage) => {
    setEditingPage(page);
    setDraftSettings({
      title: page.title,
      route_path: page.route_path,
      status: page.status,
    });
  };

  const saveSettings = () => {
    if (!editingPage) return;
    const routePath = draftSettings.route_path.trim();
    if (!routePath) {
      toast.error("Route path wajib diisi");
      return;
    }
    if (!routePath.startsWith("/")) {
      toast.error("Route path harus diawali / ");
      return;
    }
    if (!editingPage.is_system && RESERVED_NON_MARKETING_ROUTES.some((prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`))) {
      toast.error("Route path bentrok dengan halaman operasional");
      return;
    }

    const normalized = routePath.toLowerCase();
    const routeExists = (pages || []).some((p) => p.id !== editingPage.id && p.route_path.toLowerCase() === normalized);
    if (routeExists) {
      toast.error("Route path sudah digunakan halaman lain");
      return;
    }

    updateSettingsMutation.mutate({
      id: editingPage.id,
      title: draftSettings.title.trim() || "Untitled Page",
      route_path: routePath,
      status: draftSettings.status,
    });
  };

  const iconForKind = (kind: SitePage["page_kind"]) => {
    if (kind === "home") return Home;
    if (kind === "explore") return Compass;
    return Sparkles;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pages</h2>
          <p className="text-muted-foreground">Kelola semua halaman marketing: Home, Explore, dan Landing pages.</p>
        </div>
        <Button onClick={() => createMutation.mutate()} className="gap-2" disabled={createMutation.isPending}>
          <Plus className="h-4 w-4" />
          Create Page
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-36" /></Card>
          ))}
        </div>
      ) : !pages || pages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Belum ada halaman</h3>
            <Button onClick={() => createMutation.mutate()} className="gap-2"><Plus className="h-4 w-4" />Buat Halaman</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => {
            const KindIcon = iconForKind(page.page_kind);
            return (
              <Card key={page.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                        <KindIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{page.title}</span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground font-mono truncate">{page.route_path}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={page.status === "published" ? "default" : "secondary"}>
                        {page.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      {page.is_system && <Badge variant="outline">System</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Diperbarui: {format(new Date(page.updated_at), "d MMM yyyy HH:mm", { locale: localeId })}</p>
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openSettings(page)}>
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/editor?id=${page.id}`)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild>
                      <a href={page.route_path} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setDuplicatingPage(page)} disabled={duplicateMutation.isPending}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeletingPage(page)}
                      disabled={page.is_system}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus halaman?</AlertDialogTitle>
            <AlertDialogDescription>
              Halaman "{deletingPage?.title}" akan dihapus permanen.
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
            <AlertDialogTitle>Duplikasi halaman?</AlertDialogTitle>
            <AlertDialogDescription>
              Halaman "{duplicatingPage?.title}" akan diduplikasi sebagai draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => duplicatingPage && duplicateMutation.mutate(duplicatingPage)}>
              Duplikasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingPage} onOpenChange={() => setEditingPage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={draftSettings.title} onChange={(e) => setDraftSettings((s) => ({ ...s, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Route Path</Label>
              <Input
                value={draftSettings.route_path}
                onChange={(e) => setDraftSettings((s) => ({ ...s, route_path: e.target.value }))}
                disabled={editingPage?.is_system}
              />
              {!editingPage?.is_system ? (
                <p className="text-xs text-muted-foreground">Contoh: `/promo-keluarga`, `/guesthouse-semarang`</p>
              ) : (
                <p className="text-xs text-muted-foreground">Halaman system route tidak boleh diubah.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draftSettings.status} onValueChange={(v: "draft" | "published") => setDraftSettings((s) => ({ ...s, status: v }))}>
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
            <Button variant="outline" onClick={() => setEditingPage(null)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={updateSettingsMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
