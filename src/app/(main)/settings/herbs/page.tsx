"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Loader2, Edit, Trash2 } from "lucide-react";

export default function HerbsSettingsPage() {
  const [herbs, setHerbs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingHerb, setEditingHerb] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchHerbs(); }, []);

  const fetchHerbs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("limit", "100");
      const res = await fetch(`/api/herbs?${params}`);
      if (res.ok) setHerbs((await res.json()).herbs);
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form);
    try {
      if (editingHerb) {
        await fetch(`/api/herbs/${editingHerb.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast.success("已更新");
      } else {
        await fetch("/api/herbs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast.success("已添加");
      }
      setEditOpen(false);
      setEditingHerb(null);
      fetchHerbs();
    } catch { toast.error("操作失败"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/herbs/${id}`, { method: "DELETE" });
    toast.success("已删除");
    fetchHerbs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">药材管理</h1>
          <p className="text-muted-foreground">药材参考数据与价格维护</p>
        </div>
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingHerb(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />添加药材</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingHerb ? "编辑药材" : "添加药材"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1"><Label>药名 *</Label><Input name="name" defaultValue={(editingHerb?.name as string) || ""} required /></div>
              <div className="space-y-1"><Label>拼音</Label><Input name="pinyin" defaultValue={(editingHerb?.pinyin as string) || ""} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>分类</Label><Input name="category" defaultValue={(editingHerb?.category as string) || ""} /></div>
                <div className="space-y-1"><Label>药性</Label><Select name="nature" defaultValue={(editingHerb?.nature as string) || ""}>
                  <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                  <SelectContent>
                    {["寒","热","温","凉","平","大寒","大热","微寒","微温"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              </div>
              <div className="space-y-1"><Label>药味</Label><Input name="taste" defaultValue={(editingHerb?.taste as string) || ""} placeholder="如：辛、甘" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>药典最小剂量(g)</Label><Input name="pharmacopoeiaMin" type="number" step="0.1" defaultValue={(editingHerb?.pharmacopoeiaMin as string) || ""} /></div>
                <div className="space-y-1"><Label>药典最大剂量(g)</Label><Input name="pharmacopoeiaMax" type="number" step="0.1" defaultValue={(editingHerb?.pharmacopoeiaMax as string) || ""} /></div>
              </div>
              <div className="space-y-1"><Label>毒性</Label><Input name="toxicity" defaultValue={(editingHerb?.toxicity as string) || ""} /></div>
              <div className="space-y-1"><Label>归经</Label><Input name="meridian" defaultValue={(editingHerb?.meridian as string) || ""} /></div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingHerb ? "保存修改" : "添加"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜索药材..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchHerbs()} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>药名</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>药性</TableHead>
                <TableHead>药味</TableHead>
                <TableHead>药典剂量(g)</TableHead>
                <TableHead>毒性</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {herbs.map((h) => (
                <TableRow key={h.id as string}>
                  <TableCell className="font-medium">{h.name as string}</TableCell>
                  <TableCell>{(h.category as string) || "-"}</TableCell>
                  <TableCell><Badge variant="outline">{(h.nature as string) || "-"}</Badge></TableCell>
                  <TableCell>{(h.taste as string) || "-"}</TableCell>
                  <TableCell>{h.pharmacopoeiaMin ? `${h.pharmacopoeiaMin} - ${h.pharmacopoeiaMax}` : "-"}</TableCell>
                  <TableCell>{h.toxicity ? <Badge variant="warning">{(h.toxicity as string)}</Badge> : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingHerb(h); setEditOpen(true); }}><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id as string)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
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
