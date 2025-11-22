import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { AudioRecorder, encodeAudioForAPI, AudioQueue } from "@/utils/RealtimeAudio";
import { cn } from "@/lib/utils";

interface VoiceInterfaceProps {
  onTranscriptUpdate: (transcript: string, role: 'user' | 'assistant') => void;
  onSpeakingChange: (speaking: boolean) => void;
  primaryColor?: string;
}

const VoiceInterface = ({ onTranscriptUpdate, onSpeakingChange, primaryColor }: VoiceInterfaceProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);

      // Get project ID from env
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'pfvcezyxyaqolrerlwdo';
      const wsUrl = `wss://${projectId}.supabase.co/functions/v1/realtime-voice`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = async () => {
        console.log("[Voice] Connected to server");
        setIsConnected(true);
        
        toast({
          title: "Terhubung",
          description: "Percakapan suara dimulai. Silakan bicara...",
        });

        // Start recording
        recorderRef.current = new AudioRecorder((audioData) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const encoded = encodeAudioForAPI(audioData);
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded
            }));
          }
        });

        try {
          await recorderRef.current.start();
          setIsRecording(true);
        } catch (error) {
          console.error('Microphone error:', error);
          toast({
            title: "Error Mikrofon",
            description: "Tidak dapat mengakses mikrofon. Pastikan izin diberikan.",
            variant: "destructive",
          });
          disconnect();
        }
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("[Voice] Received:", data.type);

        if (data.type === 'response.audio.delta') {
          setIsSpeaking(true);
          onSpeakingChange(true);
          
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await audioQueueRef.current?.addToQueue(bytes);
        } 
        else if (data.type === 'response.audio.done') {
          setIsSpeaking(false);
          onSpeakingChange(false);
        }
        else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = data.transcript;
          setUserTranscript(transcript);
          onTranscriptUpdate(transcript, 'user');
        }
        else if (data.type === 'response.audio_transcript.delta') {
          setAssistantTranscript(prev => prev + data.delta);
        }
        else if (data.type === 'response.audio_transcript.done') {
          onTranscriptUpdate(assistantTranscript, 'assistant');
          setAssistantTranscript("");
        }
        else if (data.type === 'input_audio_buffer.speech_started') {
          setIsRecording(true);
          
          // Interrupt AI if currently speaking
          if (isSpeaking) {
            console.log("[Voice] User interrupted AI");
            audioQueueRef.current?.clear();
            
            // Send cancel event to OpenAI
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'response.cancel'
              }));
            }
            
            setIsSpeaking(false);
            onSpeakingChange(false);
          }
        }
        else if (data.type === 'input_audio_buffer.speech_stopped') {
          setIsRecording(false);
        }
        else if (data.type === 'error') {
          toast({
            title: "Error",
            description: data.error || "Terjadi kesalahan pada koneksi",
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("[Voice] WebSocket error:", error);
        toast({
          title: "Koneksi Error",
          description: "Gagal terhubung ke server suara",
          variant: "destructive",
        });
        disconnect();
      };

      wsRef.current.onclose = () => {
        console.log("[Voice] Connection closed");
        disconnect();
      };

    } catch (error) {
      console.error("[Voice] Connection error:", error);
      toast({
        title: "Gagal Terhubung",
        description: error instanceof Error ? error.message : "Tidak dapat memulai percakapan suara",
        variant: "destructive",
      });
    }
  };

  const toggleMute = () => {
    if (!recorderRef.current) return;
    
    if (isMuted) {
      recorderRef.current.resume();
      setIsMuted(false);
      toast({
        title: "Mikrofon Aktif",
        description: "Anda dapat berbicara kembali",
      });
    } else {
      recorderRef.current.pause();
      setIsMuted(true);
      toast({
        title: "Mikrofon Dimatikan",
        description: "Mikrofon sementara dimatikan",
      });
    }
  };

  const disconnect = () => {
    recorderRef.current?.stop();
    wsRef.current?.close();
    audioQueueRef.current?.clear();
    audioContextRef.current?.close();
    
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setIsMuted(false);
    setUserTranscript("");
    setAssistantTranscript("");
    
    wsRef.current = null;
    recorderRef.current = null;
    audioQueueRef.current = null;
    audioContextRef.current = null;
  };

  return (
    <div className="space-y-4">
      {/* Status Indicators */}
      <div className="flex flex-col items-center gap-2">
        {isConnected && (
          <>
            {isMuted && (
              <div className="px-3 py-1 bg-destructive text-destructive-foreground rounded-full text-xs font-medium">
                MIKROFON DIMATIKAN
              </div>
            )}
            <div className="flex items-center gap-4 text-sm">
              <div className={cn(
                "flex items-center gap-2",
                isMuted ? "text-muted-foreground" : isRecording && "text-primary"
              )}>
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : isRecording ? (
                  <Mic className="w-4 h-4 animate-pulse" />
                ) : (
                  <MicOff className="w-4 h-4 text-muted-foreground" />
                )}
                <span>
                  {isMuted ? "Muted" : isRecording ? "Mendengarkan..." : "Menunggu"}
                </span>
              </div>
              {isSpeaking && (
                <div className="flex items-center gap-2 text-primary">
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                    <div className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span>AI Berbicara...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Transcript Display */}
      {(userTranscript || assistantTranscript) && (
        <div className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
          {userTranscript && (
            <p><strong>Anda:</strong> {userTranscript}</p>
          )}
          {assistantTranscript && (
            <p><strong>AI:</strong> {assistantTranscript}</p>
          )}
        </div>
      )}

      {/* Call Control */}
      <div className="flex justify-center gap-3">
        {!isConnected ? (
          <Button 
            onClick={connect}
            size="lg"
            className="rounded-full w-16 h-16"
            style={{ backgroundColor: primaryColor }}
          >
            <Phone className="w-6 h-6 text-white" />
          </Button>
        ) : (
          <>
            <Button 
              onClick={toggleMute}
              size="lg"
              variant={isMuted ? "destructive" : "outline"}
              className="rounded-full w-14 h-14"
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            <Button 
              onClick={disconnect}
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {isConnected && (
        <p className="text-xs text-center text-muted-foreground">
          Bicara secara natural, AI akan merespons dengan suara
        </p>
      )}
    </div>
  );
};

export default VoiceInterface;
