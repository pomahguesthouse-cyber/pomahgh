import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  language?: string;
  continuous?: boolean;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  error: string | null;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}): UseVoiceInputReturn => {
  const {
    onTranscript,
    onFinalTranscript,
    language = 'id-ID', // Indonesian by default
    continuous = false,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check if browser supports Web Speech API
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      console.log('Voice recognition started');
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Voice recognition ended');
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setError('Tidak ada suara terdeteksi. Silakan coba lagi.');
          break;
        case 'audio-capture':
          setError('Mikrofon tidak ditemukan. Pastikan mikrofon terhubung.');
          break;
        case 'not-allowed':
          setError('Izin mikrofon ditolak. Mohon izinkan akses mikrofon.');
          break;
        case 'network':
          setError('Terjadi kesalahan jaringan. Periksa koneksi internet.');
          break;
        default:
          setError(`Error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      
      if (onTranscript) {
        onTranscript(currentTranscript);
      }

      if (finalTranscript && onFinalTranscript) {
        onFinalTranscript(finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isSupported, language, continuous, onTranscript, onFinalTranscript]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Browser tidak mendukung voice input');
      return;
    }

    setTranscript('');
    setError(null);

    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      // Already started, ignore
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    error,
  };
};

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}












