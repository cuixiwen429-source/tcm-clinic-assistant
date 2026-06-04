"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import {
  Users, Stethoscope, FileText, TrendingUp,
  Activity, Pill, ChevronRight, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Types ───
interface DashboardData {
  todayPatients: number;
  pendingPrescriptions: number;
  pendingPrints: number;
  highRiskAlerts: number;
  recentConsultations: RecentConsultation[];
  totalPatients: number;
  totalConsultations: number;
  totalPrescriptions: number;
  trendMonths: string[];
  trendData: number[];
  statusBreakdown: Record<string, number>;
  topHerbs: { name: string; count: number }[];
  constitutionData: { name: string; count: number }[];
  avgCost: number;
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
  DRAFT: "草稿", AI_ASSISTED: "AI辅助中", PRESCRIBED: "已处方",
  FINALIZED: "已完成", ARCHIVED: "已归档",
};

const statusColors: Record<string, string> = {
  DRAFT: "#9CA3AF", AI_ASSISTED: "#6366F1", PRESCRIBED: "#F59E0B",
  FINALIZED: "#10B981", ARCHIVED: "#6B7280",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  DRAFT: "secondary", AI_ASSISTED: "outline", PRESCRIBED: "warning",
  FINALIZED: "success", ARCHIVED: "default",
};

const monthLabels: Record<string, string> = {
  "01": "1月", "02": "2月", "03": "3月", "04": "4月", "05": "5月", "06": "6月",
  "07": "7月", "08": "8月", "09": "9月", "10": "10月", "11": "11月", "12": "12月",
};

// ─── TCM color palette for word cloud ───
const cloudColors = [
  "hsl(3,70%,42%)", "hsl(3,55%,50%)", "hsl(30,20%,32%)",
  "hsl(140,18%,52%)", "hsl(40,35%,48%)", "hsl(3,45%,55%)",
  "hsl(30,15%,38%)", "hsl(145,20%,45%)", "hsl(35,30%,40%)",
  "hsl(0,50%,48%)", "hsl(25,25%,35%)", "hsl(150,15%,48%)",
];

// ─── Word Cloud (tag-cloud) ───
function WordCloud({ data, maxItems = 20 }: { data: { name: string; count: number }[]; maxItems?: number }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>;
  }

  const max = data[0]?.count || 1;
  const min = data[data.length - 1]?.count || 1;
  const items = data.slice(0, maxItems);

  // Map count to font size range: 0.75rem – 2.5rem
  const mapSize = (count: number) => {
    if (max === min) return 1.25;
    const t = (count - min) / (max - min);
    return 0.85 + t * 1.65;
  };

  // Map count to opacity range: 0.55 – 1
  const mapOpacity = (count: number) => {
    if (max === min) return 0.8;
    return 0.55 + ((count - min) / (max - min)) * 0.45;
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 py-4 min-h-[180px] content-center">
      {items.map((d, i) => {
        const size = mapSize(d.count);
        const opacity = mapOpacity(d.count);
        const color = cloudColors[i % cloudColors.length];
        return (
          <span
            key={d.name}
            className="inline-block cursor-default select-none transition-all duration-300 hover:scale-110 hover:opacity-100 font-serif"
            style={{
              fontSize: `${size}rem`,
              color,
              opacity,
              fontWeight: size > 1.8 ? 700 : size > 1.4 ? 600 : 500,
              lineHeight: 1.3,
            }}
            title={`${d.name}: ${d.count}次`}
          >
            {d.name}
          </span>
        );
      })}
    </div>
  );
}

// ─── SVG Donut Chart ───
function DonutChart({ data, colors, total }: {
  data: { label: string; value: number }[];
  colors: string[];
  total: number;
}) {
  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const slices = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0;
    const length = pct * circumference;
    const slice = { ...d, pct, length, offset, color: colors[i % colors.length] };
    offset += length;
    return slice;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
        ) : (
          slices.map((s) => (
            <circle
              key={s.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-700"
            />
          ))
        )}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[11px]">
        {slices.filter(s => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CSS Bar Chart ───
function BarChart({ months, data, maxValue }: {
  months: string[];
  data: number[];
  maxValue: number;
}) {
  const chartMax = maxValue || 1;
  return (
    <div className="flex items-end gap-1.5 h-32 px-1">
      {months.map((m, i) => {
        const pct = Math.max((data[i] / chartMax) * 100, 2);
        const label = monthLabels[m.slice(5)] || m;
        return (
          <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end min-w-0">
            <span className="text-[10px] font-medium text-muted-foreground">{data[i]}</span>
            <div
              className="w-full rounded-t-sm bg-primary/70 hover:bg-primary transition-colors min-w-[18px]"
              style={{ height: `${pct}%` }}
              title={`${label}: ${data[i]}例`}
            />
            <span className="text-[9px] text-muted-foreground/70">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Visualization Tabs ───
type VizTab = "trend" | "status" | "herbs" | "constitution";

// ─── Main Dashboard ───
export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<VizTab>("trend");

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setD(data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  if (!d) return null;

  const trendMax = Math.max(...d.trendData, 1);
  const totalStatus = Object.values(d.statusBreakdown).reduce((a, b) => a + b, 0);
  const statusDonut = Object.entries(d.statusBreakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: statusLabels[k] || k, value: v }));

  const statsCards = [
    { title: "累计患者", value: d.totalPatients, icon: Users, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950" },
    { title: "累计就诊", value: d.totalConsultations, icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950" },
    { title: "今日接诊", value: d.todayPatients, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { title: "处方总数", value: d.totalPrescriptions, icon: Pill, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
    { title: "待确认", value: d.pendingPrescriptions, icon: FileText, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
    { title: "待打印", value: d.pendingPrints, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950" },
  ];

  const tabs: { key: VizTab; label: string; icon: React.ElementType }[] = [
    { key: "trend", label: "就诊趋势", icon: TrendingUp },
    { key: "status", label: "状态分布", icon: Activity },
    { key: "herbs", label: "高频用药", icon: Pill },
    { key: "constitution", label: "体质分布", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif tracking-wide">工作台</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            欢迎回来，<span className="text-foreground font-medium">{user?.name}</span> 医师
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            {format(new Date(), "yyyy年MM月dd日 EEEE", { locale: zhCN })}
          </span>
          <Button onClick={() => router.push("/consultations/new")} size="sm" className="shadow-sm whitespace-nowrap">
            <Stethoscope className="mr-1.5 h-4 w-4" /> 接诊
          </Button>
        </div>
      </div>

      {/* ==================== Stats Cards Row ==================== */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 max-[380px]:grid-cols-1">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-primary/10">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{card.title}</p>
                  <p className="text-xl font-bold font-serif mt-0.5">{card.value}</p>
                </div>
                <div className={`rounded-full p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ==================== Visualization Panel (tabbed) ==================== */}
      <Card className="border-primary/10">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-serif">数据概览</CardTitle>
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Trend */}
          {activeTab === "trend" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">近6个月就诊量变化</p>
              <BarChart months={d.trendMonths} data={d.trendData} maxValue={trendMax} />
            </div>
          )}

          {/* Status */}
          {activeTab === "status" && (
            <div className="flex flex-col items-center">
              <p className="text-xs text-muted-foreground mb-3">全部就诊 {totalStatus} 例</p>
              <DonutChart
                data={statusDonut}
                colors={Object.values(statusColors)}
                total={totalStatus}
              />
            </div>
          )}

          {/* Top Herbs — word cloud */}
          {activeTab === "herbs" && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">近期处方中出现频次</p>
              <WordCloud data={d.topHerbs} />
            </div>
          )}

          {/* Constitution — word cloud */}
          {activeTab === "constitution" && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">按中医体质分类统计</p>
              <WordCloud data={d.constitutionData} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== Recent Consultations ==================== */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-serif">最近就诊</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              最近 8 条就诊记录 · 点击跳转患者详情
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/patients")}>
            全部患者 <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {d.recentConsultations.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">暂无就诊记录</p>
              <p className="text-xs text-muted-foreground/70 mt-1">点击右上角“接诊”按钮开始</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {d.recentConsultations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-primary/10 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    const isDone = c.status === "FINALIZED" || c.status === "ARCHIVED";
                    router.push(isDone ? `/consultations/${c.id}` : `/patients/${c.patient.id}`);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.patient.name}
                        <span className="text-muted-foreground font-normal ml-1.5 text-xs">
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
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
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
