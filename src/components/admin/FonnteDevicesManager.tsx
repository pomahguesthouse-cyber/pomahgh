import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { useFonnteDevices, type FonnteDevice } from "@/hooks/useFonnteDevices";

interface FormState {
  label: string;
  device_name: string;
  api_token: string;
  phone_number: string;
  notes: string;
  is_active: boolean;
  is_default: boolean;
}

const emptyForm: FormState = {
  label: "",
  device_name: "",
  api_token: "",
  phone_number: "",
  notes: "",
  is_active: true,
  is_default: false,
};

function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 6) return "•".repeat(token.length);
  return token.slice(0, 3) + "•".repeat(Math.max(4, token.length - 6)) + token.slice(-3);
}

export function FonnteDevicesManager() {
  const { devices, isLoading, create, update, remove, isMutating } = useFonnteDevices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FonnteDevice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showToken, setShowToken] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<FonnteDevice | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowToken(false);
    setDialogOpen(true);
  };

  const openEdit = (d: FonnteDevice) => {
    setEditing(d);
    setForm({
      label: d.label,
      device_name: d.device_name ?? "",
      api_token: d.api_token,
      phone_number: d.phone_number ?? "",
      notes: d.notes ?? "",
      is_active: d.is_active,
      is_default: d.is_default,
    });
    setShowToken(false);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.api_token.trim()) return;
    const payload = {
      label: form.label.trim(),
      device_name: form.device_name.trim() || null,
      api_token: form.api_token.trim(),
      phone_number: form.phone_number.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      is_default: form.is_default,
    };
    if (editing) {
      update({ id: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Koneksi WhatsApp (Fonnte)</CardTitle>
          <CardDescription>
            Kelola perangkat / token API Fonnte yang digunakan untuk mengirim WhatsApp. Tandai satu perangkat
            sebagai default.
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Tambah Perangkat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Perangkat Fonnte" : "Tambah Perangkat Fonnte"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Misal: WA Resepsionis"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="device_name">Nama Device</Label>
                  <Input
                    id="device_name"
                    value={form.device_name}
                    onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                    placeholder="Sesuai Fonnte"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Nomor WhatsApp</Label>
                  <Input
                    id="phone_number"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="6281234567890"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_token">API Token *</Label>
                <div className="flex gap-2">
                  <Input
                    id="api_token"
                    type={showToken ? "text" : "password"}
                    value={form.api_token}
                    onChange={(e) => setForm({ ...form, api_token: e.target.value })}
                    required
                    autoComplete="off"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowToken((s) => !s)}>
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Label className="font-medium">Aktif</Label>
                  <p className="text-xs text-muted-foreground">Nonaktifkan untuk menjeda perangkat</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Label className="font-medium">Jadikan Default</Label>
                  <p className="text-xs text-muted-foreground">Hanya 1 perangkat boleh default</p>
                </div>
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(v) => setForm({ ...form, is_default: v })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editing ? "Simpan" : "Tambah"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Belum ada perangkat Fonnte. Klik <span className="font-medium">Tambah Perangkat</span> untuk
            memulai.
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((d) => {
              const revealed = revealedIds.has(d.id);
              return (
                <div
                  key={d.id}
                  className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium truncate">{d.label}</h4>
                      {d.is_default && (
                        <Badge variant="default" className="gap-1">
                          <Star className="w-3 h-3" /> Default
                        </Badge>
                      )}
                      {d.is_active ? (
                        <Badge variant="secondary">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {d.device_name && <div>Device: {d.device_name}</div>}
                      {d.phone_number && <div>Nomor: {d.phone_number}</div>}
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          Token: {revealed ? d.api_token : maskToken(d.api_token)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(d.id)}
                          className="text-primary hover:underline"
                        >
                          {revealed ? "sembunyikan" : "tampilkan"}
                        </button>
                      </div>
                      {d.notes && <div className="italic">{d.notes}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(d)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus perangkat Fonnte?</AlertDialogTitle>
            <AlertDialogDescription>
              Perangkat <span className="font-semibold">{deleteTarget?.label}</span> akan dihapus permanen.
              Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}