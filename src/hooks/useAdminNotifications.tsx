import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, AlertCircle, MessageCircle } from "lucide-react";

// Function to play notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification tone
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1); // Higher pitch
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2); // Back to A5
    
    oscillator.type = 'sine';
    
    // Fade in and out for smoother sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();
  const audioInitialized = useRef(false);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioInitialized.current) {
        audioInitialized.current = true;
        // Create and immediately close a context to "warm up" audio
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctx.close();
        } catch (e) {
          // Ignore errors
        }
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  useEffect(() => {
    // Subscribe to failed sync logs
    const syncLogsChannel = supabase
      .channel('sync-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'availability_sync_logs',
          filter: 'success=eq.false'
        },
        (payload) => {
          console.log('Failed sync detected:', payload);
          toast.error("Sync Failed", {
            description: `Channel manager sync failed: ${payload.new.error_message || 'Unknown error'}`,
            icon: <AlertCircle className="h-4 w-4" />,
            duration: 10000,
          });
          queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
        }
      )
      .subscribe();

    // Subscribe to new bookings
    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('New booking detected:', payload);
          toast.success("New Booking!", {
            description: `${payload.new.guest_name} - ${payload.new.room_id}`,
            icon: <Bell className="h-4 w-4" />,
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
        }
      )
      .subscribe();

    // Subscribe to new WhatsApp messages (user messages only)
    const whatsappMessagesChannel = supabase
      .channel('whatsapp-messages-notify')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'role=eq.user'
        },
        async (payload) => {
          console.log('New chat message detected:', payload);
          
          // Check if this message is from a WhatsApp session
          const conversationId = payload.new.conversation_id;
          if (!conversationId) return;

          const { data: session } = await supabase
            .from('whatsapp_sessions')
            .select('phone_number')
            .eq('conversation_id', conversationId)
            .single();

          // Only show notification for WhatsApp messages
          if (session?.phone_number) {
            // Play notification sound
            playNotificationSound();
            
            const messagePreview = payload.new.content?.substring(0, 50) || '';
            const truncated = payload.new.content?.length > 50 ? '...' : '';
            
            toast.info("WhatsApp Baru", {
              description: `📱 ${session.phone_number}: "${messagePreview}${truncated}"`,
              icon: <MessageCircle className="h-4 w-4 text-green-500" />,
              duration: 8000,
            });

            // Invalidate WhatsApp-related queries
            queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
            queryClient.invalidateQueries({ queryKey: ["whatsapp-stats"] });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(syncLogsChannel);
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(whatsappMessagesChannel);
    };
  }, [queryClient]);
};
