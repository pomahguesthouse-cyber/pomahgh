import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

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
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      printWindow.print();
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
            <div dangerouslySetInnerHTML={{ __html: invoiceHtml }} />
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
