"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

function encodeWav(pcm: Int16Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcm.length * 2;
  const headerSize = 44;
  const buf = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buf);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples
  const pcmView = new DataView(buf, 44);
  for (let i = 0; i < pcm.length; i++) {
    pcmView.setInt16(i * 2, pcm[i], true);
  }

  return buf;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function VoiceInput({ onAppend, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<string>(LANGS[0].code);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [processing, setProcessing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Int16Array[]>([]);
  const sampleCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    const ok = typeof navigator !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSupported(ok);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (levelRef.current) { clearInterval(levelRef.current); levelRef.current = null; }
    try { processorRef.current?.disconnect(); } catch { /* */ }
    processorRef.current = null;
    try { ctxRef.current?.close(); } catch { /* */ }
    ctxRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* */ }
    streamRef.current = null;
    chunksRef.current = [];
    sampleCountRef.current = 0;
  }, []);

  const sendToASR = useCallback(async () => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return;

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const wav = encodeWav(merged, 16000);
    const blob = new Blob([wav], { type: "audio/wav" });
    const form = new FormData();
    form.set("file", blob, "recording.wav");
    form.set("lang", lang);

    const res = await fetch("/api/voice/recognize?lang=" + encodeURIComponent(lang), {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "语音识别失败" }));
      throw new Error(err.error || "语音识别失败");
    }

    const data = await res.json();
    if (data.text) {
      onAppendRef.current(data.text);
    }
  }, [lang]);

  const stopListening = useCallback(async () => {
    // Stop audio capture first
    try { processorRef.current?.disconnect(); } catch { /* */ }
    processorRef.current = null;
    try { ctxRef.current?.close(); } catch { /* */ }
    ctxRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* */ }
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (levelRef.current) { clearInterval(levelRef.current); levelRef.current = null; }
    setListening(false);
    setElapsed(0);
    setLevel(0);

    // Send captured audio to ASR
    if (chunksRef.current.length > 0 && sampleCountRef.current > 8000) {
      setProcessing(true);
      try {
        await sendToASR();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "语音识别失败");
      } finally {
        setProcessing(false);
      }
    }

    chunksRef.current = [];
    sampleCountRef.current = 0;
  }, [sendToASR]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        chunksRef.current.push(pcm);
        sampleCountRef.current += input.length;

        // Calculate audio level
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += Math.abs(input[i]);
        setLevel(Math.min(1, (sum / input.length) * 5));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      setListening(true);
    } catch {
      toast.error("无法访问麦克风，请检查浏览器权限");
    }
  }, []);

  useEffect(() => () => {
    cleanup();
  }, [cleanup]);

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
            disabled={listening || processing || disabled}
            onClick={() => setLang(l.code)}
            className={`px-2 py-1 text-xs transition-colors border-r last:border-r-0 ${
              lang === l.code ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
            } ${(listening || processing || disabled) ? "opacity-50 cursor-not-allowed" : ""}`}
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100" onClick={stopListening}>
            <Square className="h-4 w-4" />
          </Button>
        </div>
      ) : processing ? (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          <span className="hidden sm:inline">识别中…</span>
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={startListening} disabled={disabled}>
          <Mic className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">语音输入</span>
        </Button>
      )}
    </div>
  );
}
