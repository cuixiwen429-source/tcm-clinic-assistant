"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AIDisclaimer } from "@/components/shared/AIDisclaimer";
import { VoiceInput } from "@/components/consultations/VoiceInput";
import { toast } from "sonner";
import { ArrowLeft, Brain, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import {
  getConsultationResumeHref,
  hasConsultationEditedHistory,
} from "@/lib/consultations/progress";

export default function AIAssistancePage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<Record<string, unknown> | null>(null);
  const [differentiating, setDifferentiating] = useState(false);
  const [differentiations, setDifferentiations] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [generatingFormula, setGeneratingFormula] = useState(false);
  const [formulas, setFormulas] = useState<Array<Record<string, unknown>> | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [supplementText, setSupplementText] = useState("");
  const [supplementing, setSupplementing] = useState(false);
  const [supplementOpen, setSupplementOpen] = useState(false);
  const [synthesizedHistory, setSynthesizedHistory] = useState<Record<string, unknown> | null>(null);
  const [finalPattern, setFinalPattern] = useState("");
  const [savingPattern, setSavingPattern] = useState(false);

  useEffect(() => {
    fetchConsultation();
  }, [consultationId]);

  // Redirect finalized/archived consultations to read-only detail view
  useEffect(() => {
    if (consultation) {
      const status = consultation.status as string;
      if (status === "FINALIZED" || status === "ARCHIVED") {
        router.replace(`/consultations/${consultationId}`);
      } else if (!hasConsultationEditedHistory(consultation)) {
        router.replace(getConsultationResumeHref(consultationId, consultation));
      }
    }
  }, [consultation, consultationId, router]);

  const fetchConsultation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`);
      if (res.ok) {
        const data = await res.json();
        setConsultation(data);

        // Load existing differentiations
        if (data.huXishuAnalysis) {
          setDifferentiations({
            huXishu: JSON.parse(data.huXishuAnalysis),
            zhangXichun: JSON.parse(data.zhangXichunAnalysis || "{}"),
            niHaixia: JSON.parse(data.niHaixiaAnalysis || "{}"),
            liKe: JSON.parse(data.liKeAnalysis || "{}"),
          });
        }

        // Pre-populate finalPattern from saved diagnosis or first AI analysis
        if (data.doctorFinalPattern) {
          setFinalPattern(data.doctorFinalPattern);
        } else {
          const analyses = [data.huXishuAnalysis, data.zhangXichunAnalysis, data.niHaixiaAnalysis, data.liKeAnalysis];
          for (const a of analyses) {
            if (a) {
              try {
                const parsed = JSON.parse(a);
                if (parsed.pattern) { setFinalPattern(parsed.pattern); break; }
              } catch { /* */ }
            }
          }
        }
      }
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  const handleDifferentiate = async () => {
    setDifferentiating(true);
    try {
      const patient = consultation?.patient as Record<string, unknown> | undefined;
      const body: Record<string, unknown> = {
        editedHistory: consultation?.editedHistory,
        patientName: patient?.name,
        patientGender: patient?.gender,
        patientAge: patient?.age,
        patientConstitution: patient?.constitution,
        tongueAnalysis: consultation?.tongueAnalysis,
        faceAnalysis: consultation?.faceAnalysis,
        patientId: consultation?.patientId,
      };
      const res = await fetch(`/api/consultations/${consultationId}/differentiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("AI辨证失败"); return; }
      const data = await res.json();
      setDifferentiations(data);
      // Also merge differentiation results into consultation state so formula step has them
      setConsultation(prev => prev ? { ...prev,
        huXishuAnalysis: data.huXishu ? JSON.stringify(data.huXishu) : prev.huXishuAnalysis,
        zhangXichunAnalysis: data.zhangXichun ? JSON.stringify(data.zhangXichun) : prev.zhangXichunAnalysis,
        niHaixiaAnalysis: data.niHaixia ? JSON.stringify(data.niHaixia) : prev.niHaixiaAnalysis,
        liKeAnalysis: data.liKe ? JSON.stringify(data.liKe) : prev.liKeAnalysis,
      } : null);
      toast.success("辨证完成");
    } catch { toast.error("网络错误"); }
    finally { setDifferentiating(false); }
  };

  const handleGenerateFormula = async () => {
    setGeneratingFormula(true);
    try {
      const patient = consultation?.patient as Record<string, unknown> | undefined;
      // Use differentiation results from state (already rendered on page) — these are available
      // regardless of whether the DB has them (cold start resilience)
      const diffs = differentiations;
      const body: Record<string, unknown> = {
        patientName: patient?.name,
        patientGender: patient?.gender,
        patientAge: patient?.age,
        patientConstitution: patient?.constitution,
        tongueAnalysis: consultation?.tongueAnalysis,
        faceAnalysis: consultation?.faceAnalysis,
        editedHistory: consultation?.editedHistory,
        huXishuAnalysis: diffs?.huXishu ? JSON.stringify(diffs.huXishu) : consultation?.huXishuAnalysis,
        zhangXichunAnalysis: diffs?.zhangXichun ? JSON.stringify(diffs.zhangXichun) : consultation?.zhangXichunAnalysis,
        niHaixiaAnalysis: diffs?.niHaixia ? JSON.stringify(diffs.niHaixia) : consultation?.niHaixiaAnalysis,
        liKeAnalysis: diffs?.liKe ? JSON.stringify(diffs.liKe) : consultation?.liKeAnalysis,
        doctorFinalPattern: consultation?.doctorFinalPattern,
        doctorFinalPathogenesis: consultation?.doctorFinalPathogenesis,
        patientId: consultation?.patientId,
      };
      const res = await fetch(`/api/consultations/${consultationId}/formula`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("AI选方失败"); return; }
      const data = await res.json();
      setFormulas(data);
      toast.success("方剂推荐完成");
    } catch { toast.error("网络错误"); }
    finally { setGeneratingFormula(false); }
  };

  const handleAdoptFormula = async (formula: Record<string, unknown>) => {
    setAdopting(true);
    try {
      const herbs = formula.herbs as Array<Record<string, unknown>> || [];
      const res = await fetch(`/api/consultations/${consultationId}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formulaName: formula.formula_name,
          formulaClass: formula.plan_type,
          herbs: JSON.stringify(herbs.map((h: Record<string, unknown>) => ({
            name: h.name, dose: h.dose, note: h.note || ""
          }))),
          source: "AI",
          decoctionMethod: "",
          usageInstruction: "",
        }),
      });
      if (!res.ok) { toast.error("创建处方草稿失败"); return; }
      toast.success("已采用为处方草稿");
      router.push(`/consultations/${consultationId}/prescription`);
    } catch { toast.error("网络错误"); }
    finally { setAdopting(false); }
  };

  const handleSaveFinalPattern = async () => {
    if (!finalPattern.trim()) { toast.error("请输入或选择中医诊断"); return; }
    setSavingPattern(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: consultation?.patientId, doctorFinalPattern: finalPattern.trim() }),
      });
      if (!res.ok) { toast.error("保存诊断失败"); return; }
      const updated = { ...(consultation || {}), doctorFinalPattern: finalPattern.trim() };
      setConsultation(updated);
      toast.success("最终诊断已确认");
    } catch { toast.error("网络错误"); }
    finally { setSavingPattern(false); }
  };

  const handleSupplement = async () => {
    if (!supplementText.trim() || supplementText.trim().length < 5) {
      toast.error("追加信息过短，请输入至少5个字符");
      return;
    }
    setSupplementing(true);
    try {
      const patient = consultation?.patient as Record<string, unknown> | undefined;
      const body: Record<string, unknown> = {
        supplementText,
        patientId: consultation?.patientId,
        patientName: patient?.name,
        patientGender: patient?.gender,
        patientAge: patient?.age,
        patientConstitution: patient?.constitution,
        patientAllergies: patient?.allergies,
        patientChronicDisease: patient?.chronicDisease,
        editedHistory: consultation?.editedHistory,
        chiefComplaint: consultation?.chiefComplaint,
        presentIllness: consultation?.presentIllness,
        symptomSummary: consultation?.symptomSummary,
        constitution: consultation?.constitution,
        tongueAnalysis: consultation?.tongueAnalysis,
        faceAnalysis: consultation?.faceAnalysis,
      };
      const res = await fetch(`/api/consultations/${consultationId}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "AI处理失败");
        return;
      }
      const result = await res.json();
      setSynthesizedHistory(result);
      toast.success("综合汇总完成，已生成最终版结构化病例");
      setSupplementText("");
      setSupplementOpen(false);
      // Reset differentiations and formulas so user re-runs them with new info
      setDifferentiations(null);
      setFormulas(null);
    } catch { toast.error("AI处理失败，请重试"); }
    finally { setSupplementing(false); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (
    consultation &&
    !["FINALIZED", "ARCHIVED"].includes((consultation.status as string) || "") &&
    !hasConsultationEditedHistory(consultation)
  ) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在返回问诊流程...
      </div>
    );
  }

  const patient = consultation?.patient as Record<string, unknown> || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => router.push("/patients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">AI辨证辅助</h1>
          <p className="text-muted-foreground text-xs sm:text-sm truncate">
            患者：{patient.name as string} · 主诉：{(consultation?.chiefComplaint as string) || "未填写"}
          </p>
        </div>
      </div>
      <AIDisclaimer />

      {/* Tongue Image & Analysis Display */}
      {(consultation?.tongueImage as string || consultation?.tongueAnalysis as string) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">舌诊信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              try {
                const ti = consultation?.tongueImage as string;
                if (!ti) return null;
                const urls: string[] = JSON.parse(ti);
                if (!Array.isArray(urls) || urls.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`舌苔照片 ${i + 1}`}
                        className="h-32 w-32 rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(url, "_blank")}
                      />
                    ))}
                  </div>
                );
              } catch {
                // Fallback: old single-image format
                const url = consultation?.tongueImage as string;
                if (!url) return null;
                return (
                  <img
                    src={url}
                    alt="舌苔照片"
                    className="h-48 w-48 rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(url, "_blank")}
                  />
                );
              }
            })()}
            {(() => {
              try {
                const ta = consultation?.tongueAnalysis as string;
                if (!ta) return null;
                const t = JSON.parse(ta);
                const sa = t?.syndrome_analysis as Record<string, unknown> | undefined;
                return (
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {t?.tongue_body && <p>舌质：{((t.tongue_body as Record<string, unknown>).color as string) || "？"}，{((t.tongue_body as Record<string, unknown>).shape as string[])?.join("、") || ""}</p>}
                    {t?.tongue_coating && <p>舌苔：{((t.tongue_coating as Record<string, unknown>).color as string) || "？"}，{((t.tongue_coating as Record<string, unknown>).coating_type as string[])?.join("、") || ""}</p>}
                    {sa && <p>辨证：{sa.overall_description as string || ""}</p>}
                    {sa?.likely_patterns && <p>证型：{(sa.likely_patterns as string[])?.join("、")}</p>}
                    {sa?.treatment_principle && <p>治则：{sa.treatment_principle as string}</p>}
                  </div>
                );
              } catch { return null; }
            })()}
          </CardContent>
        </Card>
      )}

      {/* Face Image & Analysis Display */}
      {(consultation?.faceImage as string || consultation?.faceAnalysis as string) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">面诊信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              try {
                const fi = consultation?.faceImage as string;
                if (!fi) return null;
                const urls: string[] = JSON.parse(fi);
                if (!Array.isArray(urls) || urls.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`面相照片 ${i + 1}`}
                        className="h-32 w-32 rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(url, "_blank")}
                      />
                    ))}
                  </div>
                );
              } catch {
                // Fallback: old single-image format
                const url = consultation?.faceImage as string;
                if (!url) return null;
                return (
                  <img
                    src={url}
                    alt="面相照片"
                    className="h-48 w-48 rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(url, "_blank")}
                  />
                );
              }
            })()}
            {(() => {
              try {
                const fa = consultation?.faceAnalysis as string;
                if (!fa) return null;
                const f = JSON.parse(fa);
                const sa = f?.syndrome_analysis as Record<string, unknown> | undefined;
                return (
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {f?.facial_color && <p>面色：{((f.facial_color as Record<string, unknown>).overall_color as string) || "？"}，{((f.facial_color as Record<string, unknown>).luster as string) || ""}</p>}
                    {f?.facial_morphology && <p>形态：{((f.facial_morphology as Record<string, unknown>).overall as string) || ""}</p>}
                    {sa && <p>辨证：{sa.overall_impression as string || ""}</p>}
                    {sa?.likely_patterns && <p>证型：{(sa.likely_patterns as string[])?.join("、")}</p>}
                    {sa?.treatment_principle && <p>治则：{sa.treatment_principle as string}</p>}
                  </div>
                );
              } catch { return null; }
            })()}
          </CardContent>
        </Card>
      )}

      {/* Supplement Info Card */}
      {!supplementOpen ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setSupplementOpen(true)} disabled={supplementing}>
            追加补充信息
          </Button>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">追加补充信息</CardTitle>
            <CardDescription>
              发现遗漏或需要补充的病情信息？在此输入，AI将重新结构化病史。建议补充后重新运行辨证分析。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">补充信息</span>
              <VoiceInput
                onAppend={(text) => setSupplementText(prev => prev + text)}
                disabled={supplementing}
              />
            </div>
            <Textarea
              placeholder="请输入需要追加的病情信息，如：补充舌脉情况、追加饮食习惯、补充既往用药史...也可点击右上角【语音输入】录入"
              value={supplementText}
              onChange={(e) => setSupplementText(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSupplementOpen(false); setSupplementText(""); }}>
                取消
              </Button>
              <Button size="sm" onClick={handleSupplement} disabled={supplementing}>
                {supplementing ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> 处理中...</>
                ) : "提交追加，重新结构化"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Synthesized Final History */}
      {synthesizedHistory && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">最终版结构化病例（综合汇总）</CardTitle>
            </div>
            <CardDescription>
              {synthesizedHistory.merge_notes as string}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">主诉</span>
                <p className="text-sm font-medium">{synthesizedHistory.chief_complaint as string}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">体质特征</span>
                <p className="text-sm">{synthesizedHistory.constitution as string || "-"}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">现病史</span>
              <p className="text-sm">{synthesizedHistory.present_illness as string}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              {Object.entries((synthesizedHistory.symptom_summary as Record<string, string>) || {}).map(([key, val]) => (
                <div key={key}>
                  <span className="text-xs text-muted-foreground capitalize">{key}</span>
                  <p className="text-sm">{val || "-"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!differentiations ? (
        <Card>
          <CardHeader>
            <CardTitle>四大体系辨证</CardTitle>
            <CardDescription>
              基于结构化病史，AI将同时调用胡希恕、张锡纯、倪海厦、李可四大经方体系进行分析
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Button onClick={handleDifferentiate} disabled={differentiating} size="lg">
              {differentiating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI辨证分析中...</>
              ) : "开始AI辨证分析"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs defaultValue="huXishu">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="huXishu" className="text-xs sm:text-sm py-2">胡希恕·六经</TabsTrigger>
              <TabsTrigger value="zhangXichun" className="text-xs sm:text-sm py-2">张锡纯·参西</TabsTrigger>
              <TabsTrigger value="niHaixia" className="text-xs sm:text-sm py-2">倪海厦·人纪</TabsTrigger>
              <TabsTrigger value="liKe" className="text-xs sm:text-sm py-2">李可·扶阳</TabsTrigger>
            </TabsList>

            {(["huXishu", "zhangXichun", "niHaixia", "liKe"] as const).map((key) => {
              const d = differentiations[key];
              if (!d || d.error) return (
                <TabsContent key={key} value={key}>
                  <Card><CardContent className="py-8 text-center text-muted-foreground">
                    {String(d?.error || "分析暂不可用")}
                  </CardContent></Card>
                </TabsContent>
              );

              return (
                <TabsContent key={key} value={key}>
                  <Card>
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{d.pattern as string}</h3>
                        <Badge variant={Number(d.match_score) >= 70 ? "success" : "warning"}>
                          匹配度 {String(d.match_score)}%
                        </Badge>
                      </div>

                      <div className="grid gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground">方证匹配</span>
                          <p className="text-sm">{d.formula_match as string}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">关键症状依据</span>
                          <p className="text-sm">{d.key_symptoms as string}</p>
                        </div>

                        {(d.classic_reference as string) && (
                          <div>
                            <span className="text-xs text-muted-foreground">经典条文参考</span>
                            <p className="text-sm italic">{d.classic_reference as string}</p>
                          </div>
                        )}

                        {(d.qi_blood_analysis as string) && (
                          <div>
                            <span className="text-xs text-muted-foreground">气机气血分析</span>
                            <p className="text-sm">{d.qi_blood_analysis as string}</p>
                          </div>
                        )}

                        {(d.drug_pairs as string[]) && (
                          <div>
                            <span className="text-xs text-muted-foreground">可选药对</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(d.drug_pairs as string[]).map((dp, i) => (
                                <Badge key={i} variant="outline">{dp}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {(d.modification_direction as string) && (
                          <div>
                            <span className="text-xs text-muted-foreground">化裁方向</span>
                            <p className="text-sm">{d.modification_direction as string}</p>
                          </div>
                        )}

                        {(d.disease_extension as string) && (
                          <div>
                            <span className="text-xs text-muted-foreground">病证延伸</span>
                            <p className="text-sm">{d.disease_extension as string}</p>
                          </div>
                        )}

                        {(d.transmission_risk as string) && (
                          <div>
                            <span className="text-xs text-muted-foreground">传变风险</span>
                            <p className="text-sm text-warning">{d.transmission_risk as string}</p>
                          </div>
                        )}

                        {(d.contraindication_warning as string) && (
                          <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="h-4 w-4 text-danger" />
                              <span className="text-xs font-medium text-danger">禁忌预警</span>
                            </div>
                            <p className="text-sm">{d.contraindication_warning as string}</p>
                          </div>
                        )}

                        {(d.fuyang_analysis as string) && (
                          <div>
                            <span className="text-xs text-muted-foreground">扶阳分析</span>
                            <p className="text-sm">{d.fuyang_analysis as string}</p>
                          </div>
                        )}

                        {(d.severe_mode_note as string) && (
                          <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
                            <p className="text-sm font-medium text-danger">重症版提示</p>
                            <p className="text-sm text-muted-foreground">{d.severe_mode_note as string}</p>
                          </div>
                        )}
                      </div>

                      {(d.doctor_checkpoints as string[]) && (
                        <>
                          <Separator />
                          <div>
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> 医生需确认项
                            </span>
                            <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                              {(d.doctor_checkpoints as string[]).map((cp, i) => (
                                <li key={i}>{cp}</li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          {/* Final Diagnosis Confirmation */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">确认最终辨证诊断</CardTitle>
              </div>
              <CardDescription>
                请从四大体系辨证结果中选择最终诊断，或手动录入。该诊断将显示在处方笺“临床诊断”栏中。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI pattern suggestions */}
              <div className="flex flex-wrap gap-2">
                {(differentiations && ["huXishu", "zhangXichun", "niHaixia", "liKe"] as const).map((key) => {
                  const d = differentiations[key];
                  if (!d || d.error || !d.pattern) return null;
                  const label = key === "huXishu" ? "胡希恕" : key === "zhangXichun" ? "张锡纯" : key === "niHaixia" ? "倪海厦" : "李可";
                  const isActive = finalPattern === (d.pattern as string);
                  return (
                    <Badge
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1.5 px-3 hover:bg-primary/10 transition-colors"
                      onClick={() => setFinalPattern(d.pattern as string)}
                    >
                      {label}：{d.pattern as string}
                    </Badge>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={finalPattern}
                  onChange={(e) => setFinalPattern(e.target.value)}
                  placeholder="确认或填写最终中医诊断，如：太阳阳明合病，葛根汤证"
                  className="flex-1"
                />
                <Button onClick={handleSaveFinalPattern} disabled={savingPattern} className="w-full sm:w-auto">
                  {savingPattern ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-2 h-3 w-3" />}
                  确认诊断
                </Button>
              </div>

              {(consultation?.doctorFinalPattern as string) && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  已确认诊断：{consultation?.doctorFinalPattern as string}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formula Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle>分层选方推荐</CardTitle>
              <CardDescription>
                AI根据辨证结果推荐4套候选方案（按疗效匹配度排序），医师选择后采用为草稿
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!formulas ? (
                <div className="text-center py-8">
                  <Button onClick={handleGenerateFormula} disabled={generatingFormula} size="lg">
                    {generatingFormula ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成候选方...</> : "生成候选方剂"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formulas.map((f, idx) => {
                    const herbs = f.herbs as Array<Record<string, unknown>> || [];
                    return (
                      <Card key={idx} className="border-2">
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={idx === 0 ? "success" : "outline"}>{f.plan_type as string}</Badge>
                              <h4 className="font-semibold">{f.formula_name as string}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{f.source as string}</span>
                              <Badge variant={Number(f.match_score) >= 70 ? "success" : "warning"}>
                                {f.match_score as number}%
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            病机：{f.pathogenesis as string}
                          </p>

                          <div>
                            <span className="text-xs text-muted-foreground">药物组成</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {herbs.map((h: Record<string, unknown>, hi: number) => (
                                <Badge key={hi} variant="secondary">
                                  {h.name as string} {h.dose as number}g
                                  {h.note ? ` (${h.note})` : ""}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {f.reasoning_summary as string}
                          </p>

                          <div className="flex justify-between items-center">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAdoptFormula(f)}
                              disabled={adopting}
                            >
                              {adopting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                              采用为草稿
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
