"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TongueUploadProps {
  currentImage?: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export function TongueUpload({ currentImage, onImageChange, disabled }: TongueUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "上传失败");
        return;
      }
      const { url } = await res.json();
      onImageChange(url);
      toast.success("舌苔照片已上传");
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    onImageChange(null);
    if (inputRef.current) inputRef.current.value = "";
    toast.success("照片已移除");
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">舌苔照片</p>
      {currentImage ? (
        <div className="relative inline-block">
          <img
            src={currentImage}
            alt="舌苔照片"
            className="h-40 w-40 rounded-lg border object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
            onClick={handleDelete}
            disabled={disabled}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          className="flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <Camera className="h-8 w-8" />
              <span className="text-xs">点击上传</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <p className="text-xs text-muted-foreground">
        支持 JPG/PNG/WebP，最大5MB。拍摄时请确保光线充足，舌头自然伸出。
      </p>
    </div>
  );
}
