"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Camera, Eye, FileText, Brain, CheckCircle, Pill, ClipboardCheck, Printer, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface HerbItem { name: string; dose: number; note?: string; }

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetchData();
  }, [consultationId]);

  // Scroll to section after load
  useEffect(() => {
    if (!loading && data) {
      const hash = window.location.hash.replace("#", "");
      if (hash && sectionRefs.current[hash]) {
        setTimeout(() => {
          sectionRefs.current[hash]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }
    }
  }, [loading, data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("就诊记录不存在");
        router.push("/dashboard");
      }
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!data) return null;

  const patient = (data.patient as Record<string, unknown>) || {};
  const prescriptions = (data.prescriptions as Array<Record<string, unknown>>) || [];
  const confirmedPrescription = prescriptions.find(p => p.isConfirmed as boolean) || prescriptions[0];
  const herbs: HerbItem[] = confirmedPrescription
    ? (() => { try { return JSON.parse(confirmedPrescription.herbs as string || "[]"); } catch { return []; } })()
    : [];

  const tongueImages: string[] = (() => { try { return JSON.parse(data.tongueImage as string || "[]"); } catch { return (data.tongueImage as string) ? [data.tongueImage as string] : []; } })();
  const faceImages: string[] = (() => { try { return JSON.parse(data.faceImage as string || "[]"); } catch { return (data.faceImage as string) ? [data.faceImage as string] : []; } })();
  const tongueAnalysis: Record<string, unknown> | null = (() => { try { return JSON.parse(data.tongueAnalysis as string || "null"); } catch { return null; } })();
  const faceAnalysis: Record<string, unknown> | null = (() => { try { return JSON.parse(data.faceAnalysis as string || "null"); } catch { return null; } })();

  const isFinalized = (data.status as string) === "FINALIZED" || (data.status as string) === "ARCHIVED";
  const hasPrescription = prescriptions.length > 0;

  const steps = [
    { key: "patient", label: "患者档案", icon: History, done: !!data.patientId },
    { key: "tongue", label: "舌象采集", icon: Camera, done: tongueImages.length > 0 },
    { key: "face", label: "面相采集", icon: Eye, done: faceImages.length > 0 },
    { key: "history", label: "问诊记录", icon: FileText, done: !!(data.rawTranscription || data.editedHistory) },
    { key: "differentiate", label: "AI辨证", icon: Brain, done: !!(data.huXishuAnalysis || data.zhangXichunAnalysis || data.niHaixiaAnalysis || data.liKeAnalysis) },
    { key: "diagnosis", label: "最终诊断", icon: CheckCircle, done: !!(data.doctorFinalPattern) },
    { key: "formula", label: "处方", icon: Pill, done: hasPrescription },
    { key: "confirm", label: "处方确认", icon: ClipboardCheck, done: prescriptions.some(p => p.isConfirmed as boolean) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-serif">就诊详情</h1>
            <p className="text-muted-foreground text-xs sm:text-sm truncate">
              患者：{patient.name as string}
              {(patient.gender as string) ? ` · ${patient.gender as string}` : null}
              {(patient.age as number) ? ` · ${patient.age}岁` : null}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
          {!isFinalized && hasPrescription && (
            <Button size="sm" onClick={() => router.push(`/consultations/${consultationId}/prescription`)}>
              <Pill className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">编辑处方</span>
            </Button>
          )}
          {hasPrescription && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/consultations/${consultationId}/print`)}>
              <Printer className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">处方单</span>
            </Button>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <Card className="border-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-0 overflow-x-auto pb-2 flex-wrap">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center flex-shrink-0">
                  <button
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[60px] transition-all duration-200 cursor-pointer",
                      step.done ? "text-green-700 hover:bg-green-50" : "text-muted-foreground/50 hover:bg-muted"
                    )}
                    onClick={() => {
                      const el = sectionRefs.current[step.key];
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-full border-2",
                      step.done ? "border-green-500 bg-green-50" : "border-muted-foreground/25 bg-transparent"
                    )}>
                      {step.done ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <span className="text-[10px] text-center leading-tight font-medium">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Patient Info */}
          <Card id="patient" ref={(el) => { sectionRefs.current.patient = el; }}>
            <CardHeader><CardTitle className="text-lg font-serif">患者信息</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">姓名：</span>{patient.name as string || "-"}</div>
                <div><span className="text-muted-foreground">性别：</span>{patient.gender as string || "-"}</div>
                <div><span className="text-muted-foreground">年龄：</span>{patient.age ? `${patient.age}岁` : "-"}</div>
                <div><span className="text-muted-foreground">电话：</span>{patient.phone as string || "-"}</div>
              </div>
              {(patient.allergies as string) && <div className="text-sm"><span className="text-muted-foreground">过敏史：</span><span className="text-red-600">{patient.allergies as string}</span></div>}
              {(patient.chronicDisease as string) && <div className="text-sm"><span className="text-muted-foreground">基础病史：</span>{patient.chronicDisease as string}</div>}
              {(patient.constitution as string) && <div className="text-sm"><span className="text-muted-foreground">体质：</span><Badge variant="outline">{patient.constitution as string}</Badge></div>}
            </CardContent>
          </Card>

          {/* Transcription & History */}
          <Card id="history" ref={(el) => { sectionRefs.current.history = el; }}>
            <CardHeader><CardTitle className="text-lg font-serif">问诊记录</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.rawTranscription ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">原始语音转写</p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {data.rawTranscription as string}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无问诊记录</p>
              )}
              {(data.editedHistory as string) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">整理后病史</p>
                  <div className="text-sm bg-muted/50 rounded-md p-3 max-h-60 overflow-y-auto space-y-1.5">
                    {(() => {
                      try {
                        const h = JSON.parse(data.editedHistory as string);
                        const labels: Record<string, string> = {
                          chief_complaint: "主诉", present_illness: "现病史",
                          past_history: "既往史", personal_history: "个人史",
                          family_history: "家族史", menstrual_history: "月经史",
                        };
                        return (
                          <>
                            {Object.entries(labels).map(([k, label]) => {
                              const v = h[k] as string;
                              if (!v) return null;
                              return <div key={k}><span className="font-medium text-muted-foreground">{label}：</span>{v}</div>;
                            })}
                            {h.symptom_summary && typeof h.symptom_summary === "object" && (
                              <div>
                                <span className="font-medium text-muted-foreground">症状摘要：</span>
                                {Object.entries(h.symptom_summary as Record<string, unknown>).map(([k, v]) => (
                                  <span key={k} className="inline-block mr-3 text-xs">{k}：{String(v)}</span>
                                ))}
                              </div>
                            )}
                            {h.physical_exam && typeof h.physical_exam === "object" && (
                              <div>
                                <span className="font-medium text-muted-foreground">体格检查：</span>
                                {Object.entries(h.physical_exam as Record<string, unknown>).map(([k, v]) => (
                                  <span key={k} className="inline-block mr-3 text-xs">{k}：{String(v)}</span>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      } catch { return <span className="whitespace-pre-wrap">{data.editedHistory as string}</span>; }
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Tongue Images */}
          <Card id="tongue" ref={(el) => { sectionRefs.current.tongue = el; }}>
            <CardHeader><CardTitle className="text-lg font-serif">舌象</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tongueImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">未采集舌象图片</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {tongueImages.map((url, i) => (
                    <img key={i} src={url} alt={`舌象${i + 1}`} className="w-full aspect-square object-cover rounded-md border" />
                  ))}
                </div>
              )}
              {tongueAnalysis && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">AI舌象分析</p>
                  {(() => {
                    const renderNested = (obj: Record<string, unknown>, depth = 0): React.ReactNode => {
                      return Object.entries(obj).map(([k, v]) => {
                        if (v === null || v === undefined || v === "") return null;
                        if (Array.isArray(v) && v.length === 0) return null;
                        if (typeof v === "object" && !Array.isArray(v)) {
                          return (
                            <div key={k} className="mb-1.5">
                              <p className="text-xs font-medium text-muted-foreground">{k}</p>
                              <div className="ml-2 border-l-2 border-primary/15 pl-2">
                                {renderNested(v as Record<string, unknown>, depth + 1)}
                              </div>
                            </div>
                          );
                        }
                        if (Array.isArray(v)) {
                          return <div key={k} className="text-xs"><span className="font-medium">{k}：</span>{v.join("、")}</div>;
                        }
                        return <div key={k} className="text-xs"><span className="font-medium">{k}：</span>{String(v)}</div>;
                      });
                    };
                    if (typeof tongueAnalysis === "string") return <span className="whitespace-pre-wrap">{tongueAnalysis}</span>;
                    return renderNested(tongueAnalysis);
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Face Images */}
          <Card id="face" ref={(el) => { sectionRefs.current.face = el; }}>
            <CardHeader><CardTitle className="text-lg font-serif">面相</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {faceImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">未采集面相图片</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {faceImages.map((url, i) => (
                    <img key={i} src={url} alt={`面相${i + 1}`} className="w-full aspect-square object-cover rounded-md border" />
                  ))}
                </div>
              )}
              {faceAnalysis && (
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">AI面相分析</p>
                  {(() => {
                    const renderNested = (obj: Record<string, unknown>, depth = 0): React.ReactNode => {
                      return Object.entries(obj).map(([k, v]) => {
                        if (v === null || v === undefined || v === "") return null;
                        if (Array.isArray(v) && v.length === 0) return null;
                        if (typeof v === "object" && !Array.isArray(v)) {
                          return (
                            <div key={k} className="mb-1.5">
                              <p className="text-xs font-medium text-muted-foreground">{k}</p>
                              <div className="ml-2 border-l-2 border-primary/15 pl-2">
                                {renderNested(v as Record<string, unknown>, depth + 1)}
                              </div>
                            </div>
                          );
                        }
                        if (Array.isArray(v)) {
                          return <div key={k} className="text-xs"><span className="font-medium">{k}：</span>{v.join("、")}</div>;
                        }
                        return <div key={k} className="text-xs"><span className="font-medium">{k}：</span>{String(v)}</div>;
                      });
                    };
                    if (typeof faceAnalysis === "string") return <span className="whitespace-pre-wrap">{faceAnalysis}</span>;
                    return renderNested(faceAnalysis);
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Differentiation */}
      <Card id="differentiate" ref={(el) => { sectionRefs.current.differentiate = el; }}>
        <CardHeader><CardTitle className="text-lg font-serif">AI辨证参考</CardTitle></CardHeader>
        <CardContent>
          {!data.huXishuAnalysis && !data.zhangXichunAnalysis && !data.niHaixiaAnalysis && !data.liKeAnalysis ? (
            <p className="text-sm text-muted-foreground">未进行AI辨证分析</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: "huXishuAnalysis", label: "胡希恕经方辨证" },
                { key: "zhangXichunAnalysis", label: "张锡纯衷中参西" },
                { key: "niHaixiaAnalysis", label: "倪海厦汉唐辨证" },
                { key: "liKeAnalysis", label: "李可扶阳辨证" },
              ].map(({ key, label }) => {
                const val = data[key] as string | null;
                if (!val) return null;
                let parsed: Record<string, unknown> | null = null;
                try { parsed = JSON.parse(val); } catch { /* raw text */ }
                return (
                  <div key={key} className="border rounded-md p-3">
                    <p className="text-xs font-medium text-primary mb-1.5">{label}</p>
                    {parsed ? (
                      <div className="text-xs leading-relaxed space-y-1 max-h-56 overflow-y-auto">
                        {[
                          { k: "pattern", label: "辨证" },
                          { k: "formula_match", label: "对应方剂" },
                          { k: "key_symptoms", label: "关键症状" },
                          { k: "analysis", label: "分析" },
                          { k: "treatment_principle", label: "治则" },
                        ].map(({ k, label: fl }) => {
                          const v = parsed![k];
                          if (!v || (Array.isArray(v) && v.length === 0)) return null;
                          return (
                            <div key={k}>
                              <span className="font-medium text-muted-foreground">{fl}：</span>
                              <span>{Array.isArray(v) ? (v as string[]).join("、") : String(v)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">{val}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Diagnosis */}
      <Card id="diagnosis" ref={(el) => { sectionRefs.current.diagnosis = el; }}>
        <CardHeader><CardTitle className="text-lg font-serif">最终诊断</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">辨证分型：</span>
              <span className="font-medium">{data.doctorFinalPattern as string || "未记录"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">病机：</span>
              <span>{(data.doctorFinalPathogenesis as string) || "未记录"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">主诉：</span>
              <span>{(data.chiefComplaint as string) || "未记录"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription */}
      {(confirmedPrescription || herbs.length > 0) && (
        <Card id="formula" ref={(el) => { sectionRefs.current.formula = el; }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif">处方</CardTitle>
            {!isFinalized && (
              <Button size="sm" variant="outline" onClick={() => router.push(`/consultations/${consultationId}/prescription`)}>
                编辑处方
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <div><span className="text-muted-foreground">方名：</span>{confirmedPrescription?.formulaName as string || "未命名"}</div>
              <div><span className="text-muted-foreground">剂数：</span>{confirmedPrescription?.totalDoses as number || 7} 剂</div>
              <div><span className="text-muted-foreground">来源：</span>{confirmedPrescription?.source as string === "AI" ? "AI生成" : "医师开具"}</div>
            </div>

            {herbs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">药物组成</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {herbs.map((h, i) => (
                    <div key={i} className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-muted/50">
                      <span className="font-medium">{h.name}</span>
                      <span className="text-muted-foreground">{h.dose}g</span>
                      {h.note && <span className="text-[10px] text-muted-foreground/70">({h.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(confirmedPrescription?.decoctionMethod as string) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">煎服方法</p>
                <p className="text-sm">{confirmedPrescription.decoctionMethod as string}</p>
              </div>
            )}
            {(confirmedPrescription?.usageInstruction as string) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">用法用量</p>
                <p className="text-sm">{confirmedPrescription.usageInstruction as string}</p>
              </div>
            )}
            {(confirmedPrescription?.precautions as string) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">注意事项</p>
                <p className="text-sm">{confirmedPrescription.precautions as string}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => router.push(`/consultations/${consultationId}/print`)}>
                <Printer className="mr-2 h-4 w-4" /> {isFinalized ? "查看/打印处方单" : "预览处方单"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
