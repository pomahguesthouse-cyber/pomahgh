import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Palette, ListChecks, MessageCircle, Bot, ScanLine } from "lucide-react";
import { InvoiceSettingsPanel } from "@/components/admin/invoice-management/InvoiceSettingsPanel";
import { InvoiceTemplatePanel } from "@/components/admin/invoice-management/InvoiceTemplatePanel";
import { PaymentMonitorPanel } from "@/components/admin/invoice-management/PaymentMonitorPanel";
import { WhatsAppSettingsPanel } from "@/components/admin/invoice-management/WhatsAppSettingsPanel";
import { AutomationPanel } from "@/components/admin/invoice-management/AutomationPanel";
import { OcrTestPanel } from "@/components/admin/invoice-management/OcrTestPanel";

export default function AdminInvoiceManagement() {
  const [tab, setTab] = useState("monitor");

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payment Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola pembayaran, bukti transfer, OCR & otomatisasi WhatsApp di satu tempat.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto sm:h-10">
          <TabsTrigger value="monitor" className="flex gap-2 items-center">
            <ListChecks className="h-4 w-4" /> <span className="hidden sm:inline">Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex gap-2 items-center">
            <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">OCR Test</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2 items-center">
            <SettingsIcon className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="template" className="flex gap-2 items-center">
            <Palette className="h-4 w-4" /> <span className="hidden sm:inline">Template</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex gap-2 items-center">
            <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex gap-2 items-center">
            <Bot className="h-4 w-4" /> <span className="hidden sm:inline">Automation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor"><PaymentMonitorPanel /></TabsContent>
        <TabsContent value="ocr"><OcrTestPanel /></TabsContent>
        <TabsContent value="settings"><InvoiceSettingsPanel /></TabsContent>
        <TabsContent value="template"><InvoiceTemplatePanel /></TabsContent>
        <TabsContent value="whatsapp"><WhatsAppSettingsPanel /></TabsContent>
        <TabsContent value="automation"><AutomationPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
