import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  useChatConversations, 
  useChatMessages, 
  useDeleteConversation,
  useChatStats 
} from '@/hooks/useChatLogs';
import { useRateMessage, usePromoteToExample, useMessageRatings } from '@/hooks/useTrainingExamples';
import { formatDateTimeID } from '@/utils/indonesianFormat';
import { 
  Search, 
  Trash2, 
  Eye, 
  MessageSquare, 
  Users, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bot,
  User,
  Star,
  GraduationCap,
  Clock,
  AlertCircle,
  ThumbsUp
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const StarRating = ({ value, onChange, disabled }: StarRatingProps) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 disabled:opacity-50"
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              star <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ChatLogsTab = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteData, setPromoteData] = useState<{
    messageId: string;
    question: string;
    answer: string;
    category: string;
  } | null>(null);
  
  const limit = 10;
  const { data: conversationsData, isLoading } = useChatConversations(page, limit);
  const { data: messages, isLoading: messagesLoading } = useChatMessages(selectedConversationId);
  const { data: stats } = useChatStats();
  const { data: ratings } = useMessageRatings();
  const deleteConversation = useDeleteConversation();
  const rateMessage = useRateMessage();
  const promoteToExample = usePromoteToExample();

  const conversations = conversationsData?.data || [];
  const totalCount = conversationsData?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.session_id.toLowerCase().includes(query) ||
      conv.guest_email?.toLowerCase().includes(query)
    );
  });

  const getMessageRating = (messageId: string) => {
    return ratings?.find(r => r.message_id === messageId);
  };

  const handleRate = async (messageId: string, rating: number) => {
    await rateMessage.mutateAsync({ messageId, rating });
  };

  const handleDelete = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation.mutateAsync(conversationToDelete);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleOpenPromote = (messageId: string, question: string, answer: string) => {
    setPromoteData({
      messageId,
      question,
      answer,
      category: 'general'
    });
    setPromoteDialogOpen(true);
  };

  const handlePromote = async () => {
    if (promoteData) {
      await promoteToExample.mutateAsync({
        messageId: promoteData.messageId,
        question: promoteData.question,
        answer: promoteData.answer,
        category: promoteData.category,
      });
      setPromoteDialogOpen(false);
      setPromoteData(null);
    }
  };

  // Find the user message before an assistant message
  const findUserQuestion = (messages: Array<{ role: string; content: string }>, currentIndex: number) => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Monitoring Alerts */}
      {(stats?.fallbackRate && stats.fallbackRate > 20) || (stats?.avgSatisfaction && stats.avgSatisfaction < 3) ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-800">Perhatian: Kualitas Chatbot</h4>
            <ul className="text-sm text-orange-700 mt-1 space-y-1">
              {stats?.fallbackRate && stats.fallbackRate > 20 && (
                <li>• Fallback rate tinggi ({stats.fallbackRate}%) - pertimbangkan untuk meningkatkan training examples</li>
              )}
              {stats?.avgSatisfaction && stats.avgSatisfaction < 3 && (
                <li>• Rating kepuasan rendah ({stats.avgSatisfaction}/5) - perlu evaluasi percakapan</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Percakapan</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalConversations || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Pesan</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalMessages || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Konversi Booking</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.conversionsToBooking || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Rata-rata Durasi</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats?.avgDurationSeconds 
                ? `${Math.floor(stats.avgDurationSeconds / 60)}m ${stats.avgDurationSeconds % 60}s`
                : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className={stats?.fallbackRate && stats.fallbackRate > 20 ? "w-4 h-4 text-red-500" : "w-4 h-4 text-orange-500"} />
              <span className="text-sm text-muted-foreground">Fallback Rate</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats?.fallbackRate && stats.fallbackRate > 20 ? 'text-red-500' : ''}`}>
              {stats?.fallbackRate || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Kepuasan</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats?.avgSatisfaction ? `${stats.avgSatisfaction}/5` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Log Percakapan</CardTitle>
          <CardDescription>
            Riwayat semua percakapan chatbot dengan tamu. Klik 👁 untuk melihat detail dan beri rating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari by session ID atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? `Tidak ada percakapan yang cocok dengan "${searchQuery}"` : 'Belum ada percakapan'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate">
                        {conv.session_id.substring(0, 20)}...
                      </span>
                      {conv.booking_created && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          Booking
                        </Badge>
                      )}
                      {conv.fallback_count && conv.fallback_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conv.fallback_count}x fallback
                        </Badge>
                      )}
                      {conv.satisfaction_rating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{conv.satisfaction_rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{conv.started_at ? formatDateTimeID(new Date(conv.started_at)) : '-'}</span>
                      <span>•</span>
                      <span>{conv.message_count || 0} pesan</span>
                      {conv.conversation_duration_seconds && (
                        <>
                          <span>•</span>
                          <span>{Math.floor(conv.conversation_duration_seconds / 60)}m</span>
                        </>
                      )}
                      {conv.guest_email && (
                        <>
                          <span>•</span>
                          <span className="truncate">{conv.guest_email}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversationId(conv.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(conv.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages} ({totalCount} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Dialog with Rating */}
      <Dialog open={!!selectedConversationId} onOpenChange={() => setSelectedConversationId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detail Percakapan</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada pesan dalam percakapan ini
              </div>
            ) : (
              <div className="space-y-3">
                {messages?.map((msg, index) => {
                  const rating = getMessageRating(msg.id);
                  const userQuestion = msg.role === 'assistant' ? findUserQuestion(messages, index) : '';
                  
                  // Render system audit messages (mis. MEMORY AUDIT) sebagai banner kecil
                  if (msg.role === 'system') {
                    const isMemoryAudit = msg.content.includes('[MEMORY AUDIT]');
                    return (
                      <div key={msg.id} className="flex justify-center my-1">
                        <div
                          className={`max-w-[90%] px-3 py-1.5 rounded-md border text-xs flex items-start gap-2 ${
                            isMemoryAudit
                              ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-200'
                              : 'bg-muted/50 border-border text-muted-foreground'
                          }`}
                        >
                          <span className="font-mono whitespace-pre-wrap break-words flex-1">{msg.content}</span>
                          <span className="opacity-60 shrink-0">
                            {msg.created_at ? formatDateTimeID(new Date(msg.created_at)) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="space-y-1">
                      <div
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {msg.created_at ? formatDateTimeID(new Date(msg.created_at)) : ''}
                          </p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      {/* Rating UI for assistant messages */}
                      {msg.role === 'assistant' && (
                        <div className="ml-10 flex items-center gap-3">
                          <StarRating
                            value={rating?.rating || 0}
                            onChange={(r) => handleRate(msg.id, r)}
                            disabled={rateMessage.isPending}
                          />
                          {(rating?.rating || 0) >= 4 && !rating?.is_good_example && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleOpenPromote(msg.id, userQuestion, msg.content)}
                            >
                              <GraduationCap className="w-3 h-3 mr-1" />
                              Jadikan Contoh
                            </Button>
                          )}
                          {rating?.is_good_example && (
                            <Badge variant="secondary" className="text-xs">
                              ✓ Contoh Training
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadikan Contoh Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kategori</Label>
              <Select
                value={promoteData?.category || 'general'}
                onValueChange={(value) => setPromoteData(prev => prev ? { ...prev, category: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Umum</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="availability">Ketersediaan</SelectItem>
                  <SelectItem value="facilities">Fasilitas</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                  <SelectItem value="payment">Pembayaran</SelectItem>
                  <SelectItem value="location">Lokasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pertanyaan User</Label>
              <Textarea
                value={promoteData?.question || ''}
                onChange={(e) => setPromoteData(prev => prev ? { ...prev, question: e.target.value } : null)}
                rows={2}
              />
            </div>
            <div>
              <Label>Jawaban Bot (Ideal)</Label>
              <Textarea
                value={promoteData?.answer || ''}
                onChange={(e) => setPromoteData(prev => prev ? { ...prev, answer: e.target.value } : null)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handlePromote} disabled={promoteToExample.isPending}>
              {promoteToExample.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan sebagai Contoh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus percakapan dan semua pesan di dalamnya secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConversation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatLogsTab;
