"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, FileImage, Plus } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  title: string;
  description?: string;
  images: string[];
  onImagesChange: (urls: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function ImageUpload({ title, description, images, onImagesChange, disabled, maxImages = 5 }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (images.length >= maxImages) {
      toast.error(`最多上传${maxImages}张图片`);
      return;
    }
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
      onImagesChange([...images, data.url]);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
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

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-square">
              <img
                src={url}
                alt={`${title} ${i + 1}`}
                className="w-full h-full rounded-lg border object-cover"
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
                  onClick={() => removeImage(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          {/* Add more button */}
          {!disabled && images.length < maxImages && (
            <button
              type="button"
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex items-center justify-center transition-colors"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Initial upload buttons (no images yet) */}
      {images.length === 0 && (
        <div className="flex gap-2">
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
