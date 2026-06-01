"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputProps {
  onAppend: (text: string) => void;
  disabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

export function VoiceInput({ onAppend, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const intentionalStopRef = useRef(false);
  const interimRef = useRef("");
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    setSupported(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
  }, []);

  const getCtor = (): SpeechRecognitionInstance | null => {
    try {
      const w = window as unknown as Record<string, unknown>;
      const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
        | (new () => SpeechRecognitionInstance)
        | undefined;
      return Ctor ? new Ctor() : null;
    } catch {
      return null;
    }
  };

  const createHandlers = useCallback((rec: SpeechRecognitionInstance) => {
    rec.onresult = (event: {
      resultIndex: number;
      results: Array<Array<{ transcript: string }> & { isFinal: boolean }>;
    }) => {
      let newFinal = "";
      let currentInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinal += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }
      if (newFinal) {
        onAppendRef.current(newFinal);
        interimRef.current = "";
        setInterim("");
      } else {
        interimRef.current = currentInterim;
        setInterim(currentInterim);
      }
    };

    rec.onerror = () => {
      // onend always fires after, handle restart there
    };

    rec.onend = () => {
      // Flush remaining interim text
      if (interimRef.current) {
        onAppendRef.current(interimRef.current);
        interimRef.current = "";
        setInterim("");
      }

      if (intentionalStopRef.current) {
        intentionalStopRef.current = false;
        recognitionRef.current = null;
        setListening(false);
        return;
      }

      // Auto-restart after silence timeout
      const next = getCtor();
      if (!next) {
        recognitionRef.current = null;
        setListening(false);
        return;
      }
      next.lang = "zh-CN";
      next.interimResults = true;
      next.continuous = true;
      next.maxAlternatives = 1;
      createHandlers(next);
      recognitionRef.current = next;
      try { next.start(); } catch {
        recognitionRef.current = null;
        setListening(false);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    intentionalStopRef.current = false;
    const recognition = getCtor();
    if (!recognition) return;
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    createHandlers(recognition);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // already started
    }
  }, [createHandlers]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    interimRef.current = "";
    setListening(false);
    setInterim("");
  }, []);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  if (supported === null) {
    return (
      <Button variant="outline" size="sm" disabled>
        <MicOff className="h-4 w-4 mr-1" />
        检测中…
      </Button>
    );
  }

  if (!supported) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="浏览器不支持语音识别"
      >
        <MicOff className="h-4 w-4 mr-1" />
        请用 Chrome/Edge
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={listening ? "destructive" : "outline"}
        size="sm"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className="relative"
      >
        {listening ? (
          <>
            <span className="absolute -top-1 -right-1 h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <Mic className="h-4 w-4 mr-1" />
            停止录音
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 mr-1" />
            语音输入
          </>
        )}
      </Button>
      {listening && interim && (
        <span className="text-sm text-muted-foreground italic animate-pulse truncate max-w-md">
          {interim}
        </span>
      )}
    </div>
  );
}
