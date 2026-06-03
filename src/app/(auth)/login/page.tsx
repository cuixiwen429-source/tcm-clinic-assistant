"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getRedirect = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "登录失败");
        return;
      }

      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const { user: me } = await meRes.json();
        if (me.role === "ADMIN") {
          toast.error("管理员请使用管理后台专用登录入口");
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/admin/login";
          return;
        }
      }

      toast.success("登录成功");
      const redirect = getRedirect();
      router.push(redirect || "/dashboard");
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(38,35%,96%)] p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[hsl(120,25%,55%)]/5" />
      </div>

      <Card className="w-full max-w-sm border-primary/10 shadow-lg relative tcm-cloud-corner">
        {/* 傷寒雜病論 watermark */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <span
            className="absolute bottom-3 right-3 font-serif font-bold select-none"
            style={{
              fontSize: "26px",
              color: "hsl(var(--tcm-seal))",
              opacity: 0.05,
              transform: "rotate(-8deg)",
            }}
          >
            傷寒雜病論
          </span>
        </div>

        <CardHeader className="text-center pb-6">
          {/* Brand logo */}
          <div className="mx-auto mb-5 mt-2">
            <BrandLogo size={104} />
          </div>
          <CardTitle className="text-xl font-serif text-foreground tracking-wide brand-underline">
            药谷云阁中医大健康平台
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            执业中医师内部辅助工具
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                required
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>
            <Button type="submit" className="w-full font-medium" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录系统
            </Button>
          </form>

          <div className="tcm-divider" />

          <p className="text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              注册新账号
            </Link>
            <span className="mx-2 text-border">|</span>
            <button
              type="button"
              onClick={() => { window.location.href = "/admin/login"; }}
              className="text-primary hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
            >
              管理员登录
            </button>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground/60 leading-relaxed">
            本系统仅供执业中医师使用
            <br />
            AI学术参考 · 医师最终确认
          </p>
        </CardContent>
      </Card>

    </div>
  );
}

export default LoginForm;
