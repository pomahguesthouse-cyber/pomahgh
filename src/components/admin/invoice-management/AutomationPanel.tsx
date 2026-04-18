import { useState, useEffect } from "react";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Bot, Eye, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AutomationPanel = () => {
  const { template, isLoading, updateTemplate, isUpdating } = useInvoiceTemplate();

  const [autoSend, setAutoSend] = useState(true);
  const [autoVerify, setAutoVerify] = useState(false);
  const [manualReview, setManualReview] = useState(false);
  const [threshold, setThreshold] = useState(0.95);
  const [notifyApprove, setNotifyApprove] = useState(true);
  const [notifyReject, setNotifyReject] = useState(true);
  const [approveMsg, setApproveMsg] = useState("");
  const [rejectMsg, setRejectMsg] = useState("");

  useEffect(() => {
    if (template) {
      setAutoSend(template.auto_send_invoice ?? true);
      setAutoVerify(template.auto_verify_ocr ?? false);
      setManualReview(template.manual_review_mode ?? false);
      setThreshold(template.ocr_confidence_threshold ?? 0.95);
      setNotifyApprove(template.notify_guest_on_approve ?? true);
      setNotifyReject(template.notify_guest_on_reject ?? true);
      setApproveMsg(template.approve_message_template || "");
      setRejectMsg(template.reject_message_template || "");
    }
  }, [template]);

  const handleSave = () => {
    updateTemplate({
      auto_send_invoice: autoSend,
      auto_verify_ocr: autoVerify && !manualReview,
      manual_review_mode: manualReview,
      ocr_confidence_threshold: threshold,
      notify_guest_on_approve: notifyApprove,
      notify_guest_on_reject: notifyReject,
      approve_message_template: approveMsg,
      reject_message_template: rejectMsg,
    });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-6">Memuat...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Pengiriman Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded bg-muted/30">
            <div>
              <Label className="text-base">Auto-send invoice saat booking dibuat</Label>
              <p className="text-xs text-muted-foreground">Generate PDF & kirim WhatsApp/Email otomatis ke tamu</p>
            </div>
            <Switch checked={autoSend} onCheckedChange={setAutoSend} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Verifikasi Bukti Bayar</CardTitle>
          <CardDescription>OCR otomatis menggunakan Gemini Vision</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded bg-muted/30">
            <div>
              <Label className="text-base">Auto-verifikasi OCR</Label>
              <p className="text-xs text-muted-foreground">Tandai PAID otomatis bila confidence ≥ threshold & nominal cocok</p>
            </div>
            <Switch checked={autoVerify} onCheckedChange={setAutoVerify} disabled={manualReview} />
          </div>

          {autoVerify && !manualReview && (
            <div>
              <Label className="text-sm">Threshold Confidence ({Math.round(threshold * 100)}%)</Label>
              <Slider
                value={[threshold * 100]}
                onValueChange={(v) => setThreshold(v[0] / 100)}
                min={70}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Hanya auto-approve jika OCR yakin ≥ {Math.round(threshold * 100)}%. Selain itu tetap minta konfirmasi manager.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded bg-amber-50 border border-amber-200">
            <div>
              <Label className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Manual Review Mode</Label>
              <p className="text-xs text-muted-foreground">Override semua otomatisasi — semua bukti harus di-approve manager</p>
            </div>
            <Switch checked={manualReview} onCheckedChange={setManualReview} />
          </div>

          {manualReview && (
            <Alert>
              <AlertDescription className="text-xs">
                ⚠️ Manual review aktif. Auto-verifikasi dimatikan; OCR tetap berjalan untuk membantu manager mengambil keputusan.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifikasi Tamu</CardTitle>
          <CardDescription>Kirim WhatsApp otomatis saat manager approve/reject</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Kirim notifikasi saat approve</Label>
            <Switch checked={notifyApprove} onCheckedChange={setNotifyApprove} />
          </div>
          {notifyApprove && (
            <div>
              <Label className="text-xs">Template pesan approve</Label>
              <Textarea rows={5} value={approveMsg} onChange={(e) => setApproveMsg(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Variabel: {"{{guest_name}}, {{booking_code}}, {{check_in_date}}, {{total_price}}"}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Kirim notifikasi saat reject</Label>
            <Switch checked={notifyReject} onCheckedChange={setNotifyReject} />
          </div>
          {notifyReject && (
            <div>
              <Label className="text-xs">Template pesan reject</Label>
              <Textarea rows={5} value={rejectMsg} onChange={(e) => setRejectMsg(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Variabel: {"{{guest_name}}, {{booking_code}}, {{reason}}"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isUpdating}>
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Simpan Otomatisasi
      </Button>
    </div>
  );
};
