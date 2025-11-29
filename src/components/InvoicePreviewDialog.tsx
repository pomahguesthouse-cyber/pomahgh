import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";

interface InvoicePreviewDialogProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendInvoice: (options: {
    bookingId: string;
    sendEmail: boolean;
    sendWhatsApp: boolean;
  }) => Promise<void>;
}

export const InvoicePreviewDialog = ({
  booking,
  open,
  onOpenChange,
  onSendInvoice
}: InvoicePreviewDialogProps) => {
  const [invoiceHtml, setInvoiceHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  useEffect(() => {
    if (open && booking) {
      loadInvoicePreview();
    }
  }, [open, booking]);

  const loadInvoicePreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { bookingId: booking.id }
      });

      if (error) throw error;

      setInvoiceHtml(data.html);
    } catch (error: any) {
      console.error("Error loading invoice:", error);
      toast.error("Gagal memuat preview invoice", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendEmail && !sendWhatsApp) {
      toast.error("Pilih minimal satu metode pengiriman");
      return;
    }

    setSending(true);
    try {
      await onSendInvoice({
        bookingId: booking.id,
        sendEmail,
        sendWhatsApp
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending invoice:", error);
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const sanitizedHtml = DOMPurify.sanitize(invoiceHtml);
      printWindow.document.write(sanitizedHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceHtml || !booking) return;

    setDownloading(true);
    toast.loading("Generating PDF...");

    try {
      // Create styled container for PDF with A4 dimensions
      const container = document.createElement('div');
      const sanitizedHtml = DOMPurify.sanitize(invoiceHtml);
      
      // Wrap with PDF-optimized container
      container.innerHTML = `
        <div style="
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          background: white;
          font-family: Arial, Helvetica, sans-serif;
        ">
          ${sanitizedHtml}
        </div>
      `;
      
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      document.body.appendChild(container);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 800));

      // PDF options for better quality
      const opt = {
        margin: [15, 10, 15, 10] as [number, number, number, number],
        filename: `Invoice-${booking.invoice_number || booking.booking_code}.pdf`,
        image: { 
          type: 'jpeg' as const, 
          quality: 1.0
        },
        html2canvas: { 
          scale: 3,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 850,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true,
          putOnlyUsedFonts: true,
          floatPrecision: 16
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'] as const,
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['.no-page-break', 'tr', 'td']
        }
      };

      // Generate PDF
      await html2pdf().set(opt).from(container.firstChild as HTMLElement).save();

      // Clean up
      document.body.removeChild(container);
      
      toast.dismiss();
      toast.success("PDF berhasil diunduh!");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.dismiss();
      toast.error("Gagal mengunduh PDF", {
        description: error.message
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Preview Invoice - {booking?.invoice_number || 'Loading...'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-background">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(invoiceHtml) }} />
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
            />
            <Label htmlFor="send-email" className="cursor-pointer">
              Kirim via Email ({booking?.guest_email})
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-whatsapp"
              checked={sendWhatsApp}
              onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)}
            />
            <Label htmlFor="send-whatsapp" className="cursor-pointer">
              Kirim via WhatsApp ({booking?.guest_phone || 'No phone'})
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF} 
            disabled={loading || downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={loading}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || loading || (!sendEmail && !sendWhatsApp)}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
