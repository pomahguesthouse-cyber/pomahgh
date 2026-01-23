import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useAdminChatbotTemplates, 
  useUpdateAdminChatbotTemplate,
  useCreateAdminChatbotTemplate,
  useDeleteAdminChatbotTemplate,
  type AdminChatbotTemplate,
  type TemplateVariable
} from '@/hooks/useAdminChatbotTemplates';
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  RefreshCw,
  MessageSquare,
  ListChecks,
  CalendarCheck,
  CalendarX,
  BarChart3,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  guest_list: <ListChecks className="w-4 h-4" />,
  checkin_reminder: <CalendarCheck className="w-4 h-4" />,
  checkout_reminder: <CalendarX className="w-4 h-4" />,
  booking_confirmation: <Check className="w-4 h-4" />,
  daily_summary: <BarChart3 className="w-4 h-4" />,
};

export default function MessageTemplatesTab() {
  const { data: templates, isLoading, refetch } = useAdminChatbotTemplates();
  const updateTemplate = useUpdateAdminChatbotTemplate();
  const createTemplate = useCreateAdminChatbotTemplate();
  const deleteTemplate = useDeleteAdminChatbotTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<AdminChatbotTemplate | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New template form
  const [newTemplate, setNewTemplate] = useState({
    command_key: '',
    command_name: '',
    command_description: '',
    template_content: '',
  });

  const handleSelectTemplate = (template: AdminChatbotTemplate) => {
    setSelectedTemplate(template);
    setEditContent(template.template_content);
    setShowPreview(false);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    
    await updateTemplate.mutateAsync({
      id: selectedTemplate.id,
      template_content: editContent
    });
  };

  const handleToggleActive = async (template: AdminChatbotTemplate) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      is_active: !template.is_active
    });
  };

  const handleCopyVariable = (varKey: string) => {
    navigator.clipboard.writeText(`{{${varKey}}}`);
    setCopiedVar(varKey);
    toast.success(`Variable {{${varKey}}} disalin!`);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.command_key || !newTemplate.command_name || !newTemplate.template_content) {
      toast.error('Isi semua field wajib');
      return;
    }

    await createTemplate.mutateAsync({
      ...newTemplate,
      available_variables: [],
      is_active: true,
      display_order: (templates?.length || 0) + 1
    });

    setNewTemplate({
      command_key: '',
      command_name: '',
      command_description: '',
      template_content: '',
    });
    setShowCreateDialog(false);
  };

  const handleDeleteTemplate = async (template: AdminChatbotTemplate) => {
    if (!confirm(`Hapus template "${template.command_name}"?`)) return;
    await deleteTemplate.mutateAsync(template.id);
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null);
      setEditContent('');
    }
  };

  // Generate preview with example values
  const getPreviewContent = () => {
    if (!selectedTemplate) return '';
    
    let preview = editContent;
    
    // Replace variables with example values
    const exampleValues: Record<string, string> = {
      tanggal: '23 Jan 2026',
      jumlah_checkin: '5',
      jumlah_checkout: '2',
      jumlah_tamu: '5',
      list_checkin: `1. *Dessy MUA* (PMH-B5YKUN) | Kamar 207 (Single)
2. *Dzakira Hasna Raihana* (PMH-8S5V54) | Kamar 205, 204 (Deluxe)
3. *Mutiara Effrina Oktavianti* (PMH-9C7Y9X) | Kamar FS100 (Family Suite)`,
      list_checkout: `1. *Mutiara Effrina* (PMH-P23JP4) | Kamar 207 (Single)`,
      list_inhouse: `1. *Bening Ayu S* (PMH-6WTPLC) | Kamar 206 (Deluxe) - Sampai 08 Feb 2026`,
      list_tamu: `1. *Dessy MUA* (5 tamu)
   📱 628123456789
   🛏️ Single - 207
   📅 2 malam s.d. 25 Jan 2026
   🎫 PMH-B5YKUN`,
      total_kamar: '7',
      total_tamu: '18',
      okupansi: '85',
      nama_tamu: 'Budi Santoso',
      kode_booking: 'PMH-ABC123',
      tanggal_checkin: '23 Jan 2026',
      tanggal_checkout: '25 Jan 2026',
      nama_kamar: 'Deluxe Room',
      total_harga: 'Rp 1.500.000',
      catatan_tambahan: '',
    };

    Object.entries(exampleValues).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return preview;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Template Pesan
              </CardTitle>
              <CardDescription>
                Kelola template pesan untuk setiap perintah/keyword chatbot admin
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Template Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Buat Template Baru</DialogTitle>
                    <DialogDescription>
                      Tambahkan template pesan untuk perintah baru
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Command Key *</Label>
                      <Input
                        placeholder="contoh: morning_report"
                        value={newTemplate.command_key}
                        onChange={(e) => setNewTemplate({ ...newTemplate, command_key: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Identifier unik (huruf kecil, underscore)
                      </p>
                    </div>
                    <div>
                      <Label>Nama Template *</Label>
                      <Input
                        placeholder="contoh: Laporan Pagi"
                        value={newTemplate.command_name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, command_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Deskripsi</Label>
                      <Input
                        placeholder="Kapan template ini digunakan"
                        value={newTemplate.command_description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, command_description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Isi Template *</Label>
                      <Textarea
                        rows={6}
                        placeholder="Isi pesan template..."
                        value={newTemplate.template_content}
                        onChange={(e) => setNewTemplate({ ...newTemplate, template_content: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                      {createTemplate.isPending ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daftar Template</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedTemplate?.id === template.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {COMMAND_ICONS[template.command_key] || <FileText className="w-4 h-4" />}
                        <div>
                          <p className="font-medium text-sm">{template.command_name}</p>
                          <p className="text-xs text-muted-foreground">{template.command_key}</p>
                        </div>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                        {template.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    {template.command_description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {template.command_description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedTemplate ? `Edit: ${selectedTemplate.command_name}` : 'Pilih Template'}
              </CardTitle>
              {selectedTemplate && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedTemplate.is_active}
                    onCheckedChange={() => handleToggleActive(selectedTemplate)}
                  />
                  <span className="text-sm text-muted-foreground">Aktif</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div className="space-y-4">
                {/* Variables */}
                {selectedTemplate.available_variables.length > 0 && (
                  <div>
                    <Label className="text-sm">Variabel Tersedia</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTemplate.available_variables.map((v) => (
                        <Button
                          key={v.key}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleCopyVariable(v.key)}
                        >
                          {copiedVar === v.key ? (
                            <Check className="w-3 h-3 mr-1 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          {`{{${v.key}}}`}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Klik variabel untuk menyalin ke clipboard
                    </p>
                  </div>
                )}

                {/* Editor / Preview Toggle */}
                <Tabs value={showPreview ? 'preview' : 'edit'} onValueChange={(v) => setShowPreview(v === 'preview')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edit">
                      <FileText className="w-4 h-4 mr-2" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit" className="mt-4">
                    <Textarea
                      rows={15}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="font-mono text-sm"
                      placeholder="Isi template pesan..."
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-4">
                    <div className="bg-muted p-4 rounded-lg min-h-[300px]">
                      <div className="bg-background p-4 rounded-lg shadow-sm whitespace-pre-wrap text-sm">
                        {getPreviewContent()}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTemplate(selectedTemplate)}
                    disabled={deleteTemplate.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus
                  </Button>
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={updateTemplate.isPending || editContent === selectedTemplate.template_content}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateTemplate.isPending ? 'Menyimpan...' : 'Simpan Template'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Pilih template dari daftar untuk mengedit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
