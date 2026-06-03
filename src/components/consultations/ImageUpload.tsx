"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, X, Loader2, FileImage, Plus, RefreshCw } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const isMobile = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  /** Resize image to max 1024px longest side, JPEG quality 0.75 — reduces ~5MB→~200KB */
  async function resizeImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round((height / width) * MAX); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.75);
      };
      img.onerror = () => reject(new Error("failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCameraError("");
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch {
      setCameraError("无法访问摄像头，请检查权限设置");
      setCameraReady(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setCameraOpen(false);
      const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" });
      await handleFile(file);
    }, "image/jpeg", 0.92);
  };

  const handleFile = async (file: File) => {
    if (images.length >= maxImages) {
      toast.error(`最多上传${maxImages}张图片`);
      return;
    }
    setUploading(true);
    try {
      const resized = await resizeImage(file);
      const resizedFile = new File([resized], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
      const form = new FormData();
      form.set("file", resizedFile);
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

  // Cleanup stream on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

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

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

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
              onClick={() => isMobile ? fileRef.current?.click() : startCamera()}
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
            onClick={() => isMobile ? fileRef.current?.click() : startCamera()}
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
            onClick={() => fileRef.current?.click()}
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

      {/* Camera capture dialog */}
      <Dialog open={cameraOpen} onOpenChange={(o) => { if (!o) { stopCamera(); setCameraOpen(false); } }}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogTitle className="px-4 pt-4 text-sm">拍摄照片</DialogTitle>
          <div className="relative bg-black rounded-md overflow-hidden mx-4 mt-2">
            {cameraError ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <Camera className="h-10 w-10" />
                <p className="text-sm">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={startCamera}>重试</Button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setCameraReady(true)}
                className="w-full h-64 object-cover"
              />
            )}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 p-4">
            <Button variant="outline" onClick={() => { stopCamera(); setCameraOpen(false); }}>
              取消
            </Button>
            <Button onClick={capturePhoto} disabled={!cameraReady || !!cameraError}>
              拍摄
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
