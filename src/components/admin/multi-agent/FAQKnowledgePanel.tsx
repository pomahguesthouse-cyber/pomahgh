import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useKnowledgeBase,
  useUploadKnowledge,
  useAddUrlKnowledge,
  useDeleteKnowledge,
  useToggleKnowledge,
  useUpdateKnowledge
} from '@/hooks/useKnowledgeBase';
import {
  Upload, Link, FileText, FileType, Globe, Trash2, Eye, Plus,
  Loader2, File, Edit, Search, BookOpen, Bot
} from 'lucide-react';
import { formatDateID } from '@/utils/indonesianFormat';

const CATEGORIES = [
  { value: 'general', label: 'Umum' },
  { value: 'faq', label: 'FAQ' },
  { value: 'policies', label: 'Kebijakan' },
  { value: 'promo', label: 'Promo' },
  { value: 'facilities', label: 'Fasilitas' },
  { value: 'rooms', label: 'Kamar' },
  { value: 'location', label: 'Lokasi' },
  { value: 'services', label: 'Layanan' }
];

const SOURCE_ICONS: Record<string, typeof FileText> = {
  pdf: FileType,
  word: FileText,
  txt: File,
  url: Globe
};

export const FAQKnowledgePanel = () => {
  const { data: knowledge, isLoading } = useKnowledgeBase();
  const uploadKnowledge = useUploadKnowledge();
  const addUrlKnowledge = useAddUrlKnowledge();
  const deleteKnowledge = useDeleteKnowledge();
  const toggleKnowledge = useToggleKnowledge();
  const updateKnowledge = useUpdateKnowledge();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKnowledge = knowledge?.filter(entry => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.category?.toLowerCase().includes(query) ||
      entry.content?.toLowerCase().includes(query) ||
      entry.source_type.toLowerCase().includes(query)
    );
  });

  const activeCount = knowledge?.filter(e => e.is_active)?.length || 0;
  const totalTokens = knowledge?.reduce((sum, e) => sum + (e.tokens_count || 0), 0) || 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (uploadMode === 'file' && selectedFile) {
      await uploadKnowledge.mutateAsync({ file: selectedFile, title, category });
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (uploadMode === 'url' && url) {
      await addUrlKnowledge.mutateAsync({ url, title, category });
      setUrl('');
      setTitle('');
    }
  };

  const handleEdit = (entry: { id: string; title: string; category: string | null }) => {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditCategory(entry.category ?? 'general');
  };

  const handleSaveEdit = async () => {
    if (editingId) {
      await updateKnowledge.mutateAsync({ id: editingId, title: editTitle, category: editCategory });
      setEditingId(null);
    }
  };

  const isUploading = uploadKnowledge.isPending || addUrlKnowledge.isPending;

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Knowledge Base — CS & FAQ Bot</h3>
          <p className="text-xs text-muted-foreground">
            Data ini menjadi referensi utama FAQ Bot untuk menjawab pertanyaan tamu via WhatsApp & widget chat
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Dokumen</p>
          <p className="text-lg font-bold">{knowledge?.length || 0}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Aktif</p>
          <p className="text-lg font-bold text-green-600">{activeCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Token</p>
          <p className="text-lg font-bold">{totalTokens.toLocaleString()}</p>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tambah Knowledge
          </CardTitle>
          <CardDescription className="text-xs">
            Upload file (PDF, DOC, TXT) atau tambah URL sebagai sumber jawaban bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant={uploadMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setUploadMode('file')}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
            </Button>
            <Button variant={uploadMode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setUploadMode('url')}>
              <Link className="w-3.5 h-3.5 mr-1.5" /> Tambah URL
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama dokumen" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.docx,.doc,.txt" className="hidden" />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-muted-foreground">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    <Upload className="w-6 h-6 mx-auto mb-1" />
                    <p>Klik untuk pilih file (PDF, DOC, TXT)</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">URL</Label>
              <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Konten halaman diekstrak otomatis</p>
            </div>
          )}

          <Button
            size="sm"
            onClick={handleUpload}
            disabled={isUploading || (!selectedFile && uploadMode === 'file') || (!url && uploadMode === 'url') || !title}
          >
            {isUploading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Memproses...</> : <><Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah</>}
          </Button>
        </CardContent>
      </Card>

      {/* Knowledge List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Daftar Knowledge ({filteredKnowledge?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Cari knowledge..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !knowledge?.length ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Belum ada knowledge. Upload file atau tambah URL untuk memulai.
            </div>
          ) : !filteredKnowledge?.length ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Tidak ada hasil untuk "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-2">
              {filteredKnowledge.map((entry) => {
                const SourceIcon = SOURCE_ICONS[entry.source_type] || FileText;
                const categoryLabel = CATEGORIES.find(c => c.value === entry.category)?.label || entry.category;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 border rounded-lg text-sm ${!entry.is_active ? 'opacity-50 bg-muted/50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <SourceIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === entry.id ? (
                          <div className="flex gap-2 items-center">
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-7 text-sm" />
                            <Select value={editCategory} onValueChange={setEditCategory}>
                              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>Simpan</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Batal</Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium truncate text-sm">{entry.title}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{categoryLabel}</Badge>
                              <span>•</span>
                              <span>{entry.source_type.toUpperCase()}</span>
                              <span>•</span>
                              <span>{entry.tokens_count || 0} tok</span>
                              <span className="hidden sm:inline">• {formatDateID(new Date(entry.created_at))}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {editingId !== entry.id && (
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={entry.is_active}
                          onCheckedChange={(checked) => toggleKnowledge.mutate({ id: entry.id, is_active: checked })}
                        />
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPreviewContent(entry.content); setPreviewTitle(entry.title); }}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader><DialogTitle>{previewTitle}</DialogTitle></DialogHeader>
                            <ScrollArea className="h-[60vh]">
                              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">{previewContent}</div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('Hapus knowledge ini?')) deleteKnowledge.mutate(entry.id); }}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
