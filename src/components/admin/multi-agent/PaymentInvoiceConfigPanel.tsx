import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Send, Eye, Plus, Trash2, CreditCard } from 'lucide-react';

export const PaymentInvoiceConfigPanel = () => {
  const queryClient = useQueryClient();

  // Load hotel settings for invoice config
  const { data: settings, isLoading } = useQuery({
    queryKey: ['hotel-settings-invoice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_settings')
        .select('hotel_name, address, city, postal_code, email_primary, phone_primary, invoice_logo_url, logo_url, currency_symbol, bank_name, account_number, account_holder_name, payment_instructions')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Load bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts-invoice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  // Load recent invoices (from bookings with payment info)
  const { data: recentBookings } = useQuery({
    queryKey: ['recent-invoice-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_code, guest_name, guest_email, total_price, payment_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // New bank account form
  const [newBank, setNewBank] = useState({ bank_name: '', account_number: '', account_holder_name: '' });
  const [showAddBank, setShowAddBank] = useState(false);

  const addBankMutation = useMutation({
    mutationFn: async (bank: typeof newBank) => {
      const { error } = await supabase.from('bank_accounts').insert({
        ...bank,
        is_active: true,
        display_order: (bankAccounts?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-invoice'] });
      setNewBank({ bank_name: '', account_number: '', account_holder_name: '' });
      setShowAddBank(false);
      toast.success('Rekening bank berhasil ditambahkan');
    },
    onError: (err) => toast.error(`Gagal: ${err.message}`),
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-invoice'] });
      toast.success('Rekening dihapus');
    },
  });

  // Test invoice generation
  const [testBookingId, setTestBookingId] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleTestInvoice = async (bookingId: string, sendEmail: boolean) => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { booking_id: bookingId, send_email: sendEmail },
      });
      if (error) throw error;
      if (data?.email_sent) {
        toast.success(`Invoice terkirim ke ${data.guest_email}`);
      } else {
        toast.success('Invoice berhasil di-generate');
      }
    } catch (err) {
      toast.error(`Gagal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) return <div className="text-xs text-muted-foreground p-4">Memuat konfigurasi...</div>;

  return (
    <div className="space-y-4">
      {/* Invoice Header Info */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Info Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Hotel:</span>
              <p className="font-medium text-foreground">{settings?.hotel_name || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium text-foreground">{settings?.email_primary || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Telepon:</span>
              <p className="font-medium text-foreground">{settings?.phone_primary || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Alamat:</span>
              <p className="font-medium text-foreground">{settings?.address || '-'}{settings?.city ? `, ${settings.city}` : ''}</p>
            </div>
          </div>
          {settings?.invoice_logo_url && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Logo Invoice:</span>
              <img src={settings.invoice_logo_url} alt="Logo" className="h-8 object-contain" />
            </div>
          )}
          <p className="text-[10px] text-muted-foreground italic">
            * Ubah data ini di halaman Admin → Pengaturan Hotel
          </p>
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Rekening Bank ({bankAccounts?.length || 0})
            </CardTitle>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowAddBank(!showAddBank)}>
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {bankAccounts?.map((bank) => (
            <div key={bank.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
              <div>
                <span className="font-semibold text-foreground">{bank.bank_name}</span>
                <span className="text-muted-foreground"> • {bank.account_number} • a.n. {bank.account_holder_name}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => deleteBankMutation.mutate(bank.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}

          {showAddBank && (
            <div className="border rounded p-3 space-y-2 bg-background">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Nama Bank</Label>
                  <Input
                    value={newBank.bank_name}
                    onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                    placeholder="BCA"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">No. Rekening</Label>
                  <Input
                    value={newBank.account_number}
                    onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                    placeholder="0095584379"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Atas Nama</Label>
                  <Input
                    value={newBank.account_holder_name}
                    onChange={(e) => setNewBank({ ...newBank, account_holder_name: e.target.value })}
                    placeholder="Nama pemilik"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                disabled={!newBank.bank_name || !newBank.account_number || !newBank.account_holder_name}
                onClick={() => addBankMutation.mutate(newBank)}
              >
                Simpan Rekening
              </Button>
            </div>
          )}

          {(!bankAccounts || bankAccounts.length === 0) && !showAddBank && (
            <p className="text-xs text-muted-foreground italic">Belum ada rekening bank. Tambahkan untuk ditampilkan di invoice.</p>
          )}
        </CardContent>
      </Card>

      {/* Test Invoice */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="w-4 h-4" />
            Kirim Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[10px] text-muted-foreground">
            Pilih booking untuk generate & kirim invoice via email ke tamu.
          </p>

          {recentBookings && recentBookings.length > 0 ? (
            <div className="space-y-1.5">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">{b.booking_code}</Badge>
                    <span className="text-foreground">{b.guest_name}</span>
                    <Badge
                      variant={b.payment_status === 'paid' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {b.payment_status === 'paid' ? '✅ Lunas' : b.payment_status === 'partial' ? '⏳ Sebagian' : '❌ Belum'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleTestInvoice(b.id, false)}
                      disabled={isTesting}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleTestInvoice(b.id, true)}
                      disabled={isTesting}
                    >
                      <Send className="w-3 h-3 mr-1" /> Kirim Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Belum ada booking.</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Flow Info */}
      <Card className="border-border bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-foreground mb-2">📋 Alur Payment Agent:</p>
          <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Tamu selesai booking → Agent kirim detail pembayaran + rekening bank</li>
            <li>Tamu transfer & kirim bukti → Agent forward ke Manager via WhatsApp</li>
            <li>Manager validasi (balas: ya/sudah/oke) → Pembayaran terkonfirmasi</li>
            <li>Agent kirim konfirmasi + invoice ke tamu via WhatsApp & Email</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
