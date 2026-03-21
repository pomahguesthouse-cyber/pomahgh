import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAITrainerCoach() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return;

      const userMsg: CoachMessage = { role: 'user', content: userMessage };
      const allMessages = [...messages, userMsg];
      setMessages([...allMessages]);
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Sesi login tidak valid. Silakan login ulang.');
        setIsLoading(false);
        return;
      }

      let assistantContent = '';

      try {
        abortRef.current = new AbortController();

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-trainer-coach`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 429) {
            toast.error('Terlalu banyak permintaan. Coba lagi nanti.');
          } else if (response.status === 402) {
            toast.error('Kredit AI habis. Silakan top up.');
          } else {
            toast.error(errData.error || 'Gagal menghubungi AI Coach');
          }
          setIsLoading(false);
          return;
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Append empty assistant message
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE data lines — the gateway returns "data: {...}\n\n" format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') break;
              try {
                const parsed = JSON.parse(raw);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  assistantContent += delta;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = { ...last, content: assistantContent };
                    }
                    return updated;
                  });
                }
              } catch {
                // non-JSON line (e.g. empty data: or comments) — skip
              }
            } else if (line.startsWith('event: error')) {
              // Will be handled in next line's data
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('AI Coach error:', err);
          toast.error('Gagal mengirim pesan ke AI Coach');
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, reset, stop };
}
