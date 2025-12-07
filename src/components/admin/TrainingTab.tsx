import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  BookOpen, 
  Star, 
  Plus, 
  Pencil, 
  Trash2, 
  GraduationCap,
  MessageSquare,
  TrendingUp,
  Loader2,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { 
  useTrainingExamples, 
  useAddTrainingExample, 
  useUpdateTrainingExample, 
  useDeleteTrainingExample,
  useTrainingStats,
  TrainingExample
} from "@/hooks/useTrainingExamples";

const CATEGORIES = [
  { value: "general", label: "Umum", emoji: "💬" },
  { value: "greeting", label: "Sapaan", emoji: "👋" },
  { value: "booking", label: "Booking", emoji: "📅" },
  { value: "availability", label: "Ketersediaan", emoji: "🔍" },
  { value: "facilities", label: "Fasilitas", emoji: "✨" },
  { value: "promo", label: "Promo", emoji: "🎉" },
  { value: "payment", label: "Pembayaran", emoji: "💳" },
  { value: "location", label: "Lokasi", emoji: "📍" },
  { value: "complaint", label: "Keluhan", emoji: "😔" },
  { value: "reschedule", label: "Reschedule", emoji: "🔄" },
  { value: "cancel", label: "Pembatalan", emoji: "❌" },
  { value: "special_request", label: "Permintaan Khusus", emoji: "🌟" },
];

const RESPONSE_TAGS = [
  { value: "empati", label: "Empati", color: "bg-pink-100 text-pink-800" },
  { value: "upsell", label: "Upsell", color: "bg-green-100 text-green-800" },
  { value: "confirm", label: "Konfirmasi", color: "bg-blue-100 text-blue-800" },
  { value: "guide", label: "Panduan", color: "bg-yellow-100 text-yellow-800" },
  { value: "apologize", label: "Maaf", color: "bg-red-100 text-red-800" },
  { value: "thanks", label: "Terima Kasih", color: "bg-purple-100 text-purple-800" },
];

export default function TrainingTab() {
  const { data: examples, isLoading } = useTrainingExamples();
  const { data: stats } = useTrainingStats();
  const addExample = useAddTrainingExample();
  const updateExample = useUpdateTrainingExample();
  const deleteExample = useDeleteTrainingExample();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<TrainingExample | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    question: "",
    ideal_answer: "",
    category: "general",
  });

  const handleAdd = () => {
    if (!formData.question.trim() || !formData.ideal_answer.trim()) {
      return;
    }
    addExample.mutate({
      question: formData.question,
      ideal_answer: formData.ideal_answer,
      category: formData.category,
    }, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setFormData({ question: "", ideal_answer: "", category: "general" });
      }
    });
  };

  const handleUpdate = () => {
    if (!editingExample || !formData.question.trim() || !formData.ideal_answer.trim()) {
      return;
    }
    updateExample.mutate({
      id: editingExample.id,
      question: formData.question,
      ideal_answer: formData.ideal_answer,
      category: formData.category,
    }, {
      onSuccess: () => {
        setEditingExample(null);
        setFormData({ question: "", ideal_answer: "", category: "general" });
      }
    });
  };

  const handleEdit = (example: TrainingExample) => {
    setEditingExample(example);
    setFormData({
      question: example.question,
      ideal_answer: example.ideal_answer,
      category: example.category || "general",
    });
  };

  const handleToggleActive = (example: TrainingExample) => {
    updateExample.mutate({
      id: example.id,
      is_active: !example.is_active,
    });
  };

  const handleMoveOrder = (example: TrainingExample, direction: "up" | "down") => {
    const currentOrder = example.display_order || 0;
    const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
    updateExample.mutate({
      id: example.id,
      display_order: newOrder,
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteExample.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Contoh</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalExamples || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Aktif</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.activeExamples || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Total Rating</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalRatings || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Rata-rata</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.avgRating || "0.0"} ⭐</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Dipromosikan</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.promotedCount || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Training Examples (Few-Shot Learning)
              </CardTitle>
              <CardDescription>
                Tambahkan contoh pertanyaan dan jawaban ideal untuk melatih chatbot AI
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Contoh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {examples && examples.length > 0 ? (
            <div className="space-y-4">
              {examples.map((example, index) => (
                <div
                  key={example.id}
                  className={`border rounded-lg p-4 ${!example.is_active ? "opacity-50 bg-muted" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {CATEGORIES.find(c => c.value === example.category)?.emoji}{' '}
                          {CATEGORIES.find(c => c.value === example.category)?.label || example.category}
                        </Badge>
                        {!example.is_active && (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          #{(example.display_order || 0) + 1}
                        </span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950 rounded p-3">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          👤 User: "{example.question}"
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 rounded p-3">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          🤖 Bot: "{example.ideal_answer}"
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveOrder(example, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveOrder(example, "down")}
                        disabled={index === examples.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1 mt-2">
                        <Switch
                          checked={example.is_active ?? true}
                          onCheckedChange={() => handleToggleActive(example)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(example)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(example.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada contoh training</p>
              <p className="text-sm">Tambahkan contoh Q&A untuk melatih chatbot AI</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Contoh Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contoh Pertanyaan User</Label>
              <Textarea
                placeholder="Contoh: Berapa harga kamar per malam?"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Jawaban Ideal Bot</Label>
              <Textarea
                placeholder="Contoh: Kami punya beberapa tipe kamar dengan harga berbeda..."
                value={formData.ideal_answer}
                onChange={(e) => setFormData({ ...formData, ideal_answer: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAdd} disabled={addExample.isPending}>
              {addExample.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingExample} onOpenChange={() => setEditingExample(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contoh Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contoh Pertanyaan User</Label>
              <Textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Jawaban Ideal Bot</Label>
              <Textarea
                value={formData.ideal_answer}
                onChange={(e) => setFormData({ ...formData, ideal_answer: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExample(null)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} disabled={updateExample.isPending}>
              {updateExample.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Contoh Training?</AlertDialogTitle>
            <AlertDialogDescription>
              Contoh training ini akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
