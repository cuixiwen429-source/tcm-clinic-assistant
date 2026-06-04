"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, CheckCircle2, ArrowLeft, Pill, Beaker, ShieldAlert, FileText, User, Clock, Send, MessageSquare, RotateCcw, Edit3, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { HerbSelector } from "@/components/consultations/HerbSelector";

interface HerbRaw {
  name: string;
  dose: number;
  note: string;
}

interface HerbDetail {
  name: string;
  dose: number;
  note?: string;
  pharmacopoeiaMin: number | null;
  pharmacopoeiaMax: number | null;
  retailPrice: number | null;
  unit: string;
  subtotal: number | null;
  overdosed: boolean;
  toxicity: string | null;
}

interface FeedbackItem {
  id: string;
  message: string;
  status: string;
  pharmacyName: string;
  createdAt: string;
}

interface PrescriptionDetail {
  id: string;
  consultationId: string;
  formulaName: string | null;
  formulaClass: string | null;
  patientName: string;
  patientGender: string | null;
  patientAge: number | null;
  totalDoses: number;
  decoctionMethod: string | null;
  usageInstruction: string | null;
  precautions: string | null;
  herbs: HerbDetail[];
  herbsRaw: HerbRaw[];
  totalCost: number;
  toxicHerbs: Array<{ name: string; dose: number; toxicity: string }>;
  complianceWarnings: Array<{ herbA: string; herbB: string; severity: string; description: string }>;
  isConfirmed: boolean;
  createdAt: string;
  feedbacks: FeedbackItem[];
}

export default function DoctorPrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Edit form state
  const [editFormulaName, setEditFormulaName] = useState("");
  const [editTotalDoses, setEditTotalDoses] = useState(7);
  const [editDecoctionMethod, setEditDecoctionMethod] = useState("");
  const [editUsageInstruction, setEditUsageInstruction] = useState("");
  const [editPrecautions, setEditPrecautions] = useState("");
  const [editHerbs, setEditHerbs] = useState<HerbRaw[]>([]);

  const loadData = () => {
    setLoading(true);
    fetch(`/api/doctor/prescriptions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast.error(d.error);
          router.push("/prescriptions");
          return;
        }
        setData(d);
        setEditFormulaName(d.formulaName || "");
        setEditTotalDoses(d.totalDoses);
        setEditDecoctionMethod(d.decoctionMethod || "");
        setEditUsageInstruction(d.usageInstruction || "");
        setEditPrecautions(d.precautions || "");
        setEditHerbs(d.herbsRaw || []);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/doctor/prescriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formulaName: editFormulaName,
          totalDoses: editTotalDoses,
          decoctionMethod: editDecoctionMethod,
          usageInstruction: editUsageInstruction,
          precautions: editPrecautions,
          herbs: editHerbs,
          changeDescription: "医师修改处方",
        }),
      });
      if (!res.ok) {
        toast.error("保存失败");
        return;
      }
      toast.success("处方已更新");
      setEditing(false);
      loadData();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
    setResolvingId(feedbackId);
    try {
      const res = await fetch(`/api/doctor/prescriptions/${id}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId }),
      });
      if (!res.ok) throw new Error();
      toast.success("反馈已标记为已解决");
      loadData();
    } catch {
      toast.error("操作失败");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const hasWarnings = data.toxicHerbs.length > 0 || data.complianceWarnings.length > 0;
  const hasOverdoses = data.herbs.some((h) => h.overdosed);
  const pendingFeedbacks = data.feedbacks.filter((f) => f.status === "PENDING");

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回处方列表
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground font-serif">
            {data.formulaName || "未命名方剂"}
            {data.formulaClass && (
              <Badge variant="outline" className="ml-2 border-primary/20 text-primary text-xs align-middle">
                {data.formulaClass}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            处方号: {data.id.slice(-8)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.isConfirmed ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm px-3 py-1.5 gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              已捡药完成
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-200 text-amber-600 text-sm px-3 py-1.5 gap-1.5">
              <Clock className="h-4 w-4" />
              待捡药
            </Badge>
          )}
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit3 className="h-4 w-4 mr-1.5" />
              编辑处方
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <Eye className="h-4 w-4 mr-1.5" />
              查看模式
            </Button>
          )}
        </div>
      </div>

      {/* Patient & Formula Info Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-primary/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">患者</p>
              <p className="font-semibold text-sm truncate">{data.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {data.patientGender || "?"} · {data.patientAge ?? "?"}岁
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <Pill className="h-5 w-5 text-primary/70 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">药材</p>
              <p className="font-semibold text-sm">{data.herbs.length}味</p>
              <p className="text-xs text-muted-foreground">{data.totalDoses}剂</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">总价</p>
            <p className="font-bold text-lg md:text-xl text-primary">¥{data.totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{data.totalDoses}剂合计</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary/70 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">开具时间</p>
              <p className="font-semibold text-sm">
                {new Date(data.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings Banner */}
      {hasWarnings && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
              <ShieldAlert className="h-5 w-5" />
              安全警告
            </div>
            {data.toxicHerbs.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-1.5">毒性药材：</p>
                <div className="flex flex-wrap gap-2">
                  {data.toxicHerbs.map((h) => (
                    <Badge key={h.name} variant="outline" className="border-red-300 bg-red-100 text-red-700 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {h.name} ({h.toxicity}) - 用量{h.dose}g
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {data.complianceWarnings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 mb-1.5">配伍禁忌：</p>
                <div className="space-y-1.5">
                  {data.complianceWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        <strong>{w.herbA}</strong> + <strong>{w.herbB}</strong>
                        <Badge variant="outline" className="ml-1.5 text-[10px] border-red-300 text-red-600 align-middle">
                          {w.severity}
                        </Badge>
                        <br />
                        <span className="text-xs text-red-500">{w.description}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formula Info - Edit mode */}
      {editing ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              编辑药方信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-2">
                <Label>方名</Label>
                <Input value={editFormulaName} onChange={(e) => setEditFormulaName(e.target.value)} placeholder="如：小柴胡汤加减" />
              </div>
              <div className="space-y-2">
                <Label>剂数</Label>
                <Input type="number" value={editTotalDoses} onChange={(e) => { const v = e.target.value; if (v === "") { setEditTotalDoses(0); } else { const n = parseInt(v); if (!isNaN(n) && n >= 0) setEditTotalDoses(n); } }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>药物组成</Label>
              <HerbSelector herbs={editHerbs} onChange={setEditHerbs} />
            </div>
            <div className="space-y-2">
              <Label>煎服方法</Label>
              <Textarea value={editDecoctionMethod} onChange={(e) => setEditDecoctionMethod(e.target.value)} placeholder="如：每日1剂，水煎分2次温服" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>用法用量</Label>
              <Input value={editUsageInstruction} onChange={(e) => setEditUsageInstruction(e.target.value)} placeholder="如：饭后温服，每日2次" />
            </div>
            <div className="space-y-2">
              <Label>注意事项</Label>
              <Textarea value={editPrecautions} onChange={(e) => setEditPrecautions(e.target.value)} placeholder="如：忌辛辣、油腻" rows={2} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              保存修改
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Herb Table - View mode */}
          <Card>
            <CardHeader className="pb-2 px-4 md:px-6 pt-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Pill className="h-5 w-5" />
                药材清单
              </CardTitle>
              <CardDescription className="text-xs">
                {data.totalDoses}剂 · 单价 × 用量 × 剂数 = 小计
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 md:px-2 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-2 font-medium pl-4">药材</th>
                      <th className="pb-2 font-medium text-right hidden sm:table-cell">药典范围</th>
                      <th className="pb-2 font-medium text-right">用量</th>
                      <th className="pb-2 font-medium text-right hidden sm:table-cell">单价</th>
                      <th className="pb-2 font-medium text-right pr-4">小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.herbs.map((h, i) => (
                      <tr
                        key={i}
                        className={`border-b hover:bg-muted/30 ${h.overdosed ? "bg-red-50/50" : ""}`}
                      >
                        <td className="py-2.5 pl-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{h.name}</span>
                            {h.overdosed && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-100 border border-red-200 rounded-full px-1.5 py-0.5 animate-pulse">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                超标
                              </span>
                            )}
                            {h.toxicity && h.toxicity !== "无" && h.toxicity !== "无毒" && (
                              <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-1.5 py-0.5">
                                毒:{h.toxicity}
                              </span>
                            )}
                          </div>
                          {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                          {h.pharmacopoeiaMin != null && h.pharmacopoeiaMax != null
                            ? `${h.pharmacopoeiaMin}–${h.pharmacopoeiaMax}${h.unit}`
                            : "-"}
                        </td>
                        <td className="py-2.5 text-right font-medium">{h.dose}{h.unit}</td>
                        <td className="py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                          {h.retailPrice != null ? `¥${h.retailPrice}` : <span className="text-orange-500">未定价</span>}
                        </td>
                        <td className="py-2.5 text-right font-semibold pr-4">
                          {h.subtotal != null ? `¥${h.subtotal.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={4} className="pt-3 pb-2 text-right font-bold pl-4">
                        {data.totalDoses}剂合计
                      </td>
                      <td className="pt-3 pb-2 text-right font-bold pr-4 text-base">
                        ¥{data.totalCost.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Decoction & Instructions */}
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <Beaker className="h-4 w-4" />
                  煎药方法
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {data.decoctionMethod ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.decoctionMethod}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">未指定煎药方法</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  用法说明
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {data.usageInstruction && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">服用方法</p>
                    <p className="text-sm whitespace-pre-wrap">{data.usageInstruction}</p>
                  </div>
                )}
                {data.precautions && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">注意事项</p>
                    <p className="text-sm whitespace-pre-wrap">{data.precautions}</p>
                  </div>
                )}
                {!data.usageInstruction && !data.precautions && (
                  <p className="text-sm text-muted-foreground italic">未提供用法说明</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Pending Feedback Alert */}
      {pendingFeedbacks.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50/60">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                有 {pendingFeedbacks.length} 条待处理的药房反馈
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                编辑并保存处方将自动将这些反馈标记为已解决
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      <Card id="feedback">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            药房反馈
          </CardTitle>
          <CardDescription className="text-xs">
            药房捡药时提交的反馈意见
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data.feedbacks.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              暂无反馈记录
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.feedbacks.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-lg border p-3 text-sm ${
                    f.status === "PENDING"
                      ? "border-yellow-200 bg-yellow-50/50"
                      : f.status === "REVISED"
                      ? "border-blue-200 bg-blue-50/50"
                      : "border-emerald-100 bg-emerald-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {f.pharmacyName} · {new Date(f.createdAt).toLocaleString("zh-CN")}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          f.status === "PENDING"
                            ? "border-yellow-300 text-yellow-700"
                            : f.status === "REVISED"
                            ? "border-blue-300 text-blue-700"
                            : "border-emerald-300 text-emerald-700"
                        }`}
                      >
                        {f.status === "PENDING" && "待处理"}
                        {f.status === "REVISED" && "已修改"}
                        {f.status === "RESOLVED" && "已解决"}
                      </Badge>
                      {f.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-primary"
                          onClick={() => handleResolveFeedback(f.id)}
                          disabled={resolvingId === f.id}
                        >
                          {resolvingId === f.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          已解决
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                  {f.status === "REVISED" && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      药师已修改处方，请重新审核
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
