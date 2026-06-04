"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, CheckCircle2, User, AlertTriangle } from "lucide-react";

interface PharmacyStats {
  pendingCount: number;
  completedThisMonth: number;
  doctorName: string;
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">药房工作台</h1>
        <p className="text-emerald-600">
          {stats?.doctorName ? `绑定医师：${stats.doctorName}` : "药谷云阁 · 药材管理"}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              待处理处方
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-900">{stats?.pendingCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              本月已完成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-900">{stats?.completedThisMonth ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <User className="h-4 w-4" />
              绑定医师
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-emerald-900">{stats?.doctorName || "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending prescriptions */}
      <Card className="border-emerald-200">
        <CardHeader>
          <CardTitle className="text-lg text-emerald-800">待处理处方</CardTitle>
          <CardDescription>来自绑定医师的待捡药处方</CardDescription>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
              <p>暂无待处理处方</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p) => (
                <Link
                  key={p.id}
                  href={`/pharmacy/prescriptions/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-emerald-100 p-4 hover:bg-emerald-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-emerald-900">
                      {p.formulaName || "未命名方剂"}
                      <Badge variant="outline" className="ml-2 text-[10px] border-emerald-200 text-emerald-600">
                        {p.herbCount}味药
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {p.patientName} · {new Date(p.visitDate).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.status === "FINALIZED" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        待捡药
                      </Badge>
                    )}
                    {p.status === "PRESCRIBED" && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        待确认
                      </Badge>
                    )}
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
