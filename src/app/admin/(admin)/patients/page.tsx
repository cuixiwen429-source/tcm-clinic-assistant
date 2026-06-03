"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface PatientInfo {
  id: string; name: string; gender: string | null; age: number | null;
  phone: string | null; constitution: string | null;
  allergies: string | null; chronicDisease: string | null;
  createdBy: string; consultationCount: number; createdAt: string;
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPatients = (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(p));
    params.set("limit", "20");
    fetch(`/api/admin/patients?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setPatients(d.patients); setTotalPages(d.totalPages); setPage(d.page); }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatients(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-serif tracking-wide">患者管理</h1>
        <p className="text-muted-foreground text-sm">全局患者档案概览</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索患者..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchPatients()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPatients()}>搜索</Button>
      </div>

      <Card className="border-primary/10">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6"><Skeleton className="h-64" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium">姓名</th>
                  <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">性别</th>
                  <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">年龄</th>
                  <th className="text-left py-3 px-4 font-medium hidden md:table-cell">体质</th>
                  <th className="text-left py-3 px-4 font-medium hidden md:table-cell">过敏史</th>
                  <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">创建者</th>
                  <th className="text-center py-3 px-4 font-medium">就诊次数</th>
                  <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">暂无患者数据</td></tr>
                ) : (
                  patients.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">{p.gender || "-"}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">{p.age ? `${p.age}岁` : "-"}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {p.constitution ? <Badge variant="outline" className="text-[10px]">{p.constitution}</Badge> : "-"}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {p.allergies ? <span className="text-red-600 text-xs">{p.allergies}</span> : "-"}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{p.createdBy}</td>
                      <td className="py-3 px-4 text-center font-medium">{p.consultationCount}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-xs hidden lg:table-cell">
                        {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchPatients(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchPatients(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
