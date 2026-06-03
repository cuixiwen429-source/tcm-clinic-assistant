"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Loader2, Edit, Trash2, Save, Coins, Download, BookOpen } from "lucide-react";

export default function HerbsSettingsPage() {
  const [tab, setTab] = useState("pharmacopoeia");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">药材管理</h1>
        <p className="text-muted-foreground text-sm">药典参考数据与价格维护</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pharmacopoeia" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />药典用量管理
          </TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5">
            <Coins className="h-3.5 w-3.5" />用药价格管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pharmacopoeia" className="mt-4">
          <PharmacopoeiaTab />
        </TabsContent>

        <TabsContent value="prices" className="mt-4">
          <PricesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** ====== 药典用量管理 ====== */
function PharmacopoeiaTab() {
  const [herbs, setHerbs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingHerb, setEditingHerb] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchHerbs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("limit", "500");
      const res = await fetch(`/api/herbs?${params}`);
      if (res.ok) setHerbs((await res.json()).herbs);
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHerbs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seedHerbs = async () => {
    if (!confirm("将从《中国药典》导入全部药材数据（约314种），确定继续？")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/herbs/seed", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`已导入 ${data.imported} 种药材，数据库共 ${data.totalInDb} 种`);
        fetchHerbs();
      } else {
        const err = await res.json();
        toast.error(err.error || "导入失败");
      }
    } catch { toast.error("网络错误"); }
    finally { setSeeding(false); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form);
    try {
      if (editingHerb) {
        await fetch(`/api/herbs/${editingHerb.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        toast.success("已更新");
      } else {
        await fetch("/api/herbs", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="搜索药材..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchHerbs()} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={fetchHerbs} disabled={loading}>搜索</Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={seedHerbs} disabled={seeding}>
            {seeding ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            导入药典
          </Button>
          <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingHerb(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />添加药材</Button>
            </DialogTrigger>
            <DialogContent className="max-w-full sm:max-w-lg">
              <DialogHeader><DialogTitle>{editingHerb ? "编辑药材" : "添加药材"}</DialogTitle></DialogHeader>
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
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>药名</TableHead>
                <TableHead className="hidden md:table-cell">分类</TableHead>
                <TableHead className="hidden sm:table-cell">药性</TableHead>
                <TableHead className="hidden sm:table-cell">药味</TableHead>
                <TableHead className="hidden md:table-cell">药典剂量(g)</TableHead>
                <TableHead className="hidden sm:table-cell">毒性</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />加载中...</TableCell></TableRow>
              ) : herbs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">无数据</TableCell></TableRow>
              ) : (
                herbs.map((h) => (
                  <TableRow key={h.id as string}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{h.name as string}</span>
                        <span className="text-[10px] text-muted-foreground md:hidden">
                          {(h.category as string) || ""}{(h.category as string) && (h.nature as string) ? " · " : ""}{(h.nature as string) || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{(h.category as string) || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline">{(h.nature as string) || "-"}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{(h.taste as string) || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{h.pharmacopoeiaMin ? `${h.pharmacopoeiaMin} - ${h.pharmacopoeiaMax}` : "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{h.toxicity ? <Badge variant="destructive">{(h.toxicity as string)}</Badge> : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingHerb(h); setEditOpen(true); }}><Edit className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(h.id as string)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** ====== 用药价格管理 ====== */
function PricesTab() {
  const [priceItems, setPriceItems] = useState<Array<{ name: string; category: string; retailPrice: number | null }>>([]);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceSearch, setPriceSearch] = useState("");
  const [dirtyPrices, setDirtyPrices] = useState<Record<string, string>>({});
  const [priceSaving, setPriceSaving] = useState(false);
  const priceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchPrices = async () => {
    setPriceLoading(true);
    try {
      const params = new URLSearchParams();
      if (priceSearch) params.set("q", priceSearch);
      params.set("limit", "300");
      const res = await fetch(`/api/herbs/prices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPriceItems(data.items);
      }
    } catch { /* */ }
    finally { setPriceLoading(false); }
  };

  useEffect(() => { fetchPrices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPriceDirty = (name: string, value: string) => {
    setDirtyPrices(prev => {
      const next = { ...prev };
      next[name] = value === "" || value === null ? "" : value;
      return next;
    });
  };

  const handleBatchUpdate = async () => {
    const updates = Object.entries(dirtyPrices)
      .filter(([, v]) => v !== "")
      .map(([name, retailPrice]) => ({ name, retailPrice: parseFloat(retailPrice) }));

    if (updates.length === 0) { toast.error("没有要更新的价格"); return; }

    setPriceSaving(true);
    try {
      const res = await fetch("/api/herbs/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: updates }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`已更新 ${data.updated} 个药材价格`);
        setDirtyPrices({});
        fetchPrices();
      } else {
        toast.error("更新失败");
      }
    } catch { toast.error("网络错误"); }
    finally { setPriceSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索药材..."
              value={priceSearch}
              onChange={(e) => setPriceSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPrices()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchPrices} disabled={priceLoading}>搜索</Button>
        </div>
        <Button
          size="sm"
          onClick={handleBatchUpdate}
          disabled={Object.keys(dirtyPrices).length === 0 || priceSaving}
        >
          {priceSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          保存价格 {Object.keys(dirtyPrices).length > 0 && `(${Object.keys(dirtyPrices).length})`}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">广东同仁堂零售参考价（元/克）· 点击价格直接编辑 · 回车跳下一行</p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>药名</TableHead>
                <TableHead className="hidden sm:table-cell">分类</TableHead>
                <TableHead>零售价 (元/克) · 状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground"><Loader2 className="inline-block h-4 w-4 animate-spin mr-2" />加载中...</TableCell></TableRow>
              ) : priceItems.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">无数据</TableCell></TableRow>
              ) : (
                priceItems.map((item) => {
                  const isDirty = item.name in dirtyPrices;
                  const hasPrice = item.retailPrice != null;

                  return (
                    <TableRow key={item.name} className={isDirty ? "bg-primary/5" : undefined}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{item.category || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-sm">¥</span>
                            <Input
                              className="h-7 w-[72px] text-sm font-mono"
                              type="number" step="0.01" min="0"
                              placeholder={hasPrice ? item.retailPrice!.toString() : "未设"}
                              defaultValue={hasPrice ? item.retailPrice!.toString() : ""}
                              ref={(el) => { priceInputRefs.current[item.name] = el; }}
                              onChange={(e) => setPriceDirty(item.name, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const idx = priceItems.findIndex(p => p.name === item.name);
                                  const next = priceItems[idx + 1];
                                  if (next) priceInputRefs.current[next.name]?.focus();
                                }
                              }}
                            />
                          </div>
                          {isDirty ? (
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] shrink-0">待更新</Badge>
                          ) : hasPrice ? (
                            <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 shrink-0">已定价</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">未定价</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
