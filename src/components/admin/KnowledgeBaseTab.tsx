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
import { Textarea } from '@/components/ui/textarea';
import { 
  useKnowledgeBase, 
  useUploadKnowledge, 
  useAddUrlKnowledge, 
  useDeleteKnowledge, 
  useToggleKnowledge,
  useUpdateKnowledge
} from '@/hooks/useKnowledgeBase';
import { 
  Upload, 
  Link, 
  FileText, 
  FileType, 
  Globe, 
  Trash2, 
  Eye, 
  Plus,
  Loader2,
  File,
  Edit,
  Search
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

const SOURCE_ICONS = {
  pdf: FileType,
  word: FileText,
  txt: File,
  url: Globe
};

const KnowledgeBaseTab = () => {
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

  // Filter knowledge based on search query
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
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
    setEditCategory(entry.category ?? '');
  };

  const handleSaveEdit = async () => {
    if (editingId) {
      await updateKnowledge.mutateAsync({ 
        id: editingId, 
        title: editTitle, 
        category: editCategory 
      });
      setEditingId(null);
    }
  };

  const isUploading = uploadKnowledge.isPending || addUrlKnowledge.isPending;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Tambah Knowledge
          </CardTitle>
          <CardDescription>
            Upload file atau tambah URL untuk memperkaya knowledge base chatbot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('file')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={uploadMode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('url')}
            >
              <Link className="w-4 h-4 mr-2" />
              Tambah URL
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Judul Knowledge</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nama dokumen atau halaman"
              />
            </div>
            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div>
              <Label>File (PDF, DOCX, TXT)</Label>
              <div className="mt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-muted-foreground text-sm">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p>Klik untuk pilih file atau drag & drop</p>
                      <p className="text-sm">Maksimal 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="url">URL Website</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Konten halaman akan diekstrak otomatis
              </p>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={isUploading || (!selectedFile && uploadMode === 'file') || (!url && uploadMode === 'url') || !title}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Knowledge
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Knowledge List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Knowledge ({filteredKnowledge?.length || 0})</CardTitle>
          <CardDescription>
            Kelola konten knowledge base untuk chatbot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari knowledge (judul, kategori, konten...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !knowledge?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada knowledge. Upload file atau tambah URL untuk memulai.
            </div>
          ) : !filteredKnowledge?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada knowledge yang cocok dengan pencarian "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKnowledge?.map((entry) => {
                const SourceIcon = SOURCE_ICONS[entry.source_type] || FileText;
                const categoryLabel = CATEGORIES.find(c => c.value === entry.category)?.label || entry.category;
                
                return (
                  <div 
                    key={entry.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      !entry.is_active ? 'opacity-50 bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <SourceIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === entry.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-8"
                            />
                            <Select value={editCategory} onValueChange={setEditCategory}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={handleSaveEdit}>Simpan</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Batal</Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium truncate">{entry.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {categoryLabel}
                              </Badge>
                              <span>•</span>
                              <span>{entry.source_type.toUpperCase()}</span>
                              <span>•</span>
                              <span>{entry.tokens_count || 0} tokens</span>
                              <span>•</span>
                              <span>{formatDateID(new Date(entry.created_at))}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {editingId !== entry.id && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.is_active}
                          onCheckedChange={(checked) => 
                            toggleKnowledge.mutate({ id: entry.id, is_active: checked })
                          }
                        />
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setPreviewContent(entry.content);
                                setPreviewTitle(entry.title);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>{previewTitle}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh]">
                              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                                {previewContent}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm('Yakin ingin menghapus knowledge ini?')) {
                              deleteKnowledge.mutate(entry.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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

export default KnowledgeBaseTab;
