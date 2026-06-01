"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square } from "lucide-react";

interface VoiceInputProps {
  onAppend: (text: string) => void;
  disabled?: boolean;
}

const LANGS = [
  { code: "zh-CN", label: "普通话", short: "普" },
  { code: "zh-HK", label: "广东话", short: "粤" },
  { code: "en-US", label: "English", short: "EN" },
] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

export function VoiceInput({ onAppend, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<string>(LANGS[0].code);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [interim, setInterim] = useState("");

  const recRef = useRef<SR | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    const ok = typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSupported(ok);
  }, []);

  const getCtor = (): SR | null => {
    try {
      const w = window as unknown as Record<string, unknown>;
      const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SR) | undefined;
      return Ctor ? new Ctor() : null;
    } catch { return null; }
  };

  const stopAll = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (levelRef.current) { clearInterval(levelRef.current); levelRef.current = null; }
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* */ }
      recRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    stopAll();
    setListening(false);
    setElapsed(0);
    setLevel(0);
    setInterim("");
  }, [stopAll]);

  const createHandlers = useCallback((rec: SR) => {
    rec.onresult = (event: {
      resultIndex: number;
      results: Array<Array<{ transcript: string }> & { isFinal: boolean }>;
    }) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) { finalText += r[0].transcript; }
        else { interimText += r[0].transcript; }
      }
      if (finalText) { onAppendRef.current(finalText); setInterim(""); }
      else { setInterim(interimText); }
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.error("[Speech]", e.error);
    };

    rec.onend = () => {
      if (recRef.current === rec) {
        recRef.current = null;
        stopAll();
        setListening(false);
        setElapsed(0);
        setLevel(0);
        // Flush any remaining interim on natural end
        setInterim("");
      }
    };
  }, [stopAll]);

  const startListening = useCallback(() => {
    const rec = getCtor();
    if (!rec) return;

    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    createHandlers(rec);
    recRef.current = rec;

    try { rec.start(); } catch { /* already started */ }

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);

    // Simulated audio level animation
    levelRef.current = setInterval(() => {
      setLevel(0.2 + Math.random() * 0.8);
    }, 120);

    setListening(true);
  }, [lang, createHandlers]);

  // Cleanup on unmount
  useEffect(() => () => stopAll(), [stopAll]);

  if (supported === null) {
    return <Button variant="outline" size="sm" disabled><MicOff className="h-4 w-4 mr-1" />检测中…</Button>;
  }
  if (!supported) {
    return <Button variant="outline" size="sm" disabled><MicOff className="h-4 w-4 mr-1" />不支持</Button>;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Language selector */}
      <div className="flex rounded-md border border-input bg-background overflow-hidden flex-shrink-0">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            disabled={listening || disabled}
            onClick={() => setLang(l.code)}
            className={`px-2 py-1 text-xs transition-colors border-r last:border-r-0 ${
              lang === l.code ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
            } ${(listening || disabled) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="hidden sm:inline">{l.label}</span>
            <span className="sm:hidden">{l.short}</span>
          </button>
        ))}
      </div>

      {/* Recording indicator */}
      {listening ? (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5">
          <div className="flex items-end gap-0.5 h-5">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((t, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-100"
                style={{
                  height: `${8 + (level > t ? 12 : 0)}px`,
                  backgroundColor: level > t ? "#ef4444" : "#fca5a5",
                }}
              />
            ))}
          </div>
          <span className="text-sm font-mono font-medium text-red-600 tabular-nums min-w-[40px]">
            {formatTime(elapsed)}
          </span>
          {interim && (
            <span className="text-xs text-red-400 italic truncate max-w-[140px] sm:max-w-[240px]">
              {interim}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100" onClick={stopListening}>
            <Square className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={startListening} disabled={disabled}>
          <Mic className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">语音输入</span>
        </Button>
      )}
    </div>
  );
}
