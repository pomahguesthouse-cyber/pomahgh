import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Download, Loader2, Check } from "lucide-react";
import { useInvoice } from "@/hooks/useInvoice";
import DOMPurify from "dompurify";
import { toast } from "sonner";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  bookingCode: string;
}

export const InvoicePreviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  guestName,
  guestEmail,
  bookingCode,
}: InvoicePreviewDialogProps) => {
  const { generateInvoice, isGenerating } = useInvoice();
  const [invoiceHtml, setInvoiceHtml] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (open && bookingId) {
      setInvoiceHtml("");
      setEmailSent(false);
      generateInvoice({ bookingId }).then((data) => {
        if (data?.invoice_html) {
          setInvoiceHtml(data.invoice_html);
        }
      });
    }
  }, [open, bookingId]);

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const data = await generateInvoice({ bookingId, sendEmail: true });
      if (data?.email_sent) {
        setEmailSent(true);
        toast.success(`Invoice berhasil dikirim ke ${guestEmail}`);
      } else {
        toast.error("Gagal mengirim email. Pastikan konfigurasi email sudah benar.");
      }
    } catch {
      toast.error("Gagal mengirim email invoice");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceHtml) return;

    // Dynamically import html2pdf only when user clicks download
    const html2pdf = await import("html2pdf.js");

    const element = document.createElement('div');
    element.innerHTML = DOMPurify.sanitize(invoiceHtml, {
      ADD_TAGS: ['style', 'img'],
      ADD_ATTR: ['style', 'src', 'alt', 'class', 'width', 'height', 'crossorigin', 'onerror'],
      FORCE_BODY: true
    });
    
    const opt = {
      margin: 0.5,
      filename: `Invoice-${bookingCode}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: false, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf.default().set(opt).from(element).save();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview Invoice</DialogTitle>
          <DialogDescription>
            Invoice untuk booking #{bookingCode} - {guestName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[500px] border rounded-md">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Membuat invoice...</span>
              </div>
            ) : invoiceHtml ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(invoiceHtml, {
                    ADD_TAGS: ['style', 'img'],
                    ADD_ATTR: ['style', 'src', 'alt', 'class', 'width', 'height', 'crossorigin', 'onerror'],
                    FORCE_BODY: true
                  })
                }}
                className="p-4"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Tidak dapat membuat invoice
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <p>📧 Email: {guestEmail}</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={!invoiceHtml}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !invoiceHtml || emailSent}
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : emailSent ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {emailSent ? "Terkirim" : "Kirim ke Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
