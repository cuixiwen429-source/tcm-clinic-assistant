"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, ImageIcon } from "lucide-react";

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
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      onImageChange(data.url);
    } catch {
      // silently fail - user can retry
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
          {/* Camera capture */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => {
              const input = fileRef.current;
              if (input) {
                input.setAttribute("capture", "environment");
                input.click();
                input.removeAttribute("capture");
              }
            }}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-1" />
            )}
            拍摄
          </Button>
          {/* Album picker */}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-1" />
            )}
            相册
          </Button>
        </div>
      )}
    </div>
  );
}
