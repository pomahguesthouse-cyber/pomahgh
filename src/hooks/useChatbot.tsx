import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import type { ChatbotSettingsFormData } from "@/types/chatbot-settings.types";
import type { ChatMessage as Message, ConversationContext } from "@/features/chatbot/types";
import { DEFAULT_CONTEXT, extractConversationContext } from "@/features/chatbot/services/contextExtractor";
import { buildAutoTrainingInserts } from "@/features/chatbot/services/trainingExampleSelector";
import { getChatErrorMessage } from "@/features/chatbot/services/errorMessage";

interface ChatbotResponse {
  choices: Array<{ message: { role: string; content: string; tool_calls?: unknown[] } }>;
  meta?: {
    booking_created: boolean;
    booking_guest_email: string | null;
    tool_calls_used: string[];
  };
  fallback?: boolean;
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
    mutationFn: async (settings: Partial<ChatbotSettingsFormData> & { id: string }) => {
      const { id, ...updateData } = settings;
      const { data, error } = await supabase
        .from("chatbot_settings")
        .update(updateData)
        .eq("id", id)
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
  
  // Session management for logging
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const conversationIdRef = useRef<string | null>(null);
  const fallbackCountRef = useRef<number>(0);
  const conversationStartRef = useRef<number>(Date.now());
  
  // Message queue to prevent race conditions when user sends messages rapidly
  const messageQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  // Mutable ref for latest messages to avoid stale closure
  const messagesRef = useRef<Message[]>([]);
  
  // Conversation context for continuity (reduces need to re-extract info)
  const [conversationContext, setConversationContext] = useState<ConversationContext>(DEFAULT_CONTEXT);

  // Start a new conversation in database
  const startConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({ session_id: sessionIdRef.current })
        .select()
        .single();

      if (error) {
        console.error("Failed to start conversation:", error);
        return null;
      }
      
      conversationIdRef.current = data.id;
      return data.id;
    } catch (err) {
      console.error("Error starting conversation:", err);
      return null;
    }
  };

  // Log a message to database
  const logMessage = async (role: string, content: string, isFallback: boolean = false, toolCalls: string[] = []) => {
    if (!conversationIdRef.current) return;

    try {
      await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationIdRef.current,
          role,
          content,
          is_fallback: isFallback,
          tool_calls_used: toolCalls.length > 0 ? toolCalls : null
        });

      // Update message count
      const currentCount = messages.length + (role === 'assistant' ? 2 : 1);
      await supabase
        .from("chat_conversations")
        .update({ 
          message_count: currentCount,
          last_user_message: role === 'user' ? content.substring(0, 200) : null
        })
        .eq("id", conversationIdRef.current);

      // Track fallback count
      if (isFallback && role === 'assistant') {
        fallbackCountRef.current += 1;
        await supabase
          .from("chat_conversations")
          .update({ fallback_count: fallbackCountRef.current })
          .eq("id", conversationIdRef.current);
      }
    } catch (err) {
      console.error("Error logging message:", err);
    }
  };

  // Update booking created flag and auto-promote to training
  const markBookingCreated = async (guestEmail?: string) => {
    if (!conversationIdRef.current) return;

    try {
      await supabase
        .from("chat_conversations")
        .update({ 
          booking_created: true,
          guest_email: guestEmail || null
        })
        .eq("id", conversationIdRef.current);

      // Auto-training: promote successful conversation to training examples
      await autoPromoteToTraining();
    } catch (err) {
      console.error("Error marking booking created:", err);
    }
  };

  // Auto-promote good conversations to training examples
  const autoPromoteToTraining = async () => {
    if (!conversationIdRef.current) return;

    try {
      // Get all messages from this conversation
      const { data: chatMessages } = await supabase
        .from("chat_messages")
        .select("content, role")
        .eq("conversation_id", conversationIdRef.current)
        .order("created_at", { ascending: true });

      if (!chatMessages || chatMessages.length < 2) return;

      const inserts = buildAutoTrainingInserts(chatMessages, 3);

      for (const example of inserts) {
        const { error: insertError } = await supabase
          .from("chatbot_training_examples")
          .insert(example);

        if (!insertError) {
          // Training example auto-promoted
        }
      }

      // Mark conversation as analyzed for training
      await supabase
        .from("chat_conversations")
        .update({ analyzed_for_training: true })
        .eq("id", conversationIdRef.current);

    } catch (err) {
      console.error("Error auto-promoting to training:", err);
    }
  };

  // Internal: process a single message (must be called sequentially)
  const processMessage = async (userMessage: string) => {
    if (!settings) return;

    // Start conversation if this is the first message
    if (!conversationIdRef.current) {
      await startConversation();
    }

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // Use ref for latest messages to avoid stale closure
    const updatedMessages = [...messagesRef.current, newUserMessage];
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);
    setIsLoading(true);

    // Log user message
    await logMessage('user', userMessage);

    try {
      const { data: rawChatResponse, error: chatError } = await supabase.functions.invoke('chatbot', {
        body: {
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          chatbotSettings: settings,
          conversationContext
        }
      });

      if (chatError) throw chatError;

      const chatResponse = rawChatResponse as ChatbotResponse;
      const isFallbackResponse = chatResponse?.fallback === true;
      
      if (isFallbackResponse) {
        fallbackCountRef.current += 1;
      }

      const assistantContent = chatResponse?.choices?.[0]?.message?.content || "Maaf, saya tidak bisa memproses permintaan ini saat ini.";
      const bookingCreated = Boolean(chatResponse?.meta?.booking_created);
      const bookingGuestEmail = chatResponse?.meta?.booking_guest_email ?? undefined;
      const toolCallsUsed = chatResponse?.meta?.tool_calls_used ?? [];

      if (bookingCreated) {
        await markBookingCreated(bookingGuestEmail);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };

      const withAssistant = [...messagesRef.current, assistantMessage];
      messagesRef.current = withAssistant;
      setMessages(withAssistant);
      
      setConversationContext(prev => extractConversationContext(assistantContent, prev));
      await logMessage('assistant', assistantContent, isFallbackResponse, toolCallsUsed);
    } catch (error) {
      console.error("Chat error:", error);
      const errorContent = getChatErrorMessage(error);
      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      const withError = [...messagesRef.current, errorMessage];
      messagesRef.current = withError;
      setMessages(withError);
      
      await logMessage('assistant', errorContent);
      toast.error("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setIsLoading(false);
    }
  };

  // Process queued messages sequentially
  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (messageQueueRef.current.length > 0) {
      const nextMessage = messageQueueRef.current.shift()!;
      await processMessage(nextMessage);
    }

    isProcessingRef.current = false;
  };

  // Public: enqueue message and process
  const sendMessage = async (userMessage: string) => {
    messageQueueRef.current.push(userMessage);
    await processQueue();
  };

  const clearChat = async () => {
    // Mark conversation as ended with duration
    if (conversationIdRef.current) {
      try {
        const durationSeconds = Math.round((Date.now() - conversationStartRef.current) / 1000);
        await supabase
          .from("chat_conversations")
          .update({ 
            ended_at: new Date().toISOString(),
            conversation_duration_seconds: durationSeconds,
            fallback_count: fallbackCountRef.current
          })
          .eq("id", conversationIdRef.current);
      } catch (err) {
        console.error("Error ending conversation:", err);
      }
    }

    // Reset state
    setMessages([]);
    messagesRef.current = [];
    messageQueueRef.current = [];
    setConversationContext(DEFAULT_CONTEXT);
    conversationIdRef.current = null;
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    fallbackCountRef.current = 0;
    conversationStartRef.current = Date.now();
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    settings,
    conversationContext // Expose for debugging/display if needed
  };
};
