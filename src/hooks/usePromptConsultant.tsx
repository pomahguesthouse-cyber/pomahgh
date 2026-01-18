import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromptConsultantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const GREETING_MESSAGE: PromptConsultantMessage = {
  id: 'greeting',
  role: 'assistant',
  content: `Halo! 👋 Saya adalah **Prompt Engineering Consultant**.

Saya akan membantu Anda menulis prompt yang **efisien dan efektif** untuk Lovable AI.

**Anda bisa bertanya tentang:**
- 📝 Cara menulis prompt untuk fitur tertentu
- 🔍 Review dan optimasi prompt yang sudah ada
- 💡 Tips menghemat token
- 📌 Rekomendasi template yang sesuai

Silakan ketik pertanyaan Anda atau paste prompt yang ingin direview!`,
  timestamp: new Date()
};

export const usePromptConsultant = () => {
  const [messages, setMessages] = useState<PromptConsultantMessage[]>([GREETING_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMessage: PromptConsultantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare history (exclude greeting)
    const history = messages
      .filter(m => m.id !== 'greeting')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-consultant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            message: content.trim(),
            history
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage: PromptConsultantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullContent += content;
                  setMessages(prev => 
                    prev.map(m => 
                      m.id === assistantMessage.id 
                        ? { ...m, content: fullContent }
                        : m
                    )
                  );
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Prompt consultant error:', error);
      toast.error('Gagal mengirim pesan. Silakan coba lagi.');
      
      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Maaf, terjadi kesalahan. Silakan coba lagi.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([GREETING_MESSAGE]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat
  };
};
