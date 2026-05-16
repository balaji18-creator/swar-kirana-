import { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../types';

const ERROR_MESSAGES: Record<string, Record<Language, string>> = {
  'not-allowed': {
    'hi-IN': 'Mic ka permission nahi mila.',
    'te-IN': 'Mic permission ledu.',
    'en-IN': 'Microphone permission denied.',
  },
  'no-speech': {
    'hi-IN': 'Kuch sunai nahi diya, dobara boliye.',
    'te-IN': 'Emee vanapadaledu, malli cheppandi.',
    'en-IN': 'No speech detected. Please try again.',
  },
  'network': {
    'hi-IN': 'Network error. Internet check karo.',
    'te-IN': 'Network error. Internet check cheyyandi.',
    'en-IN': 'Network error. Check your internet connection.',
  },
  'browser': {
    'hi-IN': 'Yeh browser support nahi karta. Chrome use karo.',
    'te-IN': 'Browser support ledu. Chrome vadandi.',
    'en-IN': 'Browser not supported. Please use Chrome.',
  },
};

const getSilenceTimeout = (language: Language) =>
  language === 'en-IN' ? 4000 : 5000; // Hindi/Telugu may have longer pauses

export const useVoiceRecognition = (language: Language) => {
  const [isListening,   setIsListening]   = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [interimText,   setInterimText]   = useState('');
  const [error,         setError]         = useState<string | null>(null);

  const recognitionRef  = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef    = useRef('');

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(ERROR_MESSAGES['browser'][language]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous     = true;   // keep listening until we stop
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      finalTextRef.current = '';
    };

    recognition.onresult = (event: any) => {
      clearSilenceTimer();

      let interim = '';
      let final   = finalTextRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      finalTextRef.current = final;
      setInterimText(interim);

      // Auto-stop after silence
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
      }, getSilenceTimeout(language));
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      setInterimText('');
      const finalResult = finalTextRef.current.trim();
      if (finalResult) setTranscript(finalResult);
    };

    recognition.onerror = (event: any) => {
      clearSilenceTimer();
      setIsListening(false);
      const msg = ERROR_MESSAGES[event.error]?.[language]
        ?? `Speech error: ${event.error}`;
      // no-speech is not a real error — just restart silently
      if (event.error !== 'no-speech') setError(msg);
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      try { recognition.abort(); } catch {}
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript('');
    setInterimText('');
    setError(null);
    finalTextRef.current = '';
    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  }, [isListening, language]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
  }, [isListening]);

  return {
    isListening,
    transcript,
    interimText,
    startListening,
    stopListening,
    error,
    setTranscript,
  };
};
