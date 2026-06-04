"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { HerbSelector } from "@/components/consultations/HerbSelector";
import { toast } from "sonner";
import { ArrowLeft, Save, Printer, ShieldAlert, AlertTriangle, CheckCircle, History, Loader2, DollarSign, Sparkles, BookOpen, X, ChevronDown, ChevronUp, MessageSquare, RotateCcw, Send } from "lucide-react";

interface HerbItem { name: string; dose: number; note: string; }
interface ComplianceItem { checkType: string; herbName: string; conflictWith?: string; severity: string; detail: string; }

type MobileTab = "edit" | "compliance" | "price" | "history";

export default function PrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consultation, setConsultation] = useState<Record<string, unknown> | null>(null);
  const [prescriptions, setPrescriptions] = useState<Array<Record<string, unknown>>>([]);
  const [currentVersion, setCurrentVersion] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [clinicName, setClinicName] = useState("");
  const [formulaName, setFormulaName] = useState("");
  const [herbs, setHerbs] = useState<HerbItem[]>([]);
  const [totalDoses, setTotalDoses] = useState(7);
  const [decoctionMethod, setDecoctionMethod] = useState("");
  const [usageInstruction, setUsageInstruction] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [changeDescription, setChangeDescription] = useState("");

  // Compliance
  const [checks, setChecks] = useState<ComplianceItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", desc: "" });

  // Decotion templates
  const [templates, setTemplates] = useState<{
    ai: Array<{ decoctionMethod: string; usageInstruction: string; precautions: string; rationale: string }>;
    history: Array<{ decoctionMethod: string; usageInstruction: string; precautions: string }>;
  }>({ ai: [], history: [] });
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState<"ai" | "history">("ai");
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Price estimation
  const [prices, setPrices] = useState<Record<string, { retailPrice: number | null }>>({});
  const [totalEstimate, setTotalEstimate] = useState(0);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");

  // Feedback
  const [feedbacks, setFeedbacks] = useState<Array<{
    id: string;
    prescriptionId: string;
    pharmacyName: string;
    message: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/doctor/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks((data.feedbacks || []).filter(
          (f: { prescriptionId: string }) => f.prescriptionId === (currentVersion?.id as string)
        ));
      }
    } catch { /* ignore */ }
    finally { setFeedbackLoading(false); }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
    try {
      const res = await fetch(`/api/doctor/feedback/${feedbackId}/resolve`, { method: "POST" });
      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === feedbackId ? { ...f, status: "REVISED" } : f))
        );
        toast.success("已通知药房处方已修改");
      }
    } catch { toast.error("操作失败"); }
  };

  useEffect(() => {
    setClinicName(localStorage.getItem("clinicName") || "");
    fetchData();
  }, [consultationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/consultations/${consultationId}`),
        fetch(`/api/consultations/${consultationId}/prescription`),
      ]);
      if (cRes.ok) setConsultation(await cRes.json());
      if (pRes.ok) {
        const pres = await pRes.json();
        setPrescriptions(pres);
        if (pres.length > 0) {
          const latest = pres[0];
          setCurrentVersion(latest);
          setFormulaName((latest.formulaName as string) || "");
          setTotalDoses((latest.totalDoses as number) || 7);
          setDecoctionMethod((latest.decoctionMethod as string) || "");
          setUsageInstruction((latest.usageInstruction as string) || "");
          setPrecautions((latest.precautions as string) || "");
          try { setHerbs(JSON.parse(latest.herbs as string) || []); } catch { setHerbs([]); }
          // Fetch feedback after currentVersion is set
          setTimeout(() => fetchFeedback(), 100);
        }
      }
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  const runCompliance = useCallback(async () => {
    if (herbs.length === 0) { setChecks([]); return; }
    setChecking(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: currentVersion?.id,
          herbs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
      }
    } catch { /* ignore */ }
    finally { setChecking(false); }
  }, [herbs, consultationId, currentVersion]);

  useEffect(() => {
    const timer = setTimeout(() => runCompliance(), 500);
    return () => clearTimeout(timer);
  }, [herbs, runCompliance]);

  const fetchTemplates = async () => {
    if (herbs.length === 0) { setTemplates({ ai: [], history: [] }); return; }
    setTemplatesLoading(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/decoction-templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates({ ai: data.ai || [], history: data.history || [] });
      }
    } catch { /* */ }
    finally { setTemplatesLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTemplates, 600);
    return () => clearTimeout(timer);
  }, [herbs, consultationId]);

  useEffect(() => {
    const fetchPrices = async () => {
      if (herbs.length === 0) { setPrices({}); setTotalEstimate(0); return; }
      const names = herbs.map((h) => h.name).filter(Boolean);
      if (names.length === 0) return;
      try {
        const res = await fetch("/api/herbs/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ herbNames: names }),
        });
        if (res.ok) {
          const data = await res.json();
          setPrices(data.prices);
          let total = 0;
          for (const h of herbs) {
            const p = data.prices[h.name];
            if (p?.retailPrice) {
              total += p.retailPrice * (h.dose || 0);
            }
          }
          setTotalEstimate(Math.round(total * 100) / 100);
        }
      } catch { /* ignore */ }
    };
    const timer = setTimeout(fetchPrices, 300);
    return () => clearTimeout(timer);
  }, [herbs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formulaName,
          herbs: JSON.stringify(herbs),
          totalDoses,
          decoctionMethod,
          usageInstruction,
          precautions,
          changeDescription,
          source: "DOCTOR",
        }),
      });
      if (!res.ok) { toast.error("保存失败"); return; }
      toast.success("处方已保存为新版本");
      fetchData();
      setChangeDescription("");
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
  };

  const handleFinalize = () => {
    const hasBlockers = checks.some((c) => c.severity === "BLOCK" || c.severity === "DANGER");
    if (hasBlockers) {
      setConfirmDialog({
        open: true,
        title: "高风险用药确认",
        desc: "该处方存在高风险提示，请执业医师确认已完成辨证、剂量、禁忌与患者知情告知。",
      });
    } else {
      setConfirmDialog({
        open: true,
        title: "确认处方",
        desc: "请确认处方、剂量、煎服方法、禁忌及患者信息无误。确认后将生成处方并归档。",
      });
    }
  };

  const handleConfirmFinalize = async () => {
    setConfirmDialog({ ...confirmDialog, open: false });
    try {
      await fetch(`/api/consultations/${consultationId}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formulaName,
          herbs: JSON.stringify(herbs),
          totalDoses,
          decoctionMethod,
          usageInstruction,
          precautions,
          source: "DOCTOR",
          isConfirmed: true,
          changeDescription: "最终确认",
        }),
      });
      toast.success("处方已确认");
      router.push(`/consultations/${consultationId}/print`);
    } catch { toast.error("确认失败"); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const dangerCount = checks.filter((c) => c.severity === "DANGER" || c.severity === "BLOCK").length;
  const warningCount = checks.filter((c) => c.severity === "WARNING").length;
  const patient = consultation?.patient as Record<string, unknown> || {};

  // ─── Shared Templates Dialog ───
  const templatesDialog = templateOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTemplateOpen(false)}>
      <div
        className="bg-card rounded-lg border shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold font-serif">煎服模板</h3>
          <div className="flex items-center gap-1">
            <div className="flex rounded-md border bg-muted p-0.5">
              <button
                type="button"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${templateTab === "ai" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setTemplateTab("ai")}
              >
                <Sparkles className="h-3 w-3" />
                AI推荐
              </button>
              <button
                type="button"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${templateTab === "history" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setTemplateTab("history")}
              >
                <History className="h-3 w-3" />
                历史模板
              </button>
            </div>
            <button
              type="button"
              className="ml-2 p-1.5 rounded-md hover:bg-muted transition-colors"
              onClick={() => setTemplateOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {templateTab === "ai" ? (
            templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">AI生成中...</span>
              </div>
            ) : templates.ai.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">请先添加药物，AI将自动生成煎服建议</p>
              </div>
            ) : (
              templates.ai.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left p-3 rounded-md border hover:border-primary/50 hover:bg-accent transition-colors group"
                  onClick={() => {
                    setDecoctionMethod(t.decoctionMethod);
                    setUsageInstruction(t.usageInstruction);
                    setPrecautions(t.precautions);
                    setTemplateOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {t.rationale}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        <span className="font-medium text-muted-foreground">煎法：</span>
                        {t.decoctionMethod}
                      </p>
                      {t.usageInstruction && (
                        <p className="text-xs leading-relaxed mt-0.5">
                          <span className="font-medium text-muted-foreground">服法：</span>
                          {t.usageInstruction}
                        </p>
                      )}
                      {t.precautions && (
                        <p className="text-xs leading-relaxed mt-0.5 text-muted-foreground/80">
                          <span className="font-medium text-muted-foreground">注意：</span>
                          {t.precautions}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      点击选用
                    </span>
                  </div>
                </button>
              ))
            )
          ) : (
            templates.history.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">暂无历史模板</p>
                <p className="text-xs text-muted-foreground/60 mt-1">保存处方后，煎服方法会自动记录</p>
              </div>
            ) : (
              templates.history.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left p-3 rounded-md border hover:border-primary/50 hover:bg-accent transition-colors group"
                  onClick={() => {
                    setDecoctionMethod(t.decoctionMethod);
                    setUsageInstruction(t.usageInstruction);
                    setPrecautions(t.precautions);
                    setTemplateOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">
                        <span className="font-medium text-muted-foreground">煎法：</span>
                        {t.decoctionMethod}
                      </p>
                      {t.usageInstruction && (
                        <p className="text-xs leading-relaxed mt-0.5">
                          <span className="font-medium text-muted-foreground">服法：</span>
                          {t.usageInstruction}
                        </p>
                      )}
                      {t.precautions && (
                        <p className="text-xs leading-relaxed mt-0.5 text-muted-foreground/80">
                          <span className="font-medium text-muted-foreground">注意：</span>
                          {t.precautions}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      点击选用
                    </span>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );

  // ─── Compliance Panel (shared) ───
  const compliancePanel = (
    <div className="space-y-3">
      {checks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {herbs.length === 0 ? "请先在处方中添加药物" : "✓ 未检测到合规问题"}
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            {dangerCount > 0 && (
              <Badge variant="destructive" className="flex-1 justify-center py-1.5">
                <AlertTriangle className="mr-1 h-3 w-3" /> {dangerCount} 项高风险
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="flex-1 justify-center py-1.5">
                {warningCount} 项警告
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {checks.map((c, i) => (
              <div key={i} className={`rounded-md border p-2.5 text-xs ${c.severity === "BLOCK" ? "border-danger/50 bg-danger/5" : c.severity === "DANGER" ? "border-danger/30 bg-danger/3" : "border-warning/30 bg-warning/3"}`}>
                <p className="font-medium">{c.checkType === "ANTAGONISM" ? "十八反" : c.checkType === "FEAR" ? "十九畏" : c.checkType === "PREGNANCY" ? "妊娠禁忌" : c.checkType === "DOSE_EXCEEDED" ? "超剂量" : c.checkType === "TOXICITY" ? "毒性提示" : c.checkType}</p>
                <p className="text-muted-foreground mt-0.5">{c.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ─── Price Panel (shared) ───
  const pricePanel = (
    <div>
      {herbs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">请先在处方中添加药物</p>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            {herbs.map((h, i) => {
              const p = prices[h.name];
              const unitPrice = p?.retailPrice;
              const lineTotal = unitPrice != null ? Math.round(unitPrice * (h.dose || 0) * 100) / 100 : null;
              return (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                  <span>{h.name} {h.dose}g</span>
                  <span className="text-muted-foreground font-mono">
                    {unitPrice != null ? (
                      <>¥{lineTotal?.toFixed(2)}</>
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>合计</span>
            <span className="text-primary text-lg">¥{totalEstimate.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ×{totalDoses}剂 = ¥{(totalEstimate * totalDoses).toFixed(2)}（仅供参考）
          </p>
        </div>
      )}
    </div>
  );

  // ─── Version History Panel (shared) ───
  const versionPanel = (
    <div>
      {prescriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">暂无历史版本</p>
      ) : (
        <div className="space-y-2">
          {prescriptions.map((p, idx) => (
            <div key={idx} className={`rounded-md border p-2.5 cursor-pointer hover:bg-accent text-sm ${(p.version as number) === (currentVersion?.version as number) ? "border-primary/50 bg-primary/5" : ""}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">v{p.version as number}</span>
                <Badge variant="outline" className="text-[10px]">
                  {p.source as string === "AI" ? "AI草稿" : "医师编辑"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{p.formulaName as string || "未命名方"}</p>
              {(p.isConfirmed as boolean) && <Badge variant="success" className="mt-1 text-[10px]">已确认</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Shared action buttons ───
  const actionButtons = (
    <div className="flex gap-2">
      <Button onClick={handleSave} disabled={saving} className="min-w-0 flex-1">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        <span className="sm:hidden">保存</span>
        <span className="hidden sm:inline">保存为新版本</span>
      </Button>
      <Button variant="default" onClick={handleFinalize} className="min-w-0 flex-1">
        <CheckCircle className="mr-2 h-4 w-4" />
        <span className="sm:hidden">确认</span>
        <span className="hidden sm:inline">确认为终版处方</span>
      </Button>
    </div>
  );

  // ─── Shared edit form fields (used by desktop main editor AND mobile edit tab) ───
  const editFormFields = (
    <>
      {/* Clinic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">诊所信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>诊所名称</Label>
            <Input
              value={clinicName}
              onChange={(e) => { setClinicName(e.target.value); localStorage.setItem("clinicName", e.target.value); }}
              placeholder="深圳同修仁德中医（综合）诊所"
            />
            <p className="text-[10px] text-muted-foreground">处方笺题头显示，留空使用默认名称</p>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis & Symptoms from Consultation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">诊断与症状</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">主诉</Label>
              <p className="text-sm font-medium">{(consultation?.chiefComplaint as string) || "未填写"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">临床诊断</Label>
              <p className="text-sm font-medium text-primary">{(consultation?.doctorFinalPattern as string) || "未确认"}</p>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">现病史</Label>
            <p className="text-sm">{(consultation?.presentIllness as string) || "未填写"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">体质</Label>
              <p className="text-sm">{((consultation?.patient as Record<string, unknown>)?.constitution as string) || ((consultation as Record<string, unknown>)?.constitution as string) || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">过敏史</Label>
              <p className="text-sm text-red-600">{((consultation?.patient as Record<string, unknown>)?.allergies as string) || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">慢性病史</Label>
              <p className="text-sm">{((consultation?.patient as Record<string, unknown>)?.chronicDisease as string) || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formula Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">药方信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-2">
              <Label>方名</Label>
              <Input value={formulaName} onChange={(e) => setFormulaName(e.target.value)} placeholder="如：小柴胡汤加减" />
            </div>
            <div className="space-y-2">
              <Label>剂数</Label>
              <Input type="number" value={totalDoses} onChange={(e) => { const v = e.target.value; if (v === "") { setTotalDoses(0); } else { const n = parseInt(v); if (!isNaN(n) && n >= 0) setTotalDoses(n); } }} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>药物组成</Label>
            <HerbSelector herbs={herbs} onChange={setHerbs} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>煎服方法</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-primary"
                onClick={() => { fetchTemplates(); setTemplateOpen(true); }}
              >
                <BookOpen className="h-3 w-3" />
                模板选择
              </Button>
            </div>
            <Textarea
              value={decoctionMethod}
              onChange={(e) => setDecoctionMethod(e.target.value)}
              placeholder="如：每日1剂，水煎分2次温服"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>用法用量</Label>
            <Input value={usageInstruction} onChange={(e) => setUsageInstruction(e.target.value)} placeholder="如：饭后温服，每日2次" />
          </div>

          <div className="space-y-2">
            <Label>注意事项</Label>
            <Textarea value={precautions} onChange={(e) => setPrecautions(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>修改说明</Label>
            <Input value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="本次修改的内容说明" />
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => router.push(`/consultations/${consultationId}/ai`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold">处方编辑</h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">
              患者：{patient.name as string}
              {((patient as Record<string, unknown>)?._count as Record<string, number>)?.consultations > 1 && (
                <Badge variant="outline" className="ml-1.5 border-amber-500 text-amber-600 text-[10px] align-middle">复诊</Badge>
              )}
              {" · "}版本 v{(currentVersion?.version as number) || 1}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/consultations/${consultationId}/print`)}>
            <Printer className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">预览打印</span>
          </Button>
        </div>
      </div>

      {/* Pharmacy Feedback Alert */}
      {feedbacks.length > 0 && (
        <div className="space-y-2">
          {feedbacks.filter((f) => f.status === "PENDING").map((f) => (
            <div key={f.id} className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <MessageSquare className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-red-700">{f.pharmacyName} 的反馈</span>
                  <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">待处理</Badge>
                </div>
                <p className="text-sm text-red-600">{f.message}</p>
                <p className="text-xs text-red-400 mt-1">
                  {new Date(f.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-100 shrink-0"
                onClick={() => handleResolveFeedback(f.id)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                处方已修改
              </Button>
            </div>
          ))}
          {feedbacks.filter((f) => f.status === "REVISED").map((f) => (
            <div key={f.id} className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-blue-700">{f.pharmacyName} 的反馈</span>
                  <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">已修改</Badge>
                </div>
                <p className="text-sm text-blue-600">{f.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MOBILE LAYOUT ==================== */}
      <div className="pb-28 lg:hidden">
        {/* Tab bar */}
        <div className="flex rounded-lg border bg-muted p-1 sticky top-14 z-30 bg-background/95 backdrop-blur-sm">
          {([
            { key: "edit" as const, label: "处方", icon: BookOpen, badge: null },
            { key: "compliance" as const, label: "合规", icon: ShieldAlert, badge: dangerCount > 0 ? dangerCount : null },
            { key: "price" as const, label: "费用", icon: DollarSign, badge: null },
            { key: "history" as const, label: "历史", icon: History, badge: prescriptions.length > 0 ? prescriptions.length : null },
          ]).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMobileTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-xs font-medium transition-all ${
                mobileTab === key
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {badge != null && (
                <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                  key === "compliance" ? "bg-red-500 text-white" : "bg-primary/20 text-primary"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-4 space-y-4">
          {mobileTab === "edit" && (
            <>
              {editFormFields}
              <div className="sticky bottom-16 bg-background/95 backdrop-blur-sm py-2 border-t z-20 -mx-1 px-1">
                {actionButtons}
              </div>
            </>
          )}

          {mobileTab === "compliance" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  合规校验
                  {checking && <Loader2 className="h-3 w-3 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>{compliancePanel}</CardContent>
            </Card>
          )}

          {mobileTab === "price" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  药费估算（广东参考）
                </CardTitle>
              </CardHeader>
              <CardContent>{pricePanel}</CardContent>
            </Card>
          )}

          {mobileTab === "history" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  版本历史
                </CardTitle>
              </CardHeader>
              <CardContent>{versionPanel}</CardContent>
            </Card>
          )}
        </div>

        {/* Sticky bottom bar for non-edit tabs */}
        {mobileTab !== "edit" && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t z-40 p-3 md:ml-56">
            {actionButtons}
          </div>
        )}
      </div>

      {/* ==================== DESKTOP LAYOUT ==================== */}
      <div className="hidden lg:grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          {editFormFields}
          {actionButtons}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                合规校验
                {checking && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>{compliancePanel}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                药费估算（广东参考）
              </CardTitle>
            </CardHeader>
            <CardContent>{pricePanel}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> 版本历史
              </CardTitle>
            </CardHeader>
            <CardContent>{versionPanel}</CardContent>
          </Card>

          {/* Pharmacy Feedback Panel */}
          {feedbacks.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <MessageSquare className="h-4 w-4" />
                  药房反馈
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {feedbacks.map((f) => (
                    <div
                      key={f.id}
                      className={`rounded-md border p-2.5 text-xs ${
                        f.status === "PENDING"
                          ? "border-red-200 bg-red-50"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-muted-foreground">{f.pharmacyName}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            f.status === "PENDING"
                              ? "border-red-300 text-red-600"
                              : "border-blue-300 text-blue-600"
                          }`}
                        >
                          {f.status === "PENDING" ? "待处理" : "已修改"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{f.message}</p>
                      {f.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full text-xs h-7 border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleResolveFeedback(f.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          标记为已修改
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Templates Dialog */}
      {templatesDialog}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(o) => setConfirmDialog({ ...confirmDialog, open: o })}
        title={confirmDialog.title}
        description={confirmDialog.desc}
        onConfirm={handleConfirmFinalize}
        confirmLabel="确认"
      />
    </div>
  );
}
