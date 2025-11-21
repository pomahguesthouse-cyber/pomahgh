import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useChatbotSettings = () => {
  return useQuery({
    queryKey: ["chatbot-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateChatbotSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: any) => {
      const { data, error } = await supabase
        .from("chatbot_settings")
        .update(settings)
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-settings"] });
      toast.success("Pengaturan chatbot berhasil disimpan!");
    },
    onError: (error: Error) => {
      toast.error("Gagal menyimpan pengaturan", {
        description: error.message,
      });
    },
  });
};

export const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: settings } = useChatbotSettings();

  const sendMessage = async (userMessage: string) => {
    if (!settings) return;

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // First, call the main chatbot function
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chatbot', {
        body: {
          messages: [...messages, newUserMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          chatbotSettings: settings
        }
      });

      if (chatError) throw chatError;

      const aiMessage = chatResponse.choices[0].message;

      // Check if AI wants to call a tool
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        const toolCall = aiMessage.tool_calls[0];
        
        // Execute the tool
        const { data: toolResult, error: toolError } = await supabase.functions.invoke('chatbot-tools', {
          body: {
            tool_name: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments)
          }
        });

        if (toolError) throw toolError;

        // Send tool result back to AI for final response
        const { data: finalResponse, error: finalError } = await supabase.functions.invoke('chatbot', {
          body: {
            messages: [
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage },
              aiMessage,
              {
                role: 'tool',
                content: JSON.stringify(toolResult),
                tool_call_id: toolCall.id
              }
            ],
            chatbotSettings: settings
          }
        });

        if (finalError) throw finalError;

        const finalMessage: Message = {
          role: 'assistant',
          content: finalResponse.choices[0].message.content,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, finalMessage]);
      } else {
        // Direct response without tool
        const assistantMessage: Message = {
          role: 'assistant',
          content: aiMessage.content,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    settings
  };
};
