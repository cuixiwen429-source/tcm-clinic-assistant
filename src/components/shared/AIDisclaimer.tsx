import { AlertTriangle } from "lucide-react";

export function AIDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-muted-foreground ${className || ""}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span>学术参考，最终诊疗方案由执业医师确认</span>
    </div>
  );
}
