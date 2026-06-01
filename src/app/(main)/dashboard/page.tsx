"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import { Users, Stethoscope, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DashboardStats {
  todayPatients: number;
  pendingPrescriptions: number;
  pendingPrints: number;
  highRiskAlerts: number;
}

interface RecentConsultation {
  id: string;
  visitDate: string;
  chiefComplaint: string | null;
  status: string;
  patient: { id: string; name: string; gender: string | null; age: number | null };
  doctor: { name: string };
}

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  AI_ASSISTED: "AI辅助中",
  PRESCRIBED: "已处方",
  FINALIZED: "已完成",
  ARCHIVED: "已归档",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  DRAFT: "secondary",
  AI_ASSISTED: "outline",
  PRESCRIBED: "warning",
  FINALIZED: "success",
  ARCHIVED: "default",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayPatients: 0,
    pendingPrescriptions: 0,
    pendingPrints: 0,
    highRiskAlerts: 0,
  });
  const [recentConsultations, setRecentConsultations] = useState<RecentConsultation[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats({
            todayPatients: data.todayPatients,
            pendingPrescriptions: data.pendingPrescriptions,
            pendingPrints: data.pendingPrints,
            highRiskAlerts: data.highRiskAlerts,
          });
          setRecentConsultations(data.recentConsultations);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "今日患者", value: stats.todayPatients, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "待确认处方", value: stats.pendingPrescriptions, icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "待打印处方", value: stats.pendingPrints, icon: Stethoscope, color: "text-green-600", bg: "bg-green-50" },
    { title: "高风险提醒", value: stats.highRiskAlerts, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">工作台</h1>
        <p className="text-muted-foreground">欢迎回来，{user?.name}医师</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`rounded-full p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{card.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Button onClick={() => router.push("/consultations/new")} className="w-full sm:w-auto">新建就诊</Button>
        <Button variant="outline" onClick={() => router.push("/patients")} className="w-full sm:w-auto">患者管理</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近就诊</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentConsultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无就诊记录。点击"新建就诊"开始接诊。</p>
          ) : (
            <div className="space-y-2">
              {recentConsultations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => router.push(`/consultations/${c.id}/ai`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.patient.name}
                        <span className="text-muted-foreground font-normal ml-1">
                          {c.patient.gender} {c.patient.age ? `${c.patient.age}岁` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.chiefComplaint || "未填写主诉"} · {c.doctor.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Badge variant={statusVariants[c.status] || "secondary"} className="text-[10px]">
                      {statusLabels[c.status] || c.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(c.visitDate), "MM/dd", { locale: zhCN })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
