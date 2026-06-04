"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface VoiceInputProps {
  onAppend: (text: string) => void;
  disabled?: boolean;
  /** Report recording state changes for global recording bar */
  onRecordingChange?: (recording: boolean) => void;
  /** Expose audio level for external visualization */
  onAudioLevel?: (level: number) => void;
  /** Expose stop function so external components can stop recording */
  stopRef?: React.MutableRefObject<(() => void) | null>;
  /** Hide UI when not the active step (recording continues) */
  visible?: boolean;
  /** Report elapsed time for global recording bar */
  onElapsed?: (elapsed: number) => void;
  /** Report language changes for global recording bar */
  onLangChange?: (lang: string) => void;
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
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length * 2;
  const headerSize = 44;
  const buf = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buf);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

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

export function VoiceInput({
  onAppend,
  disabled,
  onRecordingChange,
  onAudioLevel,
  stopRef,
  visible = true,
  onElapsed,
  onLangChange,
}: VoiceInputProps) {
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
  const onRecordingChangeRef = useRef(onRecordingChange);
  const onAudioLevelRef = useRef(onAudioLevel);
  const onElapsedRef = useRef(onElapsed);
  const onLangChangeRef = useRef(onLangChange);
  onAppendRef.current = onAppend;
  onRecordingChangeRef.current = onRecordingChange;
  onAudioLevelRef.current = onAudioLevel;
  onElapsedRef.current = onElapsed;
  onLangChangeRef.current = onLangChange;

  const notifyRecording = useCallback((rec: boolean) => {
    onRecordingChangeRef.current?.(rec);
  }, []);

  const notifyLevel = useCallback((lvl: number) => {
    onAudioLevelRef.current?.(lvl);
  }, []);

  // Sync language to store (use ref to avoid re-fire on callback identity change)
  useEffect(() => { onLangChangeRef.current?.(lang); }, [lang]);

  useEffect(() => {
    const ok =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setSupported(ok);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (levelRef.current) {
      clearInterval(levelRef.current);
      levelRef.current = null;
    }
    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
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

    const res = await fetch(
      "/api/voice/recognize?lang=" + encodeURIComponent(lang),
      { method: "POST", body: form }
    );

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: "语音识别失败" }));
      throw new Error(err.error || "语音识别失败");
    }

    const data = await res.json();
    if (data.text) {
      onAppendRef.current(data.text);
    }
  }, [lang]);

  const stopListening = useCallback(async () => {
    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (levelRef.current) {
      clearInterval(levelRef.current);
      levelRef.current = null;
    }
    setListening(false);
    notifyRecording(false);
    setElapsed(0);
    setLevel(0);
    notifyLevel(0);

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
  }, [sendToASR, notifyRecording, notifyLevel]);

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

        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += Math.abs(input[i]);
        const lvl = Math.min(1, (sum / input.length) * 5);
        setLevel(lvl);
        notifyLevel(lvl);
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(secs);
        onElapsedRef.current?.(secs);
      }, 100);

      setListening(true);
      notifyRecording(true);
    } catch {
      toast.error("无法访问麦克风，请检查浏览器权限");
    }
  }, [notifyRecording, notifyLevel]);

  useEffect(() => () => cleanup(), [cleanup]);

  // Expose stop function for global recording bar
  useEffect(() => {
    if (stopRef) stopRef.current = stopListening;
  }, [stopRef, stopListening]);

  // Hidden mode: suppress UI, recording continues in background
  if (!visible) return null;
  if (supported === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">检测麦克风…</p>
      </div>
    );
  }
  if (!supported) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
          <MicOff className="h-10 w-10 text-destructive" />
        </div>
        <p className="text-sm text-destructive">不支持麦克风</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Language selector — compact row above the big button */}
      <div className="flex rounded-lg border border-input bg-background overflow-hidden shadow-sm">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            disabled={listening || processing || disabled}
            onClick={() => setLang(l.code)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border-r last:border-r-0 ${
              lang === l.code
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground"
            } ${listening || processing || disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Main recording area */}
      {listening ? (
        <div className="flex flex-col items-center gap-4">
          {/* Big red recording button with ripple */}
          <div className="relative">
            {/* Ripple rings */}
            <div className="absolute inset-0 w-28 h-28 -translate-x-2 -translate-y-2">
              <div className="w-28 h-28 rounded-full bg-red-500/20 animate-[ping_1.5s_ease-in-out_infinite]" />
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-red-400/15 animate-[ping_2s_ease-in-out_infinite_0.3s]" />
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/40 transition-transform active:scale-95"
            >
              <Square className="h-8 w-8 text-white" />
            </button>
          </div>

          {/* Audio level bars — taller visualization */}
          <div className="flex items-end gap-1 h-12">
            {[0.15, 0.3, 0.5, 0.65, 0.85, 1.0].map((t, i) => (
              <div
                key={i}
                className="w-2 rounded-full transition-all duration-75"
                style={{
                  height: `${6 + (level > t ? 30 : 6)}px`,
                  backgroundColor:
                    level > t
                      ? level > 0.7
                        ? i > 3
                          ? "#ef4444"
                          : "#f97316"
                        : "#f59e0b"
                      : "#d1d5db",
                }}
              />
            ))}
          </div>

          {/* Timer — large prominent display */}
          <div className="text-3xl font-mono font-bold text-red-600 tabular-nums tracking-wider">
            {formatTime(elapsed)}
          </div>

          <p className="text-sm text-muted-foreground">点击红色按钮停止录音</p>
        </div>
      ) : processing ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <div className="text-xl font-semibold text-primary animate-pulse">
            识别中…
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Large idle mic button with breathing pulse */}
          <div className="relative">
            <div className="absolute inset-0 w-24 h-24 -translate-x-4 -translate-y-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 animate-[ping_3s_ease-in-out_infinite]" />
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/5 animate-[ping_3.5s_ease-in-out_infinite_0.5s]" />
            </div>
            <button
              type="button"
              onClick={startListening}
              disabled={disabled}
              className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="h-10 w-10 text-primary-foreground" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              点击开始录音
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              使用普通话/广东话进行医患对话录音
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
