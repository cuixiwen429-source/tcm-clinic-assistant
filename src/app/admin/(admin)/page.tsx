"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Stethoscope, Pill, UserRound, TrendingUp,
  Activity, Clock, RefreshCw, CalendarCheck, Leaf,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface AdminData {
  totalUsers: number; totalPatients: number; totalConsultations: number; totalPrescriptions: number;
  todayConsultations: number; todayPrescriptions: number;
  usersByRole: { role: string; count: number }[];
  recentConsultations: { id: string; visitDate: string; chiefComplaint: string | null; status: string; patient: string; doctor: string }[];
  monthlyConsultations: { month: string; count: number }[];
  topDoctors: { id: string; name: string; role: string; consultations: number }[];
  prescriptionsByDoctor: { doctorId: string; doctorName: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  topHerbs: { name: string; count: number }[];
  updatedAt: string;
}

const roleLabels: Record<string, string> = { ADMIN: "管理员", DOCTOR: "医师", ASSISTANT: "助理" };
const statusLabels: Record<string, string> = {
  DRAFT: "草稿", AI_ASSISTED: "AI辅助", PRESCRIBED: "已处方", FINALIZED: "已完成", ARCHIVED: "已归档",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9CA3AF", AI_ASSISTED: "#818CF8", PRESCRIBED: "#F59E0B", FINALIZED: "#10B981", ARCHIVED: "#6B7280",
};
const HERB_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#a855f7",
  "#f43f5e", "#6366f1",
];

const CHART_THEME = {
  grid: "#e5e7eb",
  axis: "#9ca3af",
  tooltip: { bg: "#ffffff", border: "#e5e7eb" },
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(30);

  const fetchData = useCallback(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setData(d); setLastRefresh(new Date()); } })
      .finally(() => setLoading(false));
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { fetchData(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusPieData = data.statusBreakdown.map(s => ({
    name: statusLabels[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || "#9CA3AF",
  }));

  const trendData = data.monthlyConsultations.map(m => ({
    month: m.month.slice(5) + "月",
    count: m.count,
  }));

  const doctorBarData = data.topDoctors.map(d => ({
    name: d.name.length > 4 ? d.name.slice(0, 3) + "…" : d.name,
    fullName: d.name,
    consultations: d.consultations,
  }));

  const herbData = data.topHerbs.map(h => ({
    name: h.name.length > 4 ? h.name.slice(0, 3) + "…" : h.name,
    fullName: h.name,
    count: h.count,
  }));

  const totalStatus = data.statusBreakdown.reduce((a, b) => a + b.count, 0);
  const activeStatusCount = data.statusBreakdown
    .filter(s => s.status === "DRAFT" || s.status === "AI_ASSISTED" || s.status === "PRESCRIBED")
    .reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold font-serif tracking-wide flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            实时监控中心
            <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">中医诊疗数据实时监控与分析平台</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1">
            <Clock className="h-3 w-3" />
            <span>{lastRefresh.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full px-3 py-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>{countdown}s</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { title: "今日就诊", value: data.todayConsultations, icon: CalendarCheck, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30", ring: "ring-sky-200" },
          { title: "今日处方", value: data.todayPrescriptions, icon: Pill, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", ring: "ring-amber-200" },
          { title: "进行中", value: activeStatusCount, icon: Activity, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", ring: "ring-violet-200" },
          { title: "注册医师", value: data.totalUsers, icon: UserRound, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", ring: "ring-emerald-200" },
          { title: "患者总数", value: data.totalPatients, icon: Users, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30", ring: "ring-rose-200" },
          { title: "累计处方", value: data.totalPrescriptions, icon: Leaf, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30", ring: "ring-teal-200" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={`border-primary/10 hover:shadow-md transition-shadow duration-300 ${card.ring} ring-1`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{card.title}</p>
                  <p className="text-2xl font-bold font-mono tracking-tight mt-1">{card.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card className="border-primary/10">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              月度就诊趋势
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke={CHART_THEME.axis} />
                <YAxis tick={{ fontSize: 12 }} stroke={CHART_THEME.axis} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: `1px solid ${CHART_THEME.tooltip.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v) => [`${v} 次`, "就诊量"]}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5}
                  fill="url(#colorCount)" dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-primary/10">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              就诊状态分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-2">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                    paddingAngle={2} dataKey="value"
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: `1px solid ${CHART_THEME.tooltip.border}` }}
                    formatter={(v, _, item: any) => [`${v} 次 (${totalStatus > 0 ? ((Number(v) / totalStatus) * 100).toFixed(1) : 0}%)`, item.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 text-xs flex-1">
                {statusPieData.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="font-mono font-medium ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Doctor Ranking */}
        <Card className="border-primary/10">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              医师接诊排行
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.topDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={doctorBarData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} strokeOpacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke={CHART_THEME.axis} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke={CHART_THEME.axis} width={50} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: `1px solid ${CHART_THEME.tooltip.border}` }}
                    formatter={(v, _, item: any) => [`${v} 次`, item.payload.fullName || item.payload.name]}
                  />
                  <Bar dataKey="consultations" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" fillOpacity={0.75} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Herbs */}
        <Card className="border-primary/10">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              高频用药排行
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.topHerbs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={herbData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} strokeOpacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke={CHART_THEME.axis} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke={CHART_THEME.axis} width={50} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: `1px solid ${CHART_THEME.tooltip.border}` }}
                    formatter={(v, _, item: any) => [`${v} 次`, item.payload.fullName || item.payload.name]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                    {herbData.map((_, i) => (
                      <Cell key={i} fill={HERB_COLORS[i % HERB_COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent + Prescriptions Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Consultations */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">实时就诊记录</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentConsultations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">暂无记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 font-medium">患者</th>
                      <th className="text-left py-2 font-medium hidden sm:table-cell">主诉</th>
                      <th className="text-left py-2 font-medium">医师</th>
                      <th className="text-left py-2 font-medium">状态</th>
                      <th className="text-right py-2 font-medium hidden sm:table-cell">日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentConsultations.map(c => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 font-medium">{c.patient}</td>
                        <td className="py-2.5 text-muted-foreground truncate max-w-40 hidden sm:table-cell">{c.chiefComplaint || "-"}</td>
                        <td className="py-2.5">{c.doctor}</td>
                        <td className="py-2.5">
                          <Badge variant="outline" className="text-[10px]"
                            style={{ borderColor: STATUS_COLORS[c.status] || "#9CA3AF", color: STATUS_COLORS[c.status] }}>
                            {statusLabels[c.status] || c.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground text-xs hidden sm:table-cell">
                          {new Date(c.visitDate).toLocaleDateString("zh-CN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescription Stats */}
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif">医师处方统计</CardTitle>
          </CardHeader>
          <CardContent>
            {data.prescriptionsByDoctor.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {data.prescriptionsByDoctor.map((p, i) => {
                  const max = data.prescriptionsByDoctor[0]?.count || 1;
                  const pct = (p.count / max) * 100;
                  return (
                    <div key={p.doctorId} className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs font-mono text-muted-foreground">{i + 1}</span>
                      <span className="w-16 truncate text-sm font-medium">{p.doctorName}</span>
                      <div className="flex-1 h-6 bg-muted/60 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.9))`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm font-mono font-medium">{p.count}<span className="text-xs text-muted-foreground"> 张</span></span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
