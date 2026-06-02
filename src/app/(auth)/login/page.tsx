"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

      toast.success("登录成功");
      router.push("/dashboard");
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

      <Card className="w-full max-w-sm border-primary/10 shadow-lg">
        <CardHeader className="text-center pb-6">
          {/* Seal-style icon */}
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
            <span className="font-serif text-2xl text-primary font-bold tcm-seal">经</span>
          </div>
          <CardTitle className="text-xl font-serif text-foreground tracking-wide">
            经方辅助诊疗系统
          </CardTitle>
          <CardDescription className="text-sm">
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
          <p className="mt-5 text-center text-xs text-muted-foreground leading-relaxed">
            本系统仅供内部授权人员使用
            <br />
            <span className="opacity-60">AI学术参考 · 最终诊疗方案由执业医师确认</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
