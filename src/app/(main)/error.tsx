"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main layout error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 max-w-lg w-full">
        <h2 className="text-lg font-semibold text-destructive mb-2">页面加载异常</h2>
        <p className="text-sm text-muted-foreground mb-1">错误类型: {error.name}</p>
        <p className="text-sm text-muted-foreground mb-1">错误信息: {error.message}</p>
        {error.digest && (
          <p className="text-sm text-muted-foreground mb-4">Digest: {error.digest}</p>
        )}
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
          {error.stack}
        </pre>
        <Button onClick={reset} className="mt-4" variant="outline">
          重试
        </Button>
      </div>
    </div>
  );
}
