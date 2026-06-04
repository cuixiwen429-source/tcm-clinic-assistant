"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, CheckCircle2, User, AlertTriangle, ChevronRight, Clock } from "lucide-react";

interface PharmacyStats {
  pendingCount: number;
  completedThisMonth: number;
  doctorName: string | null;
}

interface PendingPrescription {
  id: string;
  consultationId: string;
  formulaName: string | null;
  patientName: string;
  visitDate: string;
  status: string;
  herbCount: number;
}

export default function PharmacyDashboardPage() {
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [prescriptions, setPrescriptions] = useState<PendingPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pharmacy/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setPrescriptions(data.prescriptions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-900">药房工作台</h1>
          <p className="text-sm text-emerald-600 mt-0.5">
            {stats?.doctorName ? `绑定医师：${stats.doctorName}` : "药谷云阁 · 药材管理"}
          </p>
        </div>
        {stats?.doctorName && (
          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 gap-1">
            <User className="h-3 w-3" />
            {stats.doctorName}
          </Badge>
        )}
      </div>

      {/* Stats cards — responsive grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <Card className="border-emerald-200 bg-white">
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-emerald-600 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              待处理处方
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
            <p className="text-2xl md:text-3xl font-bold text-emerald-900">{stats?.pendingCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-white">
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              本月已完成
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
            <p className="text-2xl md:text-3xl font-bold text-emerald-900">{stats?.completedThisMonth ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-white col-span-2 md:col-span-1">
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-emerald-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              绑定医师
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
            <p className="text-lg md:text-xl font-semibold text-emerald-900">{stats?.doctorName || "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending prescriptions */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2 px-4 md:px-6 pt-4 md:pt-5">
          <CardTitle className="text-base md:text-lg text-emerald-800">待处理处方</CardTitle>
          <CardDescription className="text-xs md:text-sm">来自绑定医师的待捡药处方</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-2 pb-2">
          {prescriptions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-200" />
              <p className="text-sm">暂无待处理处方</p>
            </div>
          ) : (
            <div className="divide-y divide-emerald-50">
              {prescriptions.map((p) => (
                <Link
                  key={p.id}
                  href={`/pharmacy/prescriptions/${p.id}`}
                  className="flex items-center gap-3 px-4 md:px-6 py-3.5 hover:bg-emerald-50/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm md:text-base text-emerald-900 truncate">
                        {p.formulaName || "未命名方剂"}
                      </p>
                      <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-600 shrink-0">
                        {p.herbCount}味药
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                      {p.patientName} · {new Date(p.visitDate).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === "FINALIZED" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        待捡药
                      </Badge>
                    )}
                    {p.status === "PRESCRIBED" && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        待确认
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-500 transition-colors hidden sm:block" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
