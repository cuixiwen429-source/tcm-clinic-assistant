"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Stethoscope, Pill, Search, Check } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"DOCTOR" | "PHARMACY">("DOCTOR");

  // Doctor search (for pharmacy registration)
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; phone?: string | null }>>([]);
  const [searchingDoctors, setSearchingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState("");

  const searchDoctors = useCallback(async (q: string) => {
    setSearchingDoctors(true);
    try {
      const res = await fetch(`/api/doctors?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors);
      }
    } catch { /* ignore */ }
    finally { setSearchingDoctors(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (doctorSearch.trim()) searchDoctors(doctorSearch.trim());
      else setDoctors([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [doctorSearch, searchDoctors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("两次密码不一致");
      return;
    }
    if (selectedRole === "PHARMACY" && !selectedDoctorId) {
      toast.error("药房注册必须绑定一位执业药师");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          name,
          phone: phone || null,
          role: selectedRole,
          doctorId: selectedRole === "PHARMACY" ? selectedDoctorId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "注册失败");
        return;
      }

      toast.success("注册成功，欢迎使用");
      if (selectedRole === "PHARMACY") {
        router.push("/pharmacy/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(38,35%,96%)] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[hsl(120,25%,55%)]/5" />
      </div>

      <Card className="w-full max-w-sm border-primary/10 shadow-lg relative tcm-cloud-corner">
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
          <div className="mx-auto mb-5 mt-2">
            <BrandLogo size={104} />
          </div>
          <CardTitle className="text-xl font-serif text-foreground tracking-wide brand-underline">
            注册新账号
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {selectedRole === "PHARMACY" ? "创建药房账号" : "创建您的诊疗助手账号"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Role selection */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {([
              { role: "DOCTOR", label: "药师", subtitle: "执业中医师", icon: Stethoscope },
              { role: "PHARMACY", label: "药房", subtitle: "药房工作人员", icon: Pill },
            ] as const).map(({ role, label, subtitle, icon: Icon }) => {
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
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] opacity-70">{subtitle}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{selectedRole === "PHARMACY" ? "药房名称" : "医师姓名"}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedRole === "PHARMACY" ? "请输入药房名称" : "请输入您的真实姓名"}
                required
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>

            {/* Doctor binding for pharmacy */}
            {selectedRole === "PHARMACY" && (
              <div className="space-y-2">
                <Label>绑定执业药师 *</Label>
                {selectedDoctorId ? (
                  <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 p-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">{selectedDoctorName}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedDoctorId(null); setSelectedDoctorName(""); setDoctorSearch(""); }}
                    >
                      更换
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="搜索执业药师姓名..."
                        value={doctorSearch}
                        onChange={(e) => setDoctorSearch(e.target.value)}
                        className="pl-9 border-primary/15"
                      />
                    </div>
                    {searchingDoctors && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> 搜索中...
                      </div>
                    )}
                    {doctors.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-md border space-y-0.5 p-1">
                        {doctors.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => { setSelectedDoctorId(d.id); setSelectedDoctorName(d.name); setDoctors([]); setDoctorSearch(""); }}
                            className="w-full text-left px-3 py-2 rounded text-sm hover:bg-accent transition-colors"
                          >
                            <span className="font-medium">{d.name}</span>
                            {d.phone && <span className="ml-2 text-xs text-muted-foreground">{d.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {doctorSearch.trim() && !searchingDoctors && doctors.length === 0 && (
                      <p className="text-xs text-muted-foreground">未找到匹配医师</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-30个字符"
                required
                minLength={3}
                maxLength={30}
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">手机号（选填）</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="方便患者联系"
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位"
                required
                minLength={6}
                className="border-primary/15 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
                minLength={6}
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
              {selectedRole === "PHARMACY" ? "注册药房账号" : "注册"}
            </Button>
          </form>

          <div className="tcm-divider" />

          <p className="text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              去登录
            </Link>
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
