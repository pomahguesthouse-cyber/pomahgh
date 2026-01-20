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
import { 
  Plus, 
  Trash2, 
  Edit2, 
  GraduationCap,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  useAdminTrainingExamples, 
  useAdminTrainingStats,
  useAddAdminTrainingExample, 
  useUpdateAdminTrainingExample,
  useDeleteAdminTrainingExample, 
  useToggleAdminTrainingExample,
  AdminTrainingExample
} from '@/hooks/useAdminTrainingExamples';

const CATEGORIES = [
  { value: 'general', label: 'Umum' },
  { value: 'booking_management', label: 'Kelola Booking' },
  { value: 'price_update', label: 'Update Harga' },
  { value: 'statistics', label: 'Statistik' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'operations', label: 'Operasional' },
];

const AdminTrainingTab = () => {
  const { data: examples, isLoading } = useAdminTrainingExamples();
  const { data: stats } = useAdminTrainingStats();
  const addExample = useAddAdminTrainingExample();
  const updateExample = useUpdateAdminTrainingExample();
  const deleteExample = useDeleteAdminTrainingExample();
  const toggleExample = useToggleAdminTrainingExample();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<AdminTrainingExample | null>(null);
  const [question, setQuestion] = useState('');
  const [idealAnswer, setIdealAnswer] = useState('');
  const [category, setCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleSave = async () => {
    if (editingExample) {
      await updateExample.mutateAsync({
        id: editingExample.id,
        question,
        ideal_answer: idealAnswer,
        category,
      });
    } else {
      await addExample.mutateAsync({
        question,
        ideal_answer: idealAnswer,
        category,
        is_active: true,
        display_order: 0,
        response_tags: null,
      });
    }
    
    handleCloseDialog();
  };

  const handleEdit = (example: AdminTrainingExample) => {
    setEditingExample(example);
    setQuestion(example.question);
    setIdealAnswer(example.ideal_answer);
    setCategory(example.category || 'general');
    setIsAddOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddOpen(false);
    setEditingExample(null);
    setQuestion('');
    setIdealAnswer('');
    setCategory('general');
  };

  const filteredExamples = examples?.filter(e => {
    const matchesSearch = e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         e.ideal_answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (cat: string | null) => {
    return CATEGORIES.find(c => c.value === cat)?.label || 'Umum';
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total Contoh</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{stats?.active || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {(stats?.total || 0) - (stats?.active || 0)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Nonaktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(stats?.byCategory || {}).length}
            </div>
            <p className="text-sm text-muted-foreground">Kategori Terisi</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Distribusi per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <Badge key={cat} variant="secondary" className="text-sm">
                  {getCategoryLabel(cat)}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari contoh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]">
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

        <Dialog open={isAddOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsAddOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Contoh
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingExample ? 'Edit Contoh Training' : 'Tambah Contoh Training'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label>Pertanyaan User</Label>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Contoh: Berapa total booking hari ini?"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Jawaban Ideal</Label>
                <Textarea
                  value={idealAnswer}
                  onChange={(e) => setIdealAnswer(e.target.value)}
                  placeholder="Contoh: Baik, saya akan cek total booking hari ini..."
                  className="min-h-[120px]"
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={!question || !idealAnswer || addExample.isPending || updateExample.isPending}
                className="w-full"
              >
                {(addExample.isPending || updateExample.isPending) 
                  ? 'Menyimpan...' 
                  : editingExample ? 'Simpan Perubahan' : 'Simpan Contoh'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Examples List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Contoh Training Admin
          </CardTitle>
          <CardDescription>
            Contoh pertanyaan dan jawaban untuk melatih AI Admin Chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : filteredExamples?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || filterCategory !== 'all' 
                ? 'Tidak ada contoh yang cocok dengan filter'
                : 'Belum ada contoh training. Klik "Tambah Contoh" untuk memulai.'}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {filteredExamples?.map((example) => (
                  <div 
                    key={example.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getCategoryLabel(example.category)}
                          </Badge>
                          {example.is_active ? (
                            <Badge variant="default" className="bg-green-600">Aktif</Badge>
                          ) : (
                            <Badge variant="outline">Nonaktif</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-1 text-blue-600 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Pertanyaan:</p>
                              <p className="text-sm">{example.question}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <GraduationCap className="h-4 w-4 mt-1 text-green-600 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Jawaban Ideal:</p>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {example.ideal_answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={example.is_active ?? false}
                          onCheckedChange={(checked) => 
                            toggleExample.mutate({ id: example.id, is_active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(example)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Hapus contoh ini?')) {
                              deleteExample.mutate(example.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTrainingTab;
