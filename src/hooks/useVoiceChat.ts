import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VoiceChatState = "idle" | "listening" | "processing" | "speaking";

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

export const useVoiceChat = () => {
  const [state, setState] = useState<VoiceChatState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);

  // Messages history for chatbot context
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const playTTS = useCallback(async (text: string) => {
    try {
      setState("speaking");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit tercapai, coba lagi nanti.");
          return;
        }
        if (response.status === 402) {
          toast.error("Credit ElevenLabs habis.");
          return;
        }
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setState("idle");
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          setState("idle");
          resolve();
        };
        audio.play().catch(() => {
          setState("idle");
          resolve();
        });
      });
    } catch (error) {
      console.error("TTS error:", error);
      setState("idle");
      toast.error("Gagal memutar audio. Jawaban ditampilkan sebagai teks.");
    }
  }, []);

  const sendToChatbot = useCallback(async (userText: string) => {
    setState("processing");

    // Add user message to history
    messagesRef.current.push({ role: "user", content: userText });
    setTranscripts((prev) => [...prev, { role: "user", text: userText }]);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: {
          messages: messagesRef.current,
        },
      });

      if (error) throw error;

      const aiMessage = data.choices[0].message;

      // Handle tool calls
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        const toolCall = aiMessage.tool_calls[0];

        const { data: toolResult, error: toolError } =
          await supabase.functions.invoke("chatbot-tools", {
            body: {
              tool_name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments),
            },
          });

        if (toolError) throw toolError;

        // Send tool result back for final response
        const { data: finalResponse, error: finalError } =
          await supabase.functions.invoke("chatbot", {
            body: {
              messages: [
                ...messagesRef.current,
                aiMessage,
                {
                  role: "tool",
                  content: JSON.stringify(toolResult),
                  tool_call_id: toolCall.id,
                },
              ],
            },
          });

        if (finalError) throw finalError;

        const finalContent = finalResponse.choices[0].message.content;
        messagesRef.current.push({ role: "assistant", content: finalContent });
        setTranscripts((prev) => [
          ...prev,
          { role: "assistant", text: finalContent },
        ]);

        // Play TTS
        await playTTS(finalContent);
      } else {
        const assistantContent = aiMessage.content;
        messagesRef.current.push({
          role: "assistant",
          content: assistantContent,
        });
        setTranscripts((prev) => [
          ...prev,
          { role: "assistant", text: assistantContent },
        ]);

        // Play TTS
        await playTTS(assistantContent);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMsg = "Maaf, terjadi kesalahan. Silakan coba lagi.";
      setTranscripts((prev) => [
        ...prev,
        { role: "assistant", text: errorMsg },
      ]);
      setState("idle");
      toast.error("Gagal memproses pesan");
    }
  }, [playTTS]);

  const startListening = useCallback(async () => {
    try {
      stopAudio();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Only process if there's meaningful audio
        if (audioBlob.size > 1000) {
          setState("processing");
          setPartialTranscript("");

          try {
            // Use ElevenLabs batch STT for the recorded audio
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
              {
                method: "POST",
                headers: {
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: formData,
              }
            );

            if (!response.ok) {
              throw new Error(`STT failed: ${response.status}`);
            }

            const result = await response.json();
            const transcribedText = result.text?.trim();

            if (transcribedText) {
              await sendToChatbot(transcribedText);
            } else {
              setState("idle");
              toast.info("Tidak terdeteksi suara. Coba bicara lebih jelas.");
            }
          } catch (error) {
            console.error("STT error:", error);
            setState("idle");
            toast.error("Gagal mengenali suara. Coba lagi.");
          }
        } else {
          setState("idle");
        }
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      isRecordingRef.current = true;
      setState("listening");
      setIsConnected(true);
      setPartialTranscript("Mendengarkan...");
    } catch (error) {
      console.error("Microphone error:", error);
      setState("idle");
      toast.error("Izin mikrofon diperlukan untuk voice chat.", {
        description: "Silakan aktifkan akses mikrofon di pengaturan browser.",
      });
    }
  }, [stopAudio, sendToChatbot]);

  const stopListening = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setPartialTranscript("");
  }, []);

  const disconnect = useCallback(() => {
    stopListening();
    stopAudio();
    setState("idle");
    setIsConnected(false);
    setTranscripts([]);
    setPartialTranscript("");
    messagesRef.current = [];
  }, [stopListening, stopAudio]);

  return {
    state,
    transcripts,
    partialTranscript,
    isConnected,
    startListening,
    stopListening,
    disconnect,
    stopAudio,
  };
};
