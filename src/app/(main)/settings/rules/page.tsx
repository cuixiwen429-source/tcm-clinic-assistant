"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export default function RulesSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchRules();
  }, [user]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rules");
      if (res.ok) setRules((await res.json()).rules);
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form);
    if (!data.herbB) data.herbB = null;
    try {
      await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("规则已添加");
      setAddOpen(false);
      fetchRules();
    } catch { toast.error("添加失败"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    toast.success("已删除");
    fetchRules();
  };

  if (!user || user.role !== "ADMIN") return null;

  const typeLabels: Record<string, string> = {
    ANTAGONISM: "十八反",
    FEAR: "十九畏",
    PREGNANCY: "妊娠禁忌",
  };

  const severityColors: Record<string, string> = {
    WARNING: "warning" as const,
    DANGER: "destructive" as const,
    BLOCK: "destructive" as const,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">合规规则配置</h1>
          <p className="text-muted-foreground">管理十八反、十九畏、妊娠禁忌等用药安全规则</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />添加规则</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加合规规则</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="space-y-1"><Label>规则类型</Label>
                <Select name="ruleType" required>
                  <SelectTrigger><SelectValue placeholder="选择类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANTAGONISM">十八反</SelectItem>
                    <SelectItem value="FEAR">十九畏</SelectItem>
                    <SelectItem value="PREGNANCY">妊娠禁忌</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>药材A *</Label><Input name="herbA" required /></div>
              <div className="space-y-1"><Label>药材B（妊娠禁忌可留空）</Label><Input name="herbB" /></div>
              <div className="space-y-1"><Label>严重程度</Label>
                <Select name="severity" defaultValue="WARNING">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WARNING">警告</SelectItem>
                    <SelectItem value="DANGER">危险</SelectItem>
                    <SelectItem value="BLOCK">阻断</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>说明 *</Label><Input name="description" required /></div>
              <div className="space-y-1"><Label>来源</Label><Input name="sourceNote" placeholder="如：《中国药典》" /></div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}添加规则
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>药材A</TableHead>
                <TableHead>药材B</TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>说明</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id as string}>
                  <TableCell><Badge variant="outline">{typeLabels[r.ruleType as string] || (r.ruleType as string)}</Badge></TableCell>
                  <TableCell className="font-medium">{r.herbA as string}</TableCell>
                  <TableCell>{(r.herbB as string) || "-"}</TableCell>
                  <TableCell><Badge variant={severityColors[r.severity as string] as "warning" | "destructive" | undefined}>{(r.severity as string)}</Badge></TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{r.description as string}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id as string)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
