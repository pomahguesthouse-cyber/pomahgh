import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Conversation context extracted from chat for continuity
interface ConversationContext {
  guest_name: string | null;
  preferred_room: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  guest_count: number | null;
  phone_number: string | null;
  email: string | null;
}

const DEFAULT_CONTEXT: ConversationContext = {
  guest_name: null,
  preferred_room: null,
  check_in_date: null,
  check_out_date: null,
  guest_count: null,
  phone_number: null,
  email: null
};

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
  
  // Session management for logging
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const conversationIdRef = useRef<string | null>(null);
  
  // Conversation context for continuity (reduces need to re-extract info)
  const [conversationContext, setConversationContext] = useState<ConversationContext>(DEFAULT_CONTEXT);

  // Extract context from AI responses to maintain continuity
  const extractContext = (content: string, currentContext: ConversationContext): ConversationContext => {
    const updated = { ...currentContext };
    
    // Extract room preferences
    const roomMatch = content.match(/(?:kamar|room|tipe)\s*(Single|Deluxe|Grand Deluxe|Family Suite|Villa)/i);
    if (roomMatch) {
      updated.preferred_room = roomMatch[1];
    }
    
    // Extract dates (Indonesian format)
    const dateMatch = content.match(/(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})?/gi);
    if (dateMatch && dateMatch.length >= 1) {
      if (!updated.check_in_date) updated.check_in_date = dateMatch[0];
      if (dateMatch.length >= 2 && !updated.check_out_date) updated.check_out_date = dateMatch[1];
    }
    
    // Extract guest count
    const guestMatch = content.match(/(\d+)\s*(?:orang|tamu|guest)/i);
    if (guestMatch) {
      updated.guest_count = parseInt(guestMatch[1], 10);
    }
    
    // Extract name (from booking confirmations)
    const nameMatch = content.match(/(?:atas nama|nama tamu|nama:?)\s*([A-Za-z\s]+?)(?:\.|,|untuk|\n)/i);
    if (nameMatch) {
      updated.guest_name = nameMatch[1].trim();
    }
    
    return updated;
  };

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
  const logMessage = async (role: string, content: string) => {
    if (!conversationIdRef.current) return;

    try {
      await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationIdRef.current,
          role,
          content
        });

      // Update message count
      const currentCount = messages.length + (role === 'assistant' ? 2 : 1);
      await supabase
        .from("chat_conversations")
        .update({ message_count: currentCount })
        .eq("id", conversationIdRef.current);
    } catch (err) {
      console.error("Error logging message:", err);
    }
  };

  // Update booking created flag
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
    } catch (err) {
      console.error("Error marking booking created:", err);
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
        setConversationContext(prev => extractContext(finalContent, prev));
        
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
        setConversationContext(prev => extractContext(assistantContent, prev));
        
        // Log assistant message
        await logMessage('assistant', assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorContent = 'Maaf, terjadi kesalahan. Silakan coba lagi.';
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
    // Mark conversation as ended
    if (conversationIdRef.current) {
      try {
        await supabase
          .from("chat_conversations")
          .update({ ended_at: new Date().toISOString() })
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












