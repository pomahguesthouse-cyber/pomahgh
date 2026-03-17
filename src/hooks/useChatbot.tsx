import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import type { ChatbotSettingsFormData } from "@/types/chatbot-settings.types";
import type { ChatMessage as Message, ConversationContext } from "@/features/chatbot/types";
import { DEFAULT_CONTEXT, extractConversationContext } from "@/features/chatbot/services/contextExtractor";
import { buildAutoTrainingInserts } from "@/features/chatbot/services/trainingExampleSelector";
import { getChatErrorMessage } from "@/features/chatbot/services/errorMessage";

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
          console.log("Auto-promoted training example:", example.question.substring(0, 30) + "...");
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

  const sendMessage = async (userMessage: string) => {
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

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    // Log user message
    await logMessage('user', userMessage);

    try {
      // First, call the main chatbot function with conversation context
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chatbot', {
        body: {
          messages: [...messages, newUserMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          chatbotSettings: settings,
          conversationContext // Pass context for continuity
        }
      });

      if (chatError) throw chatError;

      // Check for fallback response from edge function
      const isFallbackResponse = (chatResponse as any)?.fallback === true;
      
      if (isFallbackResponse) {
        fallbackCountRef.current += 1;
      }

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

        // Check if a booking was created
        if (toolCall.function.name === 'create_booking_draft' && toolResult?.success) {
          await markBookingCreated(toolResult.booking?.guest_email);
        }

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

        const finalContent = finalResponse.choices[0].message.content;
        const finalMessage: Message = {
          role: 'assistant',
          content: finalContent,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, finalMessage]);
        
        // Extract and update context from response
        setConversationContext(prev => extractConversationContext(finalContent, prev));
        
        // Log assistant message
        await logMessage('assistant', finalContent);
      } else {
        // Direct response without tool
        const assistantContent = aiMessage.content;
        const assistantMessage: Message = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Extract and update context from response
        setConversationContext(prev => extractConversationContext(assistantContent, prev));
        
        // Log assistant message
        await logMessage('assistant', assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorContent = getChatErrorMessage(error);
      const errorMessage: Message = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Log error message
      await logMessage('assistant', errorContent);
      
      toast.error("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setIsLoading(false);
    }
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
