"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";

interface RxInfo {
  id: string; visitDate: string; chiefComplaint: string | null; status: string;
  patient: { name: string; gender: string | null };
  doctor: { name: string };
  prescriptionCount: number; hasConfirmed: boolean;
}

interface Doctor { id: string; name: string; }

const statusLabels: Record<string, string> = {
  DRAFT: "草稿", AI_ASSISTED: "AI辅助中", PRESCRIBED: "已处方", FINALIZED: "已完成", ARCHIVED: "已归档",
};
const statusVariants: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  DRAFT: "secondary", AI_ASSISTED: "outline", PRESCRIBED: "warning", FINALIZED: "success", ARCHIVED: "default",
};

export default function AdminPrescriptionsPage() {
  const [data, setData] = useState<RxInfo[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(d => {
      if (d?.users) setDoctors(d.users.filter((u: { role: string }) => u.role !== "ADMIN"));
    });
  }, []);

  const fetchData = (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (doctorFilter !== "ALL") params.set("doctorId", doctorFilter);
    params.set("page", String(p));
    params.set("limit", "20");
    // Only show consultations that have prescriptions
    params.set("status", "PRESCRIBED");
    fetch(`/api/admin/consultations?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setData(d.consultations.filter((c: RxInfo) => c.prescriptionCount > 0)); setTotalPages(Math.max(1, Math.ceil((d.total) / d.limit))); setPage(d.page); }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [doctorFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-serif tracking-wide">处方管理</h1>
        <p className="text-muted-foreground text-sm">全局处方开具情况概览</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={doctorFilter} onValueChange={v => { setDoctorFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="全部医师" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">全部医师</SelectItem>
            {doctors.map(d => (
              <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-primary/10">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6"><Skeleton className="h-64" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium">患者</th>
                  <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">主诉</th>
                  <th className="text-left py-3 px-4 font-medium">医师</th>
                  <th className="text-center py-3 px-4 font-medium">处方数</th>
                  <th className="text-center py-3 px-4 font-medium">已确认</th>
                  <th className="text-center py-3 px-4 font-medium hidden sm:table-cell">状态</th>
                  <th className="text-right py-3 px-4 font-medium hidden sm:table-cell">日期</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">暂无处方记录</td></tr>
                ) : (
                  data.map(c => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Pill className="h-3 w-3 text-primary/60 hidden sm:inline" />
                          <span className="font-medium">{c.patient.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground truncate max-w-40 hidden sm:table-cell">{c.chiefComplaint || "-"}</td>
                      <td className="py-3 px-4">{c.doctor.name}</td>
                      <td className="py-3 px-4 text-center font-medium">{c.prescriptionCount}</td>
                      <td className="py-3 px-4 text-center">
                        {c.hasConfirmed
                          ? <Badge variant="success" className="text-[10px]">已确认</Badge>
                          : <Badge variant="warning" className="text-[10px]">待确认</Badge>}
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <Badge variant={statusVariants[c.status] || "secondary"} className="text-[10px]">{statusLabels[c.status] || c.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-xs hidden sm:table-cell">
                        {new Date(c.visitDate).toLocaleDateString("zh-CN")}
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
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchData(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
