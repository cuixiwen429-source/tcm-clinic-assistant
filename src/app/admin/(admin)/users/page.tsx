"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserRound, Loader2 } from "lucide-react";

interface UserInfo {
  id: string; username: string; name: string; role: string; phone: string | null;
  createdAt: string;
  _count: { consultations: number; editedPrescriptions: number; createdPatients: number };
}

const roleLabels: Record<string, string> = { ADMIN: "管理员", DOCTOR: "执业医师", ASSISTANT: "医馆助理" };
const roleOptions = ["ADMIN", "DOCTOR", "ASSISTANT"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUsers(d.users); })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        toast.success("角色已更新");
      } else {
        toast.error("更新失败");
      }
    } catch { toast.error("网络错误"); }
    finally { setUpdating(null); }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-serif tracking-wide">医师管理</h1>
        <p className="text-muted-foreground text-sm">管理系统所有注册医师</p>
      </div>

      <Card className="border-primary/10">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                <th className="text-left py-3 px-4 font-medium">医师</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">用户名</th>
                <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">电话</th>
                <th className="text-center py-3 px-4 font-medium">角色</th>
                <th className="text-center py-3 px-4 font-medium hidden md:table-cell">患者</th>
                <th className="text-center py-3 px-4 font-medium hidden md:table-cell">就诊</th>
                <th className="text-center py-3 px-4 font-medium hidden md:table-cell">处方</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">注册时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-1.5">
                        <UserRound className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{u.username}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{u.phone || "-"}</td>
                  <td className="py-3 px-4 text-center">
                    {updating === u.id ? (
                      <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Select
                        defaultValue={u.role}
                        onValueChange={(v) => handleRoleChange(u.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(r => (
                            <SelectItem key={r} value={r} className="text-xs">{roleLabels[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-medium hidden md:table-cell">{u._count.createdPatients}</td>
                  <td className="py-3 px-4 text-center font-medium hidden md:table-cell">{u._count.consultations}</td>
                  <td className="py-3 px-4 text-center font-medium hidden md:table-cell">{u._count.editedPrescriptions}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground text-xs hidden lg:table-cell">
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
