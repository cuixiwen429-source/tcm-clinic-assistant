"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function AdminLoginPage() {
  const { user, isLoading, fetchUser } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && user && user.role === "ADMIN") {
      window.location.href = "/admin";
    }
  }, [user, isLoading]);

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
        setLoading(false);
        return;
      }

      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const { user: me } = await meRes.json();
        if (me.role !== "ADMIN") {
          toast.error("非管理员账号，无权限访问后台");
          await fetch("/api/auth/logout", { method: "POST" });
          setLoading(false);
          return;
        }
      }

      toast.success("管理员登录成功");
      window.location.href = "/admin";
    } catch {
      toast.error("网络错误，请重试");
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(38,35%,96%)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(38,35%,96%)] p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[hsl(120,25%,55%)]/5" />
      </div>

      <Card className="w-full max-w-sm border-primary/10 shadow-lg relative tcm-cloud-corner">
        <CardHeader className="text-center pb-6 relative">
          <Link
            href="/login"
            className="absolute left-0 top-0 text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" />
            返回首页
          </Link>

          <div className="mx-auto mb-5 mt-2">
            <BrandLogo size={96} />
          </div>
          <CardTitle className="text-xl font-serif text-foreground tracking-wide">
            系统管理后台
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            药谷云阁中医大健康平台
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">管理员账号</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入管理员账号"
                required
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">管理员密码</Label>
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
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              登录管理后台
            </Button>
          </form>

          <div className="tcm-divider" />

          <p className="text-center text-xs text-muted-foreground/60">
            仅限系统管理员登录
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
