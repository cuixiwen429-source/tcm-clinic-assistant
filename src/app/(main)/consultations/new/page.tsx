"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AIDisclaimer } from "@/components/shared/AIDisclaimer";
import { PatientForm, PatientFormValues } from "@/components/patients/PatientForm";
import { useConsultationStore } from "@/stores/consultation-store";
import { toast } from "sonner";
import { Search, Plus, User, Loader2, ChevronRight, ArrowRight, FileText } from "lucide-react";
import { VoiceInput } from "@/components/consultations/VoiceInput";
import { ImageUpload } from "@/components/consultations/ImageUpload";

export default function NewConsultationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useConsultationStore();

  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Array<{ id: string; name: string; gender: string | null; age: number | null; phone: string | null; _count?: { consultations: number } }>>([]);
  const [searching, setSearching] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [creatingConsultation, setCreatingConsultation] = useState(false);

  // If patientId is in URL, auto-select
  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (patientId) {
      store.setPatientId(patientId);
      store.setStep("tongue");
    }
  }, [searchParams, store]);

  // Patient search
  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 1) { setPatients([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

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
      setShowNewPatient(false);
      setCreatingPatient(false);
      // Create consultation
      await createConsultation(patient.id);
    } catch {
      toast.error("网络错误");
    } finally {
      setCreatingPatient(false);
    }
  };

  const createConsultation = async (patientId: string) => {
    setCreatingConsultation(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (!res.ok) { toast.error("创建就诊失败"); return; }
      const consultation = await res.json();
      store.setConsultationId(consultation.id);
      store.setStep("tongue");
    } catch {
      toast.error("网络错误");
    } finally {
      setCreatingConsultation(false);
    }
  };

  const selectPatient = async (patientId: string) => {
    store.setPatientId(patientId);
    await createConsultation(patientId);
  };

  // Step 4: Transcribe
  const handleTranscribe = async () => {
    if (!store.rawText.trim() || store.rawText.trim().length < 10) {
      toast.error("请输入至少10个字符的问诊内容");
      return;
    }
    store.setIsTranscribing(true);
    try {
      const body: Record<string, unknown> = { rawText: store.rawText };
      // Include tongue/face analysis as additional context for AI
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
      store.setStep("history");
      toast.success("病史结构化完成");
    } catch {
      toast.error("AI处理失败，请重试");
    } finally {
      store.setIsTranscribing(false);
    }
  };

  // Step 5: Confirm history → go to AI
  const handleConfirmHistory = async () => {
    if (!store.consultationId || !store.structuredHistory) return;
    try {
      const body: Record<string, unknown> = {
        editedHistory: JSON.stringify(store.structuredHistory),
        chiefComplaint: (store.structuredHistory as Record<string, unknown>).chief_complaint,
        presentIllness: (store.structuredHistory as Record<string, unknown>).present_illness,
        status: "AI_ASSISTED",
        ...(store.tongueImage ? { tongueImage: store.tongueImage } : {}),
        ...(store.faceImage ? { faceImage: store.faceImage } : {}),
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

  // STEP 1: Patient Selection
  if (store.step === "patient") {
    return (
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
                    placeholder="输入姓名或手机号..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> 搜索中...
                  </div>
                )}
                {patientSearch.length >= 1 && !searching && patients.length === 0 && (
                  <p className="text-sm text-muted-foreground">未找到匹配患者，可新建患者档案</p>
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
                          <Button size="sm" onClick={() => selectPatient(p.id)} disabled={creatingConsultation}>
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
    );
  }

  // STEP 2: Tongue Image
  if (store.step === "tongue") {
    const analysis = store.tongueAnalysis as Record<string, Record<string, unknown>> | null;
    const analyzed = analysis !== null;

    const handleAnalyzeTongue = async () => {
      if (!store.consultationId || !store.tongueImage) return;
      store.setIsAnalyzingTongue(true);
      try {
        // Fetch the uploaded image as a blob, then POST to vision API
        const imgRes = await fetch(store.tongueImage);
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
        await fetch(`/api/consultations/${store.consultationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tongueImage: store.tongueImage,
            tongueAnalysis: JSON.stringify(store.tongueAnalysis),
          }),
        });
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
          <p className="text-muted-foreground">第2步：上传舌苔照片并AI分析</p>
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
              description="请拍摄自然光下的舌面照片，舌尖微翘，舌体自然伸出"
              currentImage={store.tongueImage}
              onImageChange={(url) => { store.setTongueImage(url); store.setTongueAnalysis(null); }}
              disabled={store.isAnalyzingTongue}
            />

            {store.tongueImage && !analyzed && (
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

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => store.setStep("patient")}>
                返回选择患者
              </Button>
              <div className="flex gap-2">
                {analyzed && (
                  <>
                    <Button variant="outline" onClick={handleAnalyzeTongue} disabled={store.isAnalyzingTongue}>
                      {store.isAnalyzingTongue ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                      重新分析
                    </Button>
                    <Button onClick={handleConfirmTongue} className="bg-green-600 hover:bg-green-700">
                      确认舌象分析，进入面相 <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </>
                )}
                {!analyzed && store.tongueImage && (
                  <Button variant="ghost" onClick={() => store.setStep("face")}>
                    跳过，直接进入面相 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {!store.tongueImage && (
                  <Button variant="ghost" onClick={() => store.setStep("face")}>
                    跳过，直接进入面相 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 3: Face Image
  if (store.step === "face") {
    const analysis = store.faceAnalysis as Record<string, Record<string, unknown>> | null;
    const analyzed = analysis !== null;

    const handleAnalyzeFace = async () => {
      if (!store.consultationId || !store.faceImage) return;
      store.setIsAnalyzingFace(true);
      try {
        const imgRes = await fetch(store.faceImage);
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
        await fetch(`/api/consultations/${store.consultationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            faceImage: store.faceImage,
            faceAnalysis: JSON.stringify(store.faceAnalysis),
          }),
        });
        toast.success("面相分析已确认");
        store.setStep("transcribe");
      } catch {
        toast.error("保存失败");
      }
    };

    return (
      <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">新建就诊</h1>
          <p className="text-muted-foreground">第3步：上传面相照片并AI分析</p>
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
              description="请拍摄自然光下的面部正面照片，表情自然，勿化妆遮挡"
              currentImage={store.faceImage}
              onImageChange={(url) => { store.setFaceImage(url); store.setFaceAnalysis(null); }}
              disabled={store.isAnalyzingFace}
            />

            {store.faceImage && !analyzed && (
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

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => store.setStep("tongue")}>
                返回舌诊
              </Button>
              <div className="flex gap-2">
                {analyzed && (
                  <>
                    <Button variant="outline" onClick={handleAnalyzeFace} disabled={store.isAnalyzingFace}>
                      {store.isAnalyzingFace ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                      重新分析
                    </Button>
                    <Button onClick={handleConfirmFace} className="bg-blue-600 hover:bg-blue-700">
                      确认面相分析，进入问诊 <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </>
                )}
                {!analyzed && store.faceImage && (
                  <Button variant="ghost" onClick={() => store.setStep("transcribe")}>
                    跳过，直接进入问诊 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {!store.faceImage && (
                  <Button variant="ghost" onClick={() => store.setStep("transcribe")}>
                    跳过，直接进入问诊 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 4: Transcribe
  if (store.step === "transcribe") {
    return (
      <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">新建就诊</h1>
          <p className="text-muted-foreground">第4步：录入问诊内容</p>
        </div>
        <AIDisclaimer />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">问诊转写文本</CardTitle>
            <CardDescription>
              请粘贴医患问诊录音转写文本，或手动输入问诊内容。AI将自动提炼结构化病史。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rawText">问诊文本</Label>
                <VoiceInput
                  onAppend={(text) => store.setRawText(store.rawText + text)}
                  disabled={store.isTranscribing}
                />
              </div>
              <Textarea
                id="rawText"
                placeholder="请粘贴问诊录音转写文本，或点击【语音输入】使用麦克风录入..."
                value={store.rawText}
                onChange={(e) => store.setRawText(e.target.value)}
                rows={12}
              />
              <p className="text-xs text-muted-foreground">
                已输入 {store.rawText.length} 字符
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => store.setStep("face")}>
                返回面诊
              </Button>
              <Button onClick={handleTranscribe} disabled={store.isTranscribing}>
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
      </div>
    );
  }

  // STEP 5: Review History
  if (store.step === "history" && store.structuredHistory) {
    const h = store.structuredHistory as Record<string, unknown>;
    const symptomSummary = h.symptom_summary as Record<string, string> || {};
    const missingInfo = h.missing_information as string[] || [];

    return (
      <div className="mx-auto max-w-full md:max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">确认病史</h1>
          <p className="text-muted-foreground">第5步：检查并确认AI提炼的病史</p>
        </div>
        <AIDisclaimer />

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

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => store.setStep("transcribe")}>
            返回修改文本
          </Button>
          <Button onClick={handleConfirmHistory}>
            确认病史，进入AI辨证 <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
