import { useState, useEffect } from "react";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { formatRupiahID } from "@/utils/indonesianFormat";

export const InvoiceTemplatePanel = () => {
  const { template, isLoading, updateTemplate, isUpdating } = useInvoiceTemplate();
  const { settings } = useHotelSettings();

  const [primary, setPrimary] = useState("#4a9bd9");
  const [secondary, setSecondary] = useState("#e8f4fd");
  const [font, setFont] = useState("helvetica");
  const [showLogo, setShowLogo] = useState(true);
  const [showBank, setShowBank] = useState(true);
  const [showQris, setShowQris] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (template) {
      setPrimary(template.invoice_primary_color || "#4a9bd9");
      setSecondary(template.invoice_secondary_color || "#e8f4fd");
      setFont(template.font_family || "helvetica");
      setShowLogo(!!template.show_logo);
      setShowBank(!!template.show_bank_accounts);
      setShowQris(!!template.show_qris);
      setShowBreakdown(template.show_breakdown ?? true);
      setNotes(template.custom_notes || "");
    }
  }, [template]);

  const handleSave = () => {
    updateTemplate({
      invoice_primary_color: primary,
      invoice_secondary_color: secondary,
      font_family: font,
      show_logo: showLogo,
      show_bank_accounts: showBank,
      show_qris: showQris,
      show_breakdown: showBreakdown,
      custom_notes: notes,
    });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-6">Memuat template...</div>;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan Visual</CardTitle>
            <CardDescription>Sesuaikan warna dan font invoice PDF</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warna Utama</Label>
                <div className="flex gap-2">
                  <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-16 h-10 p-1" />
                  <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Warna Sekunder</Label>
                <div className="flex gap-2">
                  <Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-16 h-10 p-1" />
                  <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <Label>Font</Label>
              <Select value={font} onValueChange={setFont}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="helvetica">Helvetica (Modern)</SelectItem>
                  <SelectItem value="times">Times (Klasik)</SelectItem>
                  <SelectItem value="courier">Courier (Monospace)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Komponen yang Ditampilkan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Logo Hotel</Label>
              <Switch checked={showLogo} onCheckedChange={setShowLogo} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Rekening Bank Transfer</Label>
              <Switch checked={showBank} onCheckedChange={setShowBank} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>QRIS</Label>
                {!template?.qris_image_url && (
                  <p className="text-xs text-orange-600">Upload QRIS dulu di tab Settings</p>
                )}
              </div>
              <Switch checked={showQris} onCheckedChange={setShowQris} disabled={!template?.qris_image_url} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Rincian Harga (Breakdown)</Label>
              <Switch checked={showBreakdown} onCheckedChange={setShowBreakdown} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catatan Tambahan</CardTitle>
            <CardDescription>Muncul di bawah tabel invoice (opsional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="cth: Mohon transfer dengan kode unik untuk mempercepat verifikasi" />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Simpan Template
        </Button>
      </div>

      {/* Live Preview */}
      <div className="lg:sticky lg:top-4 self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
            <CardDescription>Pratinjau visual cepat (PDF asli generate ulang saat invoice dikirim)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white" style={{ fontFamily: font === "times" ? "Times, serif" : font === "courier" ? "Courier, monospace" : "system-ui, sans-serif" }}>
              <div style={{ background: primary, color: "white", padding: "16px 20px" }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs opacity-80">BUKTI PEMESANAN</div>
                    <div className="text-lg font-bold">#PMH-DEMO12</div>
                  </div>
                  {showLogo && settings?.invoice_logo_url && (
                    <img src={settings.invoice_logo_url} alt="logo" className="h-10 bg-white p-1 rounded" />
                  )}
                </div>
              </div>
              <div className="p-4 space-y-3 text-xs text-foreground">
                <div style={{ background: secondary, padding: 8, borderLeft: `3px solid ${primary}` }}>
                  <strong>DATA TAMU</strong>
                  <div>Budi Santoso · budi@example.com</div>
                </div>
                <div style={{ background: secondary, padding: 8, borderLeft: `3px solid ${primary}` }}>
                  <strong>MENGINAP</strong>
                  <div>15 Apr 2026 → 17 Apr 2026 (2 mlm)</div>
                </div>
                {showBreakdown && (
                  <table className="w-full text-xs border">
                    <thead>
                      <tr style={{ background: primary, color: "white" }}>
                        <th className="p-1 text-left">Item</th>
                        <th className="p-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-1 border-t">Deluxe Room x2</td><td className="p-1 text-right border-t">{formatRupiahID(900000)}</td></tr>
                      <tr><td className="p-1 border-t">Sarapan x2</td><td className="p-1 text-right border-t">{formatRupiahID(60000)}</td></tr>
                      <tr><td className="p-1 border-t font-bold">TOTAL</td><td className="p-1 text-right border-t font-bold">{formatRupiahID(960000)}</td></tr>
                    </tbody>
                  </table>
                )}
                {!showBreakdown && (
                  <div className="text-center py-2 font-bold text-base" style={{ color: primary }}>
                    Total: {formatRupiahID(960000)}
                  </div>
                )}
                {showBank && (
                  <div className="border rounded p-2" style={{ borderColor: primary }}>
                    <strong>🏦 Bank Transfer</strong>
                    <div>BCA · 0095584379 · a.n. Faizal</div>
                  </div>
                )}
                {showQris && template?.qris_image_url && (
                  <div className="border rounded p-2 text-center" style={{ borderColor: primary }}>
                    <strong>📱 Scan QRIS</strong>
                    <img src={template.qris_image_url} alt="QRIS" className="h-32 mx-auto" />
                  </div>
                )}
                {notes && <div className="text-xs italic text-muted-foreground">{notes}</div>}
                <div className="text-center text-xs pt-2 border-t" style={{ color: primary }}>
                  {template?.footer_text}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
