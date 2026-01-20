import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Download, Loader2 } from "lucide-react";
import { useInvoice } from "@/hooks/useInvoice";
import { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";
import DOMPurify from "dompurify";
import html2pdf from "html2pdf.js";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  bookingCode: string;
}

export const InvoicePreviewDialog = ({
  open,
  onOpenChange,
  bookingId,
  guestName,
  guestPhone,
  bookingCode,
}: InvoicePreviewDialogProps) => {
  const { generateInvoice, isGenerating, invoiceData, sendWhatsApp, isSendingWhatsApp } = useInvoice();
  const { template, replaceVariables } = useInvoiceTemplate();
  const [invoiceHtml, setInvoiceHtml] = useState<string>("");

  useEffect(() => {
    if (open && bookingId) {
      generateInvoice(bookingId);
    }
  }, [open, bookingId]);

  useEffect(() => {
    if (invoiceData?.invoice_html) {
      setInvoiceHtml(invoiceData.invoice_html);
    }
  }, [invoiceData]);

  const handleSendWhatsApp = () => {
    if (!template || !invoiceData?.variables) return;

    const message = replaceVariables(template.whatsapp_template, invoiceData.variables);
    sendWhatsApp({ phone: guestPhone, message });
  };

  const handleDownloadPDF = () => {
    if (!invoiceHtml) return;

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

    html2pdf().set(opt).from(element).save();
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
            <p>📱 WhatsApp: {guestPhone}</p>
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
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp || !invoiceData}
            >
              {isSendingWhatsApp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Kirim WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};