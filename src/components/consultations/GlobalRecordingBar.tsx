"use client";

import { Square } from "lucide-react";

export interface GlobalRecordingBarProps {
  elapsed: number;
  audioLevel: number;
  lang: string;
  onStop: () => void;
}

const LANG_LABELS: Record<string, string> = {
  "zh-CN": "普通话",
  "zh-HK": "广东话",
  "en-US": "English",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GlobalRecordingBar({
  elapsed,
  audioLevel,
  lang,
  onStop,
}: GlobalRecordingBarProps) {
  return (
    <div className="sticky top-0 z-50 mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 shadow-md">
      {/* Pulsing red dot */}
      <div className="relative flex-shrink-0">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-[ping_1s_ease-in-out_infinite]" />
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 text-sm font-medium text-red-700 min-w-0">
        <span className="hidden sm:inline">录音中</span>
        <span className="text-xs text-red-500 bg-red-100 rounded px-1.5 py-0.5">
          {LANG_LABELS[lang] || lang}
        </span>
      </div>

      {/* Timer */}
      <div className="text-lg font-mono font-bold text-red-600 tabular-nums tracking-wider flex-shrink-0">
        {formatTime(elapsed)}
      </div>

      {/* Audio level bars */}
      <div className="flex items-end gap-0.5 h-6 flex-1 min-w-0">
        {[0.15, 0.3, 0.5, 0.65, 0.85, 1.0].map((t, i) => (
          <div
            key={i}
            className="flex-1 max-w-[6px] rounded-full transition-all duration-75"
            style={{
              height: `${4 + (audioLevel > t ? 14 : 4)}px`,
              backgroundColor:
                audioLevel > t
                  ? audioLevel > 0.7
                    ? i > 3
                      ? "#ef4444"
                      : "#f97316"
                    : "#f59e0b"
                  : "#fca5a5",
            }}
          />
        ))}
      </div>

      {/* Hint */}
      <span className="hidden md:inline text-xs text-red-500 flex-shrink-0">
        可切换步骤，录音不中断
      </span>

      {/* Stop button */}
      <button
        type="button"
        onClick={onStop}
        className="flex-shrink-0 flex items-center gap-1 rounded-full bg-red-500 hover:bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
      >
        <Square className="h-3 w-3 fill-white" />
        停止
      </button>
    </div>
  );
}
