import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "广东中医馆经方辅助诊疗系统",
  description: "执业中医师内部辅助工具 — AI学术参考，最终诊疗方案由执业医师确认",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
