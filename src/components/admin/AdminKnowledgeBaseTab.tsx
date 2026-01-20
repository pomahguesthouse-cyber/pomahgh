import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  Link as LinkIcon, 
  Trash2, 
  Eye, 
  BookOpen,
  FileUp,
  Search,
  Filter,
  Zap
} from 'lucide-react';
import { 
  useAdminKnowledgeBase, 
  useAddAdminKnowledge, 
  useDeleteAdminKnowledge, 
  useToggleAdminKnowledge,
  useParseAdminKnowledge 
} from '@/hooks/useAdminKnowledgeBase';

const CATEGORIES = [
  { value: 'general', label: 'Umum' },
  { value: 'sop', label: 'SOP' },
  { value: 'operations', label: 'Operasional' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'reports', label: 'Laporan' },
  { value: 'policies', label: 'Kebijakan' },
  { value: 'token_saver', label: 'Token Saver Tips' },
];

const AdminKnowledgeBaseTab = () => {
  const { data: knowledge, isLoading } = useAdminKnowledgeBase();
  const addKnowledge = useAddAdminKnowledge();
  const deleteKnowledge = useDeleteAdminKnowledge();
  const toggleKnowledge = useToggleAdminKnowledge();
  const parseKnowledge = useParseAdminKnowledge();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState<'text' | 'url'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [previewEntry, setPreviewEntry] = useState<typeof knowledge extends (infer T)[] ? T : never | null>(null);

  const handleAddKnowledge = async () => {
    if (addType === 'text') {
      await addKnowledge.mutateAsync({
        title,
        content,
        category,
        source_type: 'txt',
        source_url: null,
        original_filename: null,
        summary: content.substring(0, 200),
        is_active: true,
        tokens_count: Math.ceil(content.length / 4),
      });
    } else {
      await parseKnowledge.mutateAsync({
        type: 'url',
        content: url,
        title,
        category,
      });
    }
    
    setIsAddOpen(false);
    setTitle('');
    setContent('');
    setUrl('');
    setCategory('general');
  };

  const filteredKnowledge = knowledge?.filter(k => {
    const matchesSearch = k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         k.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || k.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (cat: string | null) => {
    return CATEGORIES.find(c => c.value === cat)?.label || 'Umum';
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{knowledge?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Knowledge</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {knowledge?.filter(k => k.is_active).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {knowledge?.reduce((acc, k) => acc + (k.tokens_count || 0), 0).toLocaleString() || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Token</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(knowledge?.map(k => k.category)).size || 0}
            </div>
            <p className="text-sm text-muted-foreground">Kategori</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari knowledge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Knowledge Baru</DialogTitle>
            </DialogHeader>
            
            <Tabs value={addType} onValueChange={(v) => setAddType(v as 'text' | 'url')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Teks Manual
                </TabsTrigger>
                <TabsTrigger value="url">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Dari URL
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Judul</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Judul knowledge"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TabsContent value="text" className="mt-0">
                  <div className="space-y-2">
                    <Label>Konten</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Masukkan konten knowledge..."
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="url" className="mt-0">
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/page"
                    />
                    <p className="text-sm text-muted-foreground">
                      Konten akan diextract otomatis dari URL
                    </p>
                  </div>
                </TabsContent>

                <Button 
                  onClick={handleAddKnowledge} 
                  disabled={!title || (addType === 'text' ? !content : !url) || addKnowledge.isPending || parseKnowledge.isPending}
                  className="w-full"
                >
                  {(addKnowledge.isPending || parseKnowledge.isPending) ? 'Memproses...' : 'Simpan Knowledge'}
                </Button>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Knowledge List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Daftar Knowledge Admin
          </CardTitle>
          <CardDescription>
            Knowledge base khusus untuk AI Admin Chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : filteredKnowledge?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || filterCategory !== 'all' 
                ? 'Tidak ada knowledge yang cocok dengan filter'
                : 'Belum ada knowledge. Klik "Tambah Knowledge" untuk memulai.'}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredKnowledge?.map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{entry.title}</h4>
                        {entry.category === 'token_saver' ? (
                          <Badge variant="outline" className="shrink-0 bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Zap className="h-3 w-3 mr-1" />
                            Token Saver
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            {getCategoryLabel(entry.category)}
                          </Badge>
                        )}
                        {entry.source_type === 'url' && (
                          <Badge variant="outline" className="shrink-0">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            URL
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {entry.summary || entry.content?.substring(0, 100)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.tokens_count?.toLocaleString()} tokens
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={entry.is_active ?? false}
                        onCheckedChange={(checked) => 
                          toggleKnowledge.mutate({ id: entry.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewEntry(entry)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Hapus knowledge ini?')) {
                            deleteKnowledge.mutate(entry.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewEntry} onOpenChange={() => setPreviewEntry(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewEntry?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge>{getCategoryLabel(previewEntry?.category ?? null)}</Badge>
                <Badge variant="outline">{previewEntry?.source_type}</Badge>
                {previewEntry?.source_url && (
                  <a 
                    href={previewEntry.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Lihat sumber
                  </a>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                  {previewEntry?.content}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKnowledgeBaseTab;
