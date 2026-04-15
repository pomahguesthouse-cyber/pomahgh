import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHotelSettings, WhatsAppManager, ManagerRole } from '@/hooks/useHotelSettings';
import { toast } from '@/hooks/use-toast';
import { UserCog, Plus, Trash2, Shield, Eye, BookOpen } from 'lucide-react';

const ROLE_CONFIG: Record<ManagerRole, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Super Admin', description: 'Akses penuh semua fitur', color: 'bg-red-500', icon: <Shield className="h-3 w-3" /> },
  booking_manager: { label: 'Booking Manager', description: 'Kelola booking (tanpa statistik pendapatan)', color: 'bg-blue-500', icon: <BookOpen className="h-3 w-3" /> },
  viewer: { label: 'Viewer', description: 'Hanya lihat ketersediaan kamar', color: 'bg-gray-500', icon: <Eye className="h-3 w-3" /> },
};

export const ManagerNumbersPanel = () => {
  const { settings: hotelSettings, updateSettings: updateHotelSettings } = useHotelSettings();
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<ManagerRole>('super_admin');

  const managers = hotelSettings?.whatsapp_manager_numbers || [];

  const handleAdd = () => {
    if (!newPhone || !newName) {
      toast({ title: 'Error', description: 'Isi nomor dan nama pengelola', variant: 'destructive' });
      return;
    }
    let normalized = newPhone.replace(/\D/g, '');
    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
    if (!normalized.startsWith('62')) normalized = '62' + normalized;

    if (managers.some(m => m.phone === normalized)) {
      toast({ title: 'Error', description: 'Nomor sudah terdaftar', variant: 'destructive' });
      return;
    }

    const updated = [...managers, {
      phone: normalized,
      name: newName,
      role: newRole,
      added_at: new Date().toISOString(),
    }];
    updateHotelSettings({ whatsapp_manager_numbers: updated });
    setNewPhone('');
    setNewName('');
    setNewRole('super_admin');
    toast({ title: 'Berhasil', description: `${newName} ditambahkan sebagai ${ROLE_CONFIG[newRole].label}` });
  };

  const handleRemove = (index: number) => {
    const updated = [...managers];
    const removed = updated.splice(index, 1)[0];
    updateHotelSettings({ whatsapp_manager_numbers: updated });
    toast({ title: 'Berhasil', description: `${removed.name} dihapus` });
  };

  const handleRoleChange = (index: number, role: ManagerRole) => {
    const updated = [...managers];
    updated[index] = { ...updated[index], role };
    updateHotelSettings({ whatsapp_manager_numbers: updated });
    toast({ title: 'Role diubah', description: `${updated[index].name} → ${ROLE_CONFIG[role].label}` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <UserCog className="w-4 h-4" />
            Daftar Manager
          </CardTitle>
          <CardDescription className="text-xs">
            Nomor pengelola yang akan dilayani AI Admin dengan sapaan personal.
            Nomor yang tidak terdaftar di sini akan dianggap sebagai tamu.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Add form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="Nomor (e.g. 628123456789)"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className="text-xs h-9"
            />
            <Input
              placeholder="Nama Manager (e.g. Bu Titik)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="text-xs h-9"
            />
            <Select value={newRole} onValueChange={(v: ManagerRole) => setNewRole(v)}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_CONFIG).map(([key, { label, color }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={handleAdd} className="h-9 text-xs">
              <Plus className="w-4 h-4 mr-1" /> Tambah
            </Button>
          </div>

          {/* Role legend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            {Object.entries(ROLE_CONFIG).map(([key, { label, description, color }]) => (
              <div key={key} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                <div className={`w-2 h-2 mt-0.5 rounded-full ${color}`} />
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Manager list */}
          <div className="space-y-2">
            {managers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada manager terdaftar</p>
            ) : (
              managers.map((manager: WhatsAppManager, index: number) => {
                const role = manager.role || 'super_admin';
                const cfg = ROLE_CONFIG[role];
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{manager.name}</p>
                          <Badge variant="secondary" className={`text-[10px] text-white ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{manager.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={role} onValueChange={(v: ManagerRole) => handleRoleChange(index, v)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="booking_manager">Booking Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Cara Kerja Filter Nomor</CardTitle>
          <CardDescription className="text-[11px]">
            Bagaimana Orchestrator membedakan tamu dan pengelola
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs space-y-1.5">
          <p>🔀 Pesan masuk diterima oleh <strong>Orchestrator</strong></p>
          <p>📱 Nomor dicek di daftar manager di atas</p>
          <p>✅ Jika terdaftar → dialihkan ke <strong>Manager Bot</strong> (AI Admin)</p>
          <p>👤 Jika tidak terdaftar → dialihkan ke <strong>Intent Router</strong> → agent tamu</p>
          <p>🤖 Manager Bot menyapa personal: <em>"Halo Bu Titik! Ada yang bisa saya bantu?"</em></p>
        </CardContent>
      </Card>
    </div>
  );
};
