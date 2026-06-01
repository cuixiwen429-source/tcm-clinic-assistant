"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, FileImage } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  title: string;
  description?: string;
  currentImage?: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ title, description, currentImage, onImageChange, disabled }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "上传失败" }));
        toast.error(data.error || "上传失败");
        return;
      }
      const data = await res.json();
      onImageChange(data.url);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setUploading(false);
    }
  };

  const isMobile = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={isMobile ? "environment" : undefined}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {currentImage ? (
        <div className="relative inline-block">
          <img
            src={currentImage}
            alt={title}
            className="w-40 h-40 rounded-lg border object-cover"
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => onImageChange(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Camera capture (mobile) or file picker (desktop) */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1" />
            )}
            {isMobile ? "拍摄" : "拍照"}
          </Button>
          {/* Album picker */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => {
              const input = fileRef.current;
              if (input) {
                input.removeAttribute("capture");
                input.click();
              }
            }}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileImage className="h-4 w-4 mr-1" />
            )}
            相册
          </Button>
        </div>
      )}
    </div>
  );
}
