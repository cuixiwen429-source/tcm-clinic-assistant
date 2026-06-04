"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AIDisclaimer } from "@/components/shared/AIDisclaimer";
import { PatientForm, PatientFormValues } from "@/components/patients/PatientForm";
import { useConsultationStore } from "@/stores/consultation-store";
import { toast } from "sonner";
import { Search, Plus, User, Loader2, ChevronRight, ArrowRight, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { VoiceInput } from "@/components/consultations/VoiceInput";
import { GlobalRecordingBar } from "@/components/consultations/GlobalRecordingBar";
import { ImageUpload } from "@/components/consultations/ImageUpload";
import {
  getConsultationCaptureResumeStep,
  normalizeConsultationCaptureStep,
  parseConsultationImageList,
  parseConsultationJsonObject,
} from "@/lib/consultations/progress";

interface ConsultationResumeResponse {
  id: string;
  patientId: string;
  rawTranscription?: string | null;
  editedHistory?: string | null;
  tongueImage?: string | null;
  faceImage?: string | null;
  tongueAnalysis?: string | null;
  faceAnalysis?: string | null;
  patient?: {
    name?: string;
    gender?: string | null;
    age?: number | null;
    allergies?: string | null;
    chronicDisease?: string | null;
    constitution?: string | null;
  };
}

function NewConsultationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useConsultationStore();

  const stopRecordingRef = useRef<(() => void) | null>(null);

  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Array<{ id: string; name: string; gender: string | null; age: number | null; phone: string | null; _count?: { consultations: number } }>>([]);
  const [searching, setSearching] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [creatingConsultation, setCreatingConsultation] = useState(false);
  const [autoCreating, setAutoCreating] = useState(
    !!searchParams.get("patientId") || !!searchParams.get("consultationId")
  );

  // TCM guidance accordion
  const [guidanceOpen, setGuidanceOpen] = useState(false);

  // Auto-save: sync tongue/face data to DB whenever it changes
  useEffect(() => {
    if (!store.consultationId) return;
    if (store.step !== "tongue" && store.step !== "face") return;
    const body: Record<string, unknown> = { patientId: store.patientId };
    if (store.tongueImages.length > 0) body.tongueImage = JSON.stringify(store.tongueImages);
    if (store.tongueAnalysis) body.tongueAnalysis = JSON.stringify(store.tongueAnalysis);
    if (store.faceImages.length > 0) body.faceImage = JSON.stringify(store.faceImages);
    if (store.faceAnalysis) body.faceAnalysis = JSON.stringify(store.faceAnalysis);
    const timer = setTimeout(() => {
      fetch(`/api/consultations/${store.consultationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [store.consultationId, store.tongueImages, store.tongueAnalysis, store.faceImages, store.faceAnalysis, store.step, store.patientId]);

  // Auto-save: sync raw text to DB (debounced) — works on any step since recording continues in background
  useEffect(() => {
    if (!store.consultationId) return;
    if (!store.rawText.trim()) return;
    const timer = setTimeout(() => {
      fetch(`/api/consultations/${store.consultationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: store.patientId,
          rawTranscription: store.rawText,
        }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [store.consultationId, store.rawText, store.patientId]);

  // If consultationId is in URL, resume that draft; if patientId is in URL, create a new consultation.
  const urlPatientId = searchParams.get("patientId");
  const urlConsultationId = searchParams.get("consultationId");
  useEffect(() => {
    const explicitStep = normalizeConsultationCaptureStep(searchParams.get("step"));

    if (urlConsultationId) {
      setAutoCreating(true);
      store.reset();
      fetch(`/api/consultations/${urlConsultationId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: "加载就诊记录失败" }));
            throw new Error(errData.error || "加载就诊记录失败");
          }
          return res.json() as Promise<ConsultationResumeResponse>;
        })
        .then((consultation) => {
          if (!consultation.id || !consultation.patientId) {
            throw new Error("就诊记录数据异常");
          }

          const structuredHistory = parseConsultationJsonObject(consultation.editedHistory);
          const step = explicitStep ?? getConsultationCaptureResumeStep(consultation);

          store.setConsultationId(consultation.id);
          store.setPatientId(consultation.patientId);
          if (consultation.patient) {
            store.setPatientInfo({
              name: consultation.patient.name || "",
              gender: consultation.patient.gender ?? null,
              age: consultation.patient.age ?? null,
              allergies: consultation.patient.allergies || "",
              chronicDisease: consultation.patient.chronicDisease || "",
              constitution: consultation.patient.constitution || "",
            });
          }
          store.setRawText(consultation.rawTranscription || "");
          store.setStructuredHistory(structuredHistory);
          store.setTongueImages(parseConsultationImageList(consultation.tongueImage));
          store.setFaceImages(parseConsultationImageList(consultation.faceImage));
          store.setTongueAnalysis(parseConsultationJsonObject(consultation.tongueAnalysis));
          store.setFaceAnalysis(parseConsultationJsonObject(consultation.faceAnalysis));
          store.setStep(step === "history" && !structuredHistory ? "transcribe" : step);
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "恢复就诊流程失败");
          store.setStep("patient");
        })
        .finally(() => {
          setAutoCreating(false);
        });
      return;
    }

    if (!urlPatientId) {
      // Fresh entry — reset all state from previous session
      store.reset();
      return;
    }
    store.reset();
    store.setPatientId(urlPatientId);
    setCreatingConsultation(true);

    // Fetch patient info first (needed for Vercel cold-start resilience in later steps)
    fetch(`/api/patients/${urlPatientId}`)
      .then(async (res) => {
        if (res.ok) {
          const p = await res.json();
          store.setPatientInfo({
            name: p.name, gender: p.gender, age: p.age,
            allergies: p.allergies, chronicDisease: p.chronicDisease, constitution: p.constitution,
          });
        }
      })
      .catch(() => { /* non-critical */ })
      .then(() =>
        fetch("/api/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: urlPatientId }),
        })
      )
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "创建就诊失败" }));
          throw new Error(errData.error || "创建就诊失败");
        }
        return res.json();
      })
      .then((consultation) => {
        store.setConsultationId(consultation.id);
        store.setStep("transcribe");
      })
      .catch((err) => {
        toast.error(err.message || "创建就诊失败");
        store.setStep("patient");
      })
      .finally(() => {
        setCreatingConsultation(false);
        setAutoCreating(false);
      });
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Patient search
  const [patientInputFocused, setPatientInputFocused] = useState(false);

  const searchPatients = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/patients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

  // Fetch initial patients on focus
  const handlePatientInputFocus = useCallback(() => {
    setPatientInputFocused(true);
    if (patients.length === 0) searchPatients("");
  }, [patients.length, searchPatients]);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(timer);
  }, [patientSearch, searchPatients]);

  // Create patient + consultation
  const handleCreatePatient = async (values: PatientFormValues) => {
    setCreatingPatient(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) { toast.error("创建患者失败"); return; }
      const patient = await res.json();
      store.setPatientId(patient.id);
      store.setPatientInfo({ name: patient.name, gender: patient.gender, age: patient.age, allergies: patient.allergies, chronicDisease: patient.chronicDisease, constitution: patient.constitution });
      setShowNewPatient(false);
      setCreatingPatient(false);
      // Create consultation
      await createConsultation(patient.id);
    } catch (e) {
      console.error("handleCreatePatient error:", e);
      toast.error("网络错误");
    } finally {
      setCreatingPatient(false);
    }
  };

  async function createConsultation(patientId: string) {
    setCreatingConsultation(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "创建就诊失败" }));
        toast.error(errData.error || "创建就诊失败");
        return;
      }
      const consultation = await res.json();
      store.setConsultationId(consultation.id);
      store.setStep("transcribe");
    } catch (e) {
      console.error("createConsultation error:", e);
      toast.error("网络错误");
    } finally {
      setCreatingConsultation(false);
    }
  }

  const selectPatient = async (p: { id: string; name: string; gender: string | null; age: number | null; allergies?: string; chronicDisease?: string }) => {
    store.setPatientId(p.id);
    store.setPatientInfo({ name: p.name, gender: p.gender, age: p.age, allergies: p.allergies, chronicDisease: p.chronicDisease });
    await createConsultation(p.id);
  };

  // AI structuring — called from history step
  const handleTranscribe = async () => {
    if (!store.consultationId) {
      toast.error("就诊记录未创建，请返回上一步重新选择患者");
      return;
    }
    if (!store.rawText.trim() || store.rawText.trim().length < 10) {
      toast.error("请输入至少10个字符的问诊内容");
      return;
    }
    store.setIsTranscribing(true);
    try {
      const body: Record<string, unknown> = {
        rawText: store.rawText,
        patientId: store.patientId,
        patientName: store.patientName,
        patientGender: store.patientGender,
        patientAge: store.patientAge,
        patientAllergies: store.patientAllergies,
        patientChronicDisease: store.patientChronicDisease,
        patientConstitution: store.patientConstitution,
      };
      if (store.tongueAnalysis) body.tongueAnalysis = store.tongueAnalysis;
      if (store.faceAnalysis) body.faceAnalysis = store.faceAnalysis;
      const res = await fetch(`/api/consultations/${store.consultationId}/transcribe`, {
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
      store.setStructuredHistory(result);
      toast.success("病史结构化完成");
    } catch {
      toast.error("AI处理失败，请重试");
    } finally {
      store.setIsTranscribing(false);
    }
  };

  // Confirm history → go to AI
  const handleConfirmHistory = async () => {
    if (!store.consultationId || !store.structuredHistory) return;
    try {
      const body: Record<string, unknown> = {
        patientId: store.patientId,
        editedHistory: JSON.stringify(store.structuredHistory),
        chiefComplaint: (store.structuredHistory as Record<string, unknown>).chief_complaint,
        presentIllness: (store.structuredHistory as Record<string, unknown>).present_illness,
        status: "AI_ASSISTED",
        ...(store.tongueImages.length > 0 ? { tongueImage: JSON.stringify(store.tongueImages) } : {}),
        ...(store.faceImages.length > 0 ? { faceImage: JSON.stringify(store.faceImages) } : {}),
        ...(store.tongueAnalysis ? { tongueAnalysis: JSON.stringify(store.tongueAnalysis) } : {}),
        ...(store.faceAnalysis ? { faceAnalysis: JSON.stringify(store.faceAnalysis) } : {}),
      };
      await fetch(`/api/consultations/${store.consultationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.push(`/consultations/${store.consultationId}/ai`);
    } catch {
      toast.error("保存失败");
    }
  };

  // Loading: auto-creating consultation from patient page
  if (autoCreating) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {urlConsultationId ? "正在恢复就诊流程..." : "正在创建就诊记录..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page-level VoiceInput — always mounted, visible only on transcribe step */}
      <VoiceInput
        onAppend={(text) => store.setRawText((prev: string) => prev + text)}
        onRecordingChange={(rec) => store.setRecording(rec)}
        onAudioLevel={(level) => store.setAudioLevel(level)}
        onElapsed={(secs) => store.setRecordingElapsed(secs)}
        onLangChange={(lang) => store.setRecordingLang(lang)}
        stopRef={stopRecordingRef}
        visible={store.step === "transcribe"}
        disabled={store.isTranscribing}
      />

      {/* Global recording bar — shown on non-transcribe steps while recording */}
      {store.isRecording && store.step !== "transcribe" && (
        <GlobalRecordingBar
          elapsed={store.recordingElapsed}
          audioLevel={store.audioLevel}
          lang={store.recordingLang}
          onStop={() => stopRecordingRef.current?.()}
        />
      )}

      {/* ===== STEP 1: Patient Selection ===== */}
      {store.step === "patient" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">新建就诊</h1>
            <p className="text-muted-foreground">第1步：选择患者</p>
          </div>

          {!showNewPatient ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">查找已有患者</CardTitle>
                  <CardDescription>按姓名或手机号搜索</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="点击选择已建档患者，或输入姓名/手机号搜索..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      onFocus={handlePatientInputFocus}
                      onBlur={() => setTimeout(() => setPatientInputFocused(false), 200)}
                      className="pl-9"
                    />
                  </div>
                  {searching && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> 搜索中...
                    </div>
                  )}
                  {patientInputFocused && !searching && patients.length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无已建档患者，可下方新建患者档案</p>
                  )}
                  {!patientInputFocused && patientSearch.length === 0 && !searching && (
                    <p className="text-xs text-muted-foreground">点击上方输入框查看已建档患者列表</p>
                  )}
                  {patients.length > 0 && (
                    <div className="space-y-2">
                      {patients.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {p.name}
                                {(p._count?.consultations ?? 0) > 0 && (
                                  <Badge variant="secondary" className="ml-2 text-[10px]">
                                    {p._count?.consultations}次就诊
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.gender} {p.age ? `${p.age}岁` : ""} {p.phone || ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="hidden sm:flex"
                              onClick={(e) => { e.stopPropagation(); router.push(`/patients/${p.id}`); }}
                            >
                              查看历史
                            </Button>
                            <Button size="sm" onClick={() => selectPatient(p)} disabled={creatingConsultation}>
                              {creatingConsultation ? <Loader2 className="h-4 w-4 animate-spin" /> : "选择"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">或</span>
                <Separator className="flex-1" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewPatient(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                新建患者档案
              </Button>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">新建患者档案</CardTitle>
              </CardHeader>
              <CardContent>
                <PatientForm onSubmit={handleCreatePatient} isLoading={creatingPatient} />
                <Button variant="ghost" className="mt-2" onClick={() => setShowNewPatient(false)}>
                  返回查找已有患者
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== STEP 2: Transcribe (voice input + raw text) ===== */}
      {store.step === "transcribe" && (
        <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">新建就诊</h1>
            <p className="text-muted-foreground">第2步：录入问诊内容</p>
          </div>
          <AIDisclaimer />

          {/* TCM Consultation Guidance */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/3 to-accent/30">
            <button
              type="button"
              onClick={() => setGuidanceOpen(!guidanceOpen)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">四诊提问引导（临证参考）</span>
              </div>
              {guidanceOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {guidanceOpen && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground mb-1">一、八纲阴阳（起病诱因与体质）</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-2">
                    <li>何时起病？起因（外感/内伤/情志/饮食/劳逸）？</li>
                    <li>平素畏寒还是畏热？手足温凉？</li>
                    <li>易汗出否？自汗/盗汗？</li>
                    <li>面色偏红/偏白？舌脉初步印象？</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">二、六经辨证（循经问诊）</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-2">
                    <li><span className="text-foreground font-medium">太阳：</span>头项强痛？恶风恶寒？发热汗出？鼻塞流涕？身痛？</li>
                    <li><span className="text-foreground font-medium">阳明：</span>身大热？大汗出？口渴喜冷饮？大便干结难解？腹胀满痛？</li>
                    <li><span className="text-foreground font-medium">少阳：</span>寒热往来？口苦咽干？胸胁苦满？默默不欲饮食？心烦喜呕？</li>
                    <li><span className="text-foreground font-medium">太阴：</span>腹满而吐？食不下？自利益甚？时腹自痛？喜温喜按？</li>
                    <li><span className="text-foreground font-medium">少阴：</span>脉微细、但欲寐？四肢厥冷？下利清谷？畏寒蜷卧？</li>
                    <li><span className="text-foreground font-medium">厥阴：</span>消渴？气上撞心、心中疼热？饥不欲食？手足厥逆与发热交替？</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">三、饮食二便眠痛与情志</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-2">
                    <li>饮食：食欲如何？喜冷喜热？口干口渴？口味（苦/淡/甜/黏/酸）？</li>
                    <li>二便：大便（干/溏/黏/秘/血）？小便（清长/短赤/频数/涩痛）？</li>
                    <li>睡眠：入睡困难？多梦易醒？昼夜颠倒？</li>
                    <li>疼痛：部位？性质（刺痛/胀痛/隐痛/冷痛/灼痛）？喜按拒按？</li>
                    <li>情志：心烦易怒？抑郁寡欢？思虑过度？惊恐不安？</li>
                    <li>妇人：月经（期/量/色/质/痛）？带下？孕产？</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground/60 border-t pt-2 mt-1">
                  以上为伤寒六经辨证问诊提纲，临证可据病情灵活增删，不必全询。问诊完毕后切换至&quot;舌象采集&quot;步骤继续四诊。
                </p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">问诊转写文本</CardTitle>
              <CardDescription>
                点击上方麦克风开始录音，或粘贴医患问诊录音转写文本。录音过程中可自由切换至舌诊/面诊步骤，录音不中断。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rawText">问诊文本</Label>
                <Textarea
                  id="rawText"
                  placeholder="点击上方麦克风按钮开始录音，或手动粘贴问诊转写文本..."
                  value={store.rawText}
                  onChange={(e) => store.setRawText(e.target.value)}
                  rows={12}
                />
                <p className="text-xs text-muted-foreground">
                  已输入 {store.rawText.length} 字符
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <Button variant="ghost" onClick={() => store.setStep("patient")} className="self-start">
                  返回选择患者
                </Button>
                <Button onClick={() => store.setStep("tongue")} className="self-start sm:self-auto">
                  下一步：舌象采集 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== STEP 3: Tongue Image ===== */}
      {store.step === "tongue" && (() => {
        const analysis = store.tongueAnalysis as Record<string, Record<string, unknown>> | null;
        const analyzed = analysis !== null;

        const handleAnalyzeTongue = async () => {
          if (!store.consultationId || store.tongueImages.length === 0) return;
          store.setIsAnalyzingTongue(true);
          try {
            const imgRes = await fetch(store.tongueImages[0]);
            const blob = await imgRes.blob();
            const form = new FormData();
            form.set("image", blob, "tongue.jpg");
            form.set("consultationId", store.consultationId);
            const res = await fetch("/api/vision/tongue", { method: "POST", body: form });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "分析失败");
            }
            const data = await res.json();
            store.setTongueAnalysis(data.analysis);
            toast.success("舌象分析完成");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "舌象分析失败");
          } finally {
            store.setIsAnalyzingTongue(false);
          }
        };

        const handleConfirmTongue = async () => {
          if (!store.consultationId) return;
          try {
            const res = await fetch(`/api/consultations/${store.consultationId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patientId: store.patientId,
                tongueImage: JSON.stringify(store.tongueImages),
                tongueAnalysis: JSON.stringify(store.tongueAnalysis),
              }),
            });
            if (!res.ok) {
              toast.error("保存舌象失败");
              return;
            }
            toast.success("舌象分析已确认");
            store.setStep("face");
          } catch {
            toast.error("保存失败");
          }
        };

        return (
          <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold">新建就诊</h1>
              <p className="text-muted-foreground">第3步：上传舌苔照片并AI分析</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">舌诊信息采集</CardTitle>
                <CardDescription>
                  上传患者舌苔照片，AI将按照中医舌诊标准进行专业分析。支持拍摄或从相册选择。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  title="舌苔照片"
                  description="请拍摄自然光下的舌面照片，舌尖微翘，舌体自然伸出（支持多张）"
                  images={store.tongueImages}
                  onImagesChange={(urls) => { store.setTongueImages(urls); store.setTongueAnalysis(null); }}
                  disabled={store.isAnalyzingTongue}
                />

                {store.tongueImages.length > 0 && !analyzed && (
                  <Button onClick={handleAnalyzeTongue} disabled={store.isAnalyzingTongue}>
                    {store.isAnalyzingTongue ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI舌象分析中...</>
                    ) : (
                      <><ArrowRight className="mr-2 h-4 w-4" />开始舌象分析</>
                    )}
                  </Button>
                )}

                {analyzed && analysis && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-green-800">舌象分析结果</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {analysis.tongue_body && (
                        <div>
                          <p className="font-medium text-green-900">舌质</p>
                          <p className="text-green-800">
                            舌色：{(analysis.tongue_body as Record<string, unknown>).color as string || "-"}；
                            舌形：{((analysis.tongue_body as Record<string, unknown>).shape as string[])?.join("、") || "-"}；
                            舌态：{(analysis.tongue_body as Record<string, unknown>).mobility as string || "-"}
                          </p>
                          {((analysis.tongue_body as Record<string, unknown>).sublingual_veins as string) && (
                            <p className="text-green-800">舌下络脉：{(analysis.tongue_body as Record<string, unknown>).sublingual_veins as string}</p>
                          )}
                        </div>
                      )}
                      {analysis.tongue_coating && (
                        <div>
                          <p className="font-medium text-green-900">舌苔</p>
                          <p className="text-green-800">
                            苔色：{(analysis.tongue_coating as Record<string, unknown>).color as string || "-"}；
                            苔质：{((analysis.tongue_coating as Record<string, unknown>).coating_type as string[])?.join("、") || "-"}
                          </p>
                        </div>
                      )}
                      {analysis.syndrome_analysis && (
                        <div>
                          <p className="font-medium text-green-900">辨证分析</p>
                          <p className="text-green-800">
                            {(analysis.syndrome_analysis as Record<string, unknown>).overall_description as string || "-"}
                          </p>
                          <p className="text-green-800 mt-1">
                            寒热：{(analysis.syndrome_analysis as Record<string, unknown>).cold_heat as string || "-"}；
                            虚实：{(analysis.syndrome_analysis as Record<string, unknown>).deficiency_excess as string || "-"}；
                            六经：{(analysis.syndrome_analysis as Record<string, unknown>).six_channel as string || "-"}
                          </p>
                          {((analysis.syndrome_analysis as Record<string, unknown>).likely_patterns as string[])?.length > 0 && (
                            <p className="text-green-800 mt-1">
                              可能证型：{((analysis.syndrome_analysis as Record<string, unknown>).likely_patterns as string[])?.join("、") || "-"}
                            </p>
                          )}
                          <p className="text-green-800 mt-1">
                            治则：{(analysis.syndrome_analysis as Record<string, unknown>).treatment_principle as string || "-"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <Button variant="ghost" onClick={() => store.setStep("transcribe")} className="self-start">
                    返回问诊
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {analyzed && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleAnalyzeTongue} disabled={store.isAnalyzingTongue}>
                          {store.isAnalyzingTongue ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                          重新分析
                        </Button>
                        <Button size="sm" onClick={handleConfirmTongue} className="bg-green-600 hover:bg-green-700">
                          确认进入面相 <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!analyzed && store.tongueImages.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => store.setStep("face")}>
                        跳过进入面相 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {store.tongueImages.length === 0 && (
                      <Button variant="ghost" size="sm" onClick={() => store.setStep("face")}>
                        跳过进入面相 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ===== STEP 4: Face Image ===== */}
      {store.step === "face" && (() => {
        const analysis = store.faceAnalysis as Record<string, Record<string, unknown>> | null;
        const analyzed = analysis !== null;

        const handleAnalyzeFace = async () => {
          if (!store.consultationId || store.faceImages.length === 0) return;
          store.setIsAnalyzingFace(true);
          try {
            const imgRes = await fetch(store.faceImages[0]);
            const blob = await imgRes.blob();
            const form = new FormData();
            form.set("image", blob, "face.jpg");
            form.set("consultationId", store.consultationId);
            const res = await fetch("/api/vision/face", { method: "POST", body: form });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || "分析失败");
            }
            const data = await res.json();
            store.setFaceAnalysis(data.analysis);
            toast.success("面相分析完成");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "面相分析失败");
          } finally {
            store.setIsAnalyzingFace(false);
          }
        };

        const handleConfirmFace = async () => {
          if (!store.consultationId) return;
          try {
            const res = await fetch(`/api/consultations/${store.consultationId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patientId: store.patientId,
                faceImage: JSON.stringify(store.faceImages),
                faceAnalysis: JSON.stringify(store.faceAnalysis),
              }),
            });
            if (!res.ok) {
              toast.error("保存面相失败");
              return;
            }
            toast.success("面相分析已确认");
            store.setStep("history");
          } catch {
            toast.error("保存失败");
          }
        };

        return (
          <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold">新建就诊</h1>
              <p className="text-muted-foreground">第4步：上传面相照片并AI分析</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">面诊信息采集</CardTitle>
                <CardDescription>
                  上传患者面部正面照片，AI将按照中医面诊标准进行专业分析。支持拍摄或从相册选择。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  title="面相照片"
                  description="请拍摄自然光下的面部正面照片，表情自然，勿化妆遮挡（支持多张）"
                  images={store.faceImages}
                  onImagesChange={(urls) => { store.setFaceImages(urls); store.setFaceAnalysis(null); }}
                  disabled={store.isAnalyzingFace}
                />

                {store.faceImages.length > 0 && !analyzed && (
                  <Button onClick={handleAnalyzeFace} disabled={store.isAnalyzingFace}>
                    {store.isAnalyzingFace ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI面相分析中...</>
                    ) : (
                      <><ArrowRight className="mr-2 h-4 w-4" />开始面相分析</>
                    )}
                  </Button>
                )}

                {analyzed && analysis && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-blue-800">面相分析结果</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {analysis.facial_color && (
                        <div>
                          <p className="font-medium text-blue-900">面色</p>
                          <p className="text-blue-800">
                            整体面色：{(analysis.facial_color as Record<string, unknown>).overall_color as string || "-"}；
                            光泽：{(analysis.facial_color as Record<string, unknown>).luster as string || "-"}；
                            分布：{(analysis.facial_color as Record<string, unknown>).distribution as string || "-"}
                          </p>
                        </div>
                      )}
                      {analysis.facial_morphology && (
                        <div>
                          <p className="font-medium text-blue-900">面部形态</p>
                          <p className="text-blue-800">
                            整体：{(analysis.facial_morphology as Record<string, unknown>).overall as string || "-"}；
                            眼部：{(analysis.facial_morphology as Record<string, unknown>).eyes as string || "-"}；
                            口唇：{(analysis.facial_morphology as Record<string, unknown>).lips as string || "-"}
                          </p>
                        </div>
                      )}
                      {analysis.five_organ_face && (
                        <div>
                          <p className="font-medium text-blue-900">五脏面部对应</p>
                          <p className="text-blue-800">
                            额(心)：{(analysis.five_organ_face as Record<string, unknown>).forehead_heart as string || "-"}；
                            鼻(脾)：{(analysis.five_organ_face as Record<string, unknown>).nose_spleen as string || "-"}；
                            颧(肺)：{(analysis.five_organ_face as Record<string, unknown>).cheeks_lung as string || "-"}；
                            颞(肝)：{(analysis.five_organ_face as Record<string, unknown>).temples_liver as string || "-"}；
                            颌(肾)：{(analysis.five_organ_face as Record<string, unknown>).chin_kidney as string || "-"}
                          </p>
                        </div>
                      )}
                      {analysis.syndrome_analysis && (
                        <div>
                          <p className="font-medium text-blue-900">辨证分析</p>
                          <p className="text-blue-800">
                            {(analysis.syndrome_analysis as Record<string, unknown>).overall_impression as string || "-"}
                          </p>
                          <p className="text-blue-800 mt-1">
                            寒热：{(analysis.syndrome_analysis as Record<string, unknown>).cold_heat as string || "-"}；
                            虚实：{(analysis.syndrome_analysis as Record<string, unknown>).deficiency_excess as string || "-"}；
                            脏腑：{(analysis.syndrome_analysis as Record<string, unknown>).zangfu_differentiation as string || "-"}
                          </p>
                          {((analysis.syndrome_analysis as Record<string, unknown>).likely_patterns as string[])?.length > 0 && (
                            <p className="text-blue-800 mt-1">
                              可能证型：{((analysis.syndrome_analysis as Record<string, unknown>).likely_patterns as string[])?.join("、") || "-"}
                            </p>
                          )}
                          <p className="text-blue-800 mt-1">
                            治则：{(analysis.syndrome_analysis as Record<string, unknown>).treatment_principle as string || "-"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <Button variant="ghost" onClick={() => store.setStep("tongue")} className="self-start">
                    返回舌诊
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {analyzed && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleAnalyzeFace} disabled={store.isAnalyzingFace}>
                          {store.isAnalyzingFace ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                          重新分析
                        </Button>
                        <Button size="sm" onClick={handleConfirmFace} className="bg-blue-600 hover:bg-blue-700">
                          确认进入病史确认 <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!analyzed && store.faceImages.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => store.setStep("history")}>
                        跳过进入病史确认 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    {store.faceImages.length === 0 && (
                      <Button variant="ghost" size="sm" onClick={() => store.setStep("history")}>
                        跳过进入病史确认 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ===== STEP 5: Review History (with AI structuring) ===== */}
      {store.step === "history" && (
        <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">确认病史</h1>
            <p className="text-muted-foreground">第5步：检查并确认AI提炼的病史</p>
          </div>
          <AIDisclaimer />

          {!store.structuredHistory ? (
            /* Not yet structured — show raw text + AI structuring button */
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI病史结构化</CardTitle>
                <CardDescription>
                  对问诊录音文本进行AI结构化提炼，生成标准病史格式
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {store.rawText || "尚未录入问诊内容"}
                </div>
                <p className="text-xs text-muted-foreground">
                  原始文本共 {store.rawText.length} 字符
                </p>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <Button variant="ghost" onClick={() => store.setStep("face")} className="self-start">
                    返回面诊
                  </Button>
                  <Button onClick={handleTranscribe} disabled={store.isTranscribing || store.rawText.trim().length < 10} className="self-start sm:self-auto">
                    {store.isTranscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        AI结构化病史
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Structured — show side-by-side */
            (() => {
              const h = store.structuredHistory as Record<string, unknown>;
              const symptomSummary = h.symptom_summary as Record<string, string> || {};
              const missingInfo = h.missing_information as string[] || [];

              return (
                <>
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {/* Left: Raw text */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">原始文本</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                          {store.rawText}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right: Structured */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">结构化病史</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">主诉</Label>
                            <p className="text-sm font-medium">{h.chief_complaint as string || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">现病史</Label>
                            <p className="text-sm">{h.present_illness as string || "-"}</p>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(symptomSummary).map(([key, val]) => (
                              <div key={key}>
                                <Label className="text-xs text-muted-foreground capitalize">{key}</Label>
                                <p className="text-sm">{val || "-"}</p>
                              </div>
                            ))}
                          </div>
                          <Separator />
                          <div>
                            <Label className="text-xs text-muted-foreground">体质特征</Label>
                            <p className="text-sm">{h.constitution as string || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">过敏史</Label>
                            <p className="text-sm">{h.allergy_history as string || "-"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">基础病史</Label>
                            <p className="text-sm">{h.chronic_disease_history as string || "-"}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {missingInfo.length > 0 && (
                        <Card className="border-warning/30">
                          <CardHeader>
                            <CardTitle className="text-sm text-warning">仍需补充的信息</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                              {missingInfo.map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <Button variant="ghost" onClick={() => store.setStep("face")} className="self-start">
                      返回面诊
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleTranscribe} disabled={store.isTranscribing}>
                        {store.isTranscribing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        重新分析
                      </Button>
                      <Button onClick={handleConfirmHistory}>
                        确认病史，进入AI辨证 <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}
    </>
  );
}

export default function NewConsultationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">加载中...</div>}>
      <NewConsultationContent />
    </Suspense>
  );
}
