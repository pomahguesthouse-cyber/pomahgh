import { useState, useRef, useEffect } from 'react';
import { useAITrainerCoach } from '@/hooks/useAITrainerCoach';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bot, Send, Square, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Suggested prompts for quick access
const SUGGESTED_PROMPTS = [
  { label: 'Analisis kualitas data', prompt: 'Analisis kualitas data training yang ada sekarang. Apa kelemahan utamanya?' },
  { label: 'Generate 5 contoh booking', prompt: 'Bantu saya generate 5 contoh Q&A berkualitas tinggi untuk kategori booking kamar.' },
  { label: 'Temukan duplikat', prompt: 'Cek apakah ada pertanyaan yang terlalu mirip atau duplikat dalam data training saya.' },
  { label: 'Topik kurang terwakili', prompt: 'Topik atau kategori apa yang masih kurang dalam data training saya?' },
  { label: 'Tips data training', prompt: 'Berikan tips terbaik untuk membuat data training chatbot hotel yang efektif.' },
  { label: 'Review contoh ini', prompt: 'Tolong review dan berikan feedback untuk contoh training ini:\nQ: Berapa harga kamar?\nA: Harga kamar kami mulai dari Rp 300.000 per malam.' },
];

function MessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={cn('flex gap-3', role === 'user' ? 'justify-end' : 'justify-start')}>
      {role === 'assistant' && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
          role === 'user'
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
        )}
      >
        {content || <span className="italic text-muted-foreground">Mengetik…</span>}
      </div>
    </div>
  );
}

export function AITrainerCoachPanel() {
  const { messages, isLoading, sendMessage, reset, stop } = useAITrainerCoach();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggest = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full min-h-[520px] border rounded-xl overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">AI Trainer Coach</span>

        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-7 w-7"
          title="Mulai percakapan baru"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef as React.RefObject<HTMLDivElement>}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">AI Trainer Coach siap membantu</p>
              <p className="text-xs mt-1">Tanya tentang data training, minta generate contoh Q&amp;A, atau mintas saran perbaikan.</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium">Mulai dengan:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggest(s.prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} role={msg.role} content={msg.content} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya AI Coach... (Enter untuk kirim, Shift+Enter untuk baris baru)"
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              size="icon"
              variant="outline"
              onClick={stop}
              className="flex-shrink-0 h-10 w-10"
              title="Hentikan"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex-shrink-0 h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
