"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Save } from "lucide-react";
import { toast } from "sonner";

interface HerbPrice {
  id: string;
  herbId: string;
  name: string;
  pharmacopoeiaMin: number | null;
  pharmacopoeiaMax: number | null;
  retailPrice: number | null;
  unit: string;
}

export default function PharmacyHerbsPage() {
  const [herbs, setHerbs] = useState<HerbPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pharmacy/herbs")
      .then((r) => r.json())
      .then((data) => setHerbs(data.herbs))
      .catch(() => toast.error("加载药材价格失败"))
      .finally(() => setLoading(false));
  }, []);

  const handlePriceChange = (herbId: string, value: string) => {
    const num = parseFloat(value);
    setHerbs((prev) =>
      prev.map((h) => (h.id === herbId ? { ...h, retailPrice: isNaN(num) ? null : num } : h))
    );
  };

  const handleSavePrice = async (herbId: string) => {
    const herb = herbs.find((h) => h.id === herbId);
    if (!herb) return;
    setSaving(herbId);
    try {
      const res = await fetch("/api/pharmacy/herbs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ herbId: herb.herbId, retailPrice: herb.retailPrice }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "保存失败");
        return;
      }
      toast.success(`${herb.name} 价格已更新`);
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(null);
    }
  };

  const filtered = herbs.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">药材价格管理</h1>
        <p className="text-emerald-600">管理与绑定医师共享的药材零售价格</p>
      </div>

      <Card className="border-emerald-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-emerald-800">药材价格表</CardTitle>
              <CardDescription>
                共 {herbs.length} 种药材 · 修改后点击保存按钮生效
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索药材..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-emerald-100 text-left text-emerald-600">
                  <th className="pb-2 font-medium">药材名</th>
                  <th className="pb-2 font-medium text-right">药典下限(g)</th>
                  <th className="pb-2 font-medium text-right">药典上限(g)</th>
                  <th className="pb-2 font-medium text-right">零售价(元/g)</th>
                  <th className="pb-2 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id} className="border-b border-emerald-50">
                    <td className="py-2.5 font-medium">{h.name}</td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {h.pharmacopoeiaMin ?? "-"}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {h.pharmacopoeiaMax ?? "-"}
                    </td>
                    <td className="py-2.5 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={h.retailPrice ?? ""}
                        onChange={(e) => handlePriceChange(h.id, e.target.value)}
                        className="w-24 inline-block text-right"
                      />
                    </td>
                    <td className="py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleSavePrice(h.id)}
                        disabled={saving === h.id}
                      >
                        {saving === h.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
