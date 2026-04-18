import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Download, Loader2, Check, MessageCircle, ExternalLink } from "lucide-react";
import { useInvoice } from "@/hooks/useInvoice";
import { toast } from "sonner";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  bookingCode: string;
}

export const InvoicePreviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  guestName,
  guestEmail,
  guestPhone,
  bookingCode,
}: InvoicePreviewDialogProps) => {
  const { generateInvoice, isGenerating } = useInvoice();
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [waSent, setWaSent] = useState(false);

  useEffect(() => {
    if (open && bookingId) {
      setPdfUrl("");
      setEmailSent(false);
      setWaSent(false);
      generateInvoice({ bookingId }).then((data) => {
        if (data?.invoice_pdf_url) setPdfUrl(data.invoice_pdf_url);
      });
    }
  }, [open, bookingId]);

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const data = await generateInvoice({ bookingId, sendEmail: true });
      if (data?.invoice_pdf_url) setPdfUrl(data.invoice_pdf_url);
      if (data?.email_sent) {
        setEmailSent(true);
        toast.success(`Invoice terkirim ke ${guestEmail}`);
      } else {
        toast.error("Gagal mengirim email. Periksa konfigurasi.");
      }
    } catch {
      toast.error("Gagal mengirim email invoice");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!guestPhone) {
      toast.error("Nomor WhatsApp tamu tidak tersedia");
      return;
    }
    setIsSendingWa(true);
    try {
      const data = await generateInvoice({ bookingId, sendWhatsApp: true });
      if (data?.invoice_pdf_url) setPdfUrl(data.invoice_pdf_url);
      if (data?.whatsapp_sent) {
        setWaSent(true);
        toast.success(`Invoice terkirim via WhatsApp ke ${guestPhone}`);
      } else {
        toast.error("Gagal mengirim WhatsApp");
      }
    } catch {
      toast.error("Gagal mengirim invoice via WhatsApp");
    } finally {
      setIsSendingWa(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invoice #{bookingCode}</DialogTitle>
          <DialogDescription>
            Tamu: {guestName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
          {pdfUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka di Tab Baru
              </a>
            </Button>
          )}
          {pdfUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={pdfUrl} download={`Invoice-${bookingCode}.pdf`}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            disabled={isSendingEmail || !guestEmail || emailSent}
          >
            {isSendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : emailSent ? <Check className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {emailSent ? "Email Terkirim" : "Kirim Email"}
          </Button>
          <Button
            size="sm"
            onClick={handleSendWhatsApp}
            disabled={isSendingWa || !guestPhone || waSent}
          >
            {isSendingWa ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : waSent ? <Check className="h-4 w-4 mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
            {waSent ? "WhatsApp Terkirim" : "Kirim WhatsApp"}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden bg-muted rounded-md min-h-[500px]">
          {isGenerating && !pdfUrl ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Membuat invoice PDF...</span>
            </div>
          ) : pdfUrl ? (
            <object
              key={pdfUrl}
              data={`${pdfUrl}#toolbar=1&view=FitH`}
              type="application/pdf"
              className="w-full h-[500px] rounded-md"
              aria-label={`Invoice ${bookingCode}`}
            >
              <div className="flex flex-col items-center justify-center h-[500px] text-sm text-muted-foreground gap-3 p-4 text-center">
                <p>Browser tidak dapat menampilkan PDF secara inline.</p>
                <Button asChild size="sm">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Buka PDF
                  </a>
                </Button>
              </div>
            </object>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              Tidak dapat membuat invoice
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          📧 {guestEmail || "—"} {guestPhone ? `• 📱 ${guestPhone}` : ""}
        </div>
      </DialogContent>
    </Dialog>
  );
};
