"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Stethoscope, Pill } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"DOCTOR" | "PHARMACY">("DOCTOR");

  const roleLabels: Record<string, { label: string; subtitle: string; icon: React.ElementType }> = {
    DOCTOR: { label: "药师登录", subtitle: "执业中医师", icon: Stethoscope },
    PHARMACY: { label: "药房登录", subtitle: "药房工作人员", icon: Pill },
  };

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
        if (selectedRole === "PHARMACY" && me.role !== "PHARMACY") {
          toast.error("该账号不是药房账号，请选择药师登录");
          await fetch("/api/auth/logout", { method: "POST" });
          return;
        }
        if (selectedRole === "DOCTOR" && me.role === "PHARMACY") {
          toast.error("该账号是药房账号，请选择药房登录");
          await fetch("/api/auth/logout", { method: "POST" });
          return;
        }
      }

      toast.success("登录成功");
      const redirect = getRedirect();
      if (selectedRole === "PHARMACY") {
        router.push(redirect || "/pharmacy/dashboard");
      } else {
        router.push(redirect || "/dashboard");
      }
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

        <CardHeader className="text-center pb-4">
          {/* Brand logo */}
          <div className="mx-auto mb-5 mt-2">
            <BrandLogo size={104} />
          </div>
          <CardTitle className="text-xl font-serif text-foreground tracking-wide brand-underline">
            药谷云阁中医大健康平台
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            选择登录身份
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Role selection tabs */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(["DOCTOR", "PHARMACY"] as const).map((role) => {
              const info = roleLabels[role];
              const Icon = info.icon;
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                    isActive
                      ? role === "DOCTOR"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-muted-foreground/15 bg-transparent text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-semibold">{info.label}</span>
                  <span className="text-[10px] opacity-70">{info.subtitle}</span>
                </button>
              );
            })}
          </div>

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
            <Button
              type="submit"
              className={`w-full font-medium ${
                selectedRole === "PHARMACY" ? "bg-emerald-600 hover:bg-emerald-700" : ""
              }`}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedRole === "PHARMACY" ? "药房登录" : "药师登录"}
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
            本系统仅供执业中医师及药房使用
            <br />
            AI学术参考 · 医师最终确认
          </p>
        </CardContent>
      </Card>

    </div>
  );
}

export default LoginForm;
