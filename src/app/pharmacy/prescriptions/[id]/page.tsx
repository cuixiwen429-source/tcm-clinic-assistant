"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, CheckCircle2, ArrowLeft, Pill, Beaker, ShieldAlert, FileText, User, Clock, Send, MessageSquare, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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
  nature: string | null;
  taste: string | null;
  meridian: string | null;
}

interface ToxicHerb {
  name: string;
  dose: number;
  toxicity: string;
}

interface ComplianceWarning {
  herbA: string;
  herbB: string;
  severity: string;
  description: string;
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
  totalCost: number;
  toxicHerbs: ToxicHerb[];
  complianceWarnings: ComplianceWarning[];
  isConfirmed: boolean;
  createdAt: string;
}

export default function PharmacyPrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Array<{
    id: string;
    message: string;
    status: string;
    pharmacyName: string;
    createdAt: string;
  }>>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const loadFeedback = () => {
    setFeedbackLoading(true);
    fetch(`/api/pharmacy/prescriptions/${id}/feedback`)
      .then((r) => r.json())
      .then((d) => setFeedbackList(d.feedbacks || []))
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
  };

  useEffect(() => {
    fetch(`/api/pharmacy/prescriptions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast.error(d.error);
          router.push("/pharmacy/dashboard");
          return;
        }
        setData(d);
        setConfirmed(d.isConfirmed);
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false));
    loadFeedback();
  }, [id, router]);

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      const res = await fetch(`/api/pharmacy/prescriptions/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "发送失败");
        return;
      }
      const newFeedback = await res.json();
      setFeedbackList((prev) => [newFeedback, ...prev]);
      setFeedbackText("");
      toast.success("反馈已发送给药师");
    } catch {
      toast.error("网络错误");
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleConfirmPickup = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/pharmacy/prescriptions/${id}/pickup`, { method: "POST" });
      if (!res.ok) throw new Error();
      setConfirmed(true);
      toast.success("已确认捡药，处方标记为完成");
    } catch {
      toast.error("操作失败");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) return null;

  const hasWarnings = data.toxicHerbs.length > 0 || data.complianceWarnings.length > 0;
  const hasOverdoses = data.herbs.some((h) => h.overdosed);

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-emerald-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-900">
            {data.formulaName || "未命名方剂"}
            {data.formulaClass && (
              <Badge variant="outline" className="ml-2 border-emerald-200 text-emerald-600 text-xs align-middle">
                {data.formulaClass}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-emerald-600 mt-0.5">
            处方号: {data.id.slice(-8)}
          </p>
        </div>
        {confirmed ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm px-3 py-1.5 gap-1.5 w-fit">
            <CheckCircle2 className="h-4 w-4" />
            已捡药完成
          </Badge>
        ) : (
          <Button
            onClick={handleConfirmPickup}
            disabled={confirming}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            标记为已捡药
          </Button>
        )}
      </div>

      {/* Patient & Formula Info Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-emerald-200">
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">患者</p>
              <p className="font-semibold text-sm text-emerald-900 truncate">{data.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {data.patientGender || "?"} · {data.patientAge ?? "?"}岁
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <Pill className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">药材</p>
              <p className="font-semibold text-sm text-emerald-900">{data.herbs.length}味</p>
              <p className="text-xs text-muted-foreground">{data.totalDoses}剂</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">总价</p>
            <p className="font-bold text-lg md:text-xl text-emerald-700">¥{data.totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{data.totalDoses}剂合计</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">开具时间</p>
              <p className="font-semibold text-sm text-emerald-900">
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

      {/* Herb Table */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2 px-4 md:px-6 pt-4">
          <CardTitle className="text-base md:text-lg text-emerald-800 flex items-center gap-2">
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
                <tr className="border-b border-emerald-100 text-left text-emerald-600 text-xs">
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
                    className={`border-b border-emerald-50 hover:bg-emerald-50/30 ${
                      h.overdosed ? "bg-red-50/50" : ""
                    }`}
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
                      <div className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                        {h.pharmacopoeiaMin != null && h.pharmacopoeiaMax != null
                          ? `药典 ${h.pharmacopoeiaMin}–${h.pharmacopoeiaMax}${h.unit}`
                          : "药典无数据"}
                        {h.retailPrice != null && ` · ¥${h.retailPrice}/${h.unit}`}
                      </div>
                      {h.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                      {h.pharmacopoeiaMin != null && h.pharmacopoeiaMax != null
                        ? `${h.pharmacopoeiaMin}–${h.pharmacopoeiaMax}${h.unit}`
                        : "-"}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {h.dose}{h.unit}
                    </td>
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
                <tr className="border-t-2 border-emerald-200">
                  <td colSpan={4} className="pt-3 pb-2 text-right font-bold text-emerald-800 pl-4">
                    {data.totalDoses}剂合计
                  </td>
                  <td className="pt-3 pb-2 text-right font-bold text-emerald-800 pr-4 text-base">
                    ¥{data.totalCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Decoction Method & Instructions */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <Card className="border-emerald-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm md:text-base text-emerald-800 flex items-center gap-2">
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

        <Card className="border-emerald-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm md:text-base text-emerald-800 flex items-center gap-2">
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

      {/* Pickup Confirmation */}
      {!confirmed && (
        <Card className={`border-2 ${hasWarnings || hasOverdoses ? "border-yellow-200 bg-yellow-50/30" : "border-emerald-200"}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-base md:text-lg text-emerald-900">
                  {hasWarnings || hasOverdoses ? "存在安全风险，确认仍要捡药？" : "确认捡药"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {hasWarnings
                    ? "已标记毒性药材和配伍禁忌，请确认医师已知晓相关风险。"
                    : "确认所有药材已核对无误，完成捡药。"}
                </p>
                {(hasWarnings || hasOverdoses) && (
                  <ul className="mt-2 text-sm text-yellow-700 space-y-0.5 list-disc list-inside">
                    {hasOverdoses && <li>存在药材超出药典推荐剂量范围</li>}
                    {data.toxicHerbs.length > 0 && (
                      <li>{data.toxicHerbs.length}味药材具有毒性标注</li>
                    )}
                    {data.complianceWarnings.length > 0 && (
                      <li>{data.complianceWarnings.length}条配伍禁忌规则</li>
                    )}
                  </ul>
                )}
              </div>
              <Button
                onClick={handleConfirmPickup}
                disabled={confirming}
                className={`shrink-0 w-full sm:w-auto ${
                  hasWarnings || hasOverdoses
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                确认已捡药
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      <Card className="border-emerald-200" id="feedback">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm md:text-base text-emerald-800 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            反馈给药师
          </CardTitle>
          <CardDescription className="text-xs">
            如处方存在问题，可在此反馈，药师将收到通知并修改处方
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Feedback input */}
          {!confirmed && (
            <div className="flex gap-2">
              <Textarea
                placeholder="输入反馈内容，如：药材A用量超标、缺少某味药..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[60px] text-sm flex-1"
                rows={2}
              />
              <Button
                onClick={handleSendFeedback}
                disabled={sendingFeedback || !feedbackText.trim()}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 self-end"
                size="sm"
              >
                {sendingFeedback ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-1.5">发送</span>
              </Button>
            </div>
          )}

          <Separator className="bg-emerald-100" />

          {/* Feedback list */}
          {feedbackLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            </div>
          ) : feedbackList.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-2">
              暂无反馈记录
            </p>
          ) : (
            <div className="space-y-2.5">
              {feedbackList.map((f) => (
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
