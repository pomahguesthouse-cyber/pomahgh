import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Languages, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";

import {
  useSlangPatterns,
  useUpsertSlangPattern,
  useToggleSlangActive,
  useDeleteSlangPattern,
  type SlangPattern,
} from "@/hooks/useSlangPatterns";

const PAGE_SIZE = 20;

export function SlangManagementPanel() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SlangPattern | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useSlangPatterns({ page, pageSize: PAGE_SIZE, search });
  const toggleActive = useToggleSlangActive();
  const deleteSlang = useDeleteSlangPattern();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: SlangPattern) => {
    setEditing(row);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Kelola Slang Normalizer
            </CardTitle>
            <CardDescription>
              Pola slang/singkatan yang dipakai bot untuk normalisasi pesan tamu. Perubahan berlaku dalam ±5 menit (TTL cache).
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tambah Slang
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari slang atau hasil normalisasi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-8"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {search ? "Tidak ada hasil." : "Belum ada slang. Klik 'Tambah Slang'."}
          </p>
        ) : (
          <div className="space-y-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 p-2 rounded border bg-card hover:bg-accent/50"
              >
                <code className="font-mono font-bold text-purple-700 min-w-[80px]">{row.slang}</code>
                <span className="text-muted-foreground">→</span>
                <span className="flex-1 font-medium">{row.normalized}</span>
                <Badge variant="outline" className="text-xs">
                  {row.source}
                </Badge>
                <Switch
                  checked={row.is_active}
                  onCheckedChange={(checked) =>
                    toggleActive.mutate({ id: row.id, is_active: checked })
                  }
                  aria-label="Aktif"
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Hapus slang "${row.slang}"?`)) {
                      deleteSlang.mutate(row.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Halaman {page + 1} dari {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage(page + 1)}
              >
                Berikutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <SlangEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </Card>
  );
}

function SlangEditDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SlangPattern | null;
}) {
  const [slang, setSlang] = useState("");
  const [normalized, setNormalized] = useState("");
  const upsert = useUpsertSlangPattern();

  // Sync form when dialog opens with new editing target
  const openKey = open ? (editing?.id ?? "new") : "closed";
  useStateSyncOnKeyChange(openKey, () => {
    setSlang(editing?.slang ?? "");
    setNormalized(editing?.normalized ?? "");
  });

  const submit = () => {
    if (!slang.trim() || !normalized.trim()) return;
    upsert.mutate(
      {
        id: editing?.id,
        slang: slang.trim().toLowerCase(),
        normalized: normalized.trim(),
        source: editing?.source === "seed" ? undefined : "manual",
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Slang" : "Tambah Slang"}</DialogTitle>
          <DialogDescription>
            Slang dinormalisasi ke huruf kecil. Hasil normalisasi akan menggantikan slang saat bot membaca pesan tamu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Slang / Singkatan</label>
            <Input
              value={slang}
              onChange={(e) => setSlang(e.target.value)}
              placeholder="contoh: dlx"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Normalisasi</label>
            <Input
              value={normalized}
              onChange={(e) => setNormalized(e.target.value)}
              placeholder="contoh: deluxe"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={upsert.isPending || !slang.trim() || !normalized.trim()}>
            {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tiny helper: run sync fn when a key changes (avoids dependency arrays)
function useStateSyncOnKeyChange(key: string, fn: () => void) {
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastKey.current !== key) {
      lastKey.current = key;
      fn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function AddSlangButton({
  slang,
  normalized,
  onSuccess,
}: {
  slang: string;
  normalized: string;
  onSuccess?: () => void;
}) {
  const upsert = useUpsertSlangPattern();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={upsert.isPending}
      onClick={() =>
        upsert.mutate(
          { slang, normalized, source: "detected" },
          { onSuccess: () => onSuccess?.() },
        )
      }
    >
      {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
      Tambah ke Normalizer
    </Button>
  );
}
