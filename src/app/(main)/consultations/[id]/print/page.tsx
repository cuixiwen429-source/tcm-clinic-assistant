"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface HerbItem { name: string; dose: number; note: string; }

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<Record<string, unknown> | null>(null);
  const [prescription, setPrescription] = useState<Record<string, unknown> | null>(null);
  const [herbs, setHerbs] = useState<HerbItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { fetchData(); }, [consultationId]);

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
        if (pres.length > 0) {
          const latest = pres[pres.length - 1];
          setPrescription(latest);
          try { setHerbs(JSON.parse((latest.herbs as string) || "[]")); } catch { setHerbs([]); }
        }
      }
    } catch { toast.error("加载失败"); }
    finally { setLoading(false); }
  };

  const handlePrint = () => setConfirmOpen(true);

  const doPrint = async () => {
    setConfirmOpen(false);
    try {
      await fetch(`/api/consultations/${consultationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINALIZED" }),
      });
    } catch { /* ignore */ }
    window.print();
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  const patient = consultation?.patient as Record<string, unknown> || {};
  const today = format(new Date(), "yyyy年MM月dd日", { locale: zhCN });
  const prescriptionDate = (prescription?.createdAt as string)
    ? format(new Date(prescription?.createdAt as string), "yyyy年MM月dd日", { locale: zhCN })
    : today;
  // Build professional TCM pattern diagnosis — never use chief complaint
  let diagnosis = (consultation?.doctorFinalPattern as string) || "";
  if (!diagnosis) {
    const analyses = [
      consultation?.huXishuAnalysis as string,
      consultation?.zhangXichunAnalysis as string,
      consultation?.niHaixiaAnalysis as string,
      consultation?.liKeAnalysis as string,
    ];
    for (const a of analyses) {
      if (a) {
        try {
          const parsed = JSON.parse(a);
          if (parsed.pattern) { diagnosis = parsed.pattern as string; break; }
        } catch { /* */ }
      }
    }
  }
  const usage = (prescription?.usageInstruction as string) || "";
  const decoction = (prescription?.decoctionMethod as string) || "";
  const precautions = (prescription?.precautions as string) || "";
  const totalDoses = (prescription?.totalDoses as number) || 7;

  // Build compact symptom text
  const symptomLines: string[] = [];
  const cc = consultation?.chiefComplaint as string;
  const pi = consultation?.presentIllness as string;
  if (cc) symptomLines.push(cc);
  if (pi) symptomLines.push(pi);
  try {
    const s = consultation?.symptomSummary as string;
    if (s) {
      const ss = JSON.parse(s);
      if (ss.tongue_pulse) symptomLines.push(ss.tongue_pulse);
      if (ss.stool_urine) symptomLines.push(ss.stool_urine);
    }
  } catch { /* */ }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/consultations/${consultationId}/prescription`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">处方预览与打印</h1>
            <p className="text-muted-foreground text-sm">A5格式 · 楷体</p>
          </div>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> 打印处方
        </Button>
      </div>

      {/* Prescription Document */}
      <div className="flex justify-center">
        <div className="prescription-doc">
          {/* === SECTION 1: HEADER === */}
          <div className="rx-header">
            深圳同修仁德中医（综合）诊所处方笺
          </div>

          {/* === SECTION 2: PATIENT === */}
          <div className="rx-patient">
            <div className="rx-row">
              <span>费别：□ 医保 □ 自费</span>
              <span>电脑号 / 医保卡号：________________</span>
            </div>
            <div className="rx-row">
              <span>姓名：<b>{patient.name as string || "________"}</b></span>
              <span>性别：{patient.gender as string || "____"}</span>
              <span>年龄：{(patient.age as number) ? `${patient.age}岁` : "____"}</span>
            </div>
            <div className="rx-row">
              <span>临床诊断：{diagnosis || "________________"}</span>
              <span>日期：{prescriptionDate}</span>
            </div>
          </div>

          {/* === SECTION 3: SYMPTOMS === */}
          <div className="rx-symptoms">
            {symptomLines.length > 0 ? symptomLines.map((line, i) => (
              <div key={i} className="rx-sym-line">{i === 0 ? `主诉：${line}` : i === 1 ? `现症：${line}` : line}</div>
            )) : <div className="rx-sym-line">症状舌脉：________________</div>}
          </div>

          {/* === SECTION 4: RP === */}
          <div className="rx-rp">
            <div className="rx-rp-title">Rp</div>
            <div className="rx-rp-grid">
              {herbs.map((h, i) => (
                <div key={i} className="rx-rp-item">{h.name} {h.dose}g{h.note ? `（${h.note}）` : ""}</div>
              ))}
            </div>
          </div>

          {/* === SECTION 5: USAGE === */}
          <div className="rx-usage">
            <div className="rx-row">
              <span><b>剂数：</b>{totalDoses} 剂</span>
              <span><b>煎法：</b>{decoction || "________________"}</span>
              <span><b>服法：</b>{usage || "________________"}</span>
            </div>
            {precautions && <div className="rx-row"><b>医嘱：</b>{precautions}</div>}
            <div className="rx-row">
              <span><b>费用：</b>________________</span>
            </div>
          </div>

          {/* === SECTION 6: SIGNATURES === */}
          <div className="rx-signatures">
            <div className="rx-row">
              <span>医师：________________</span>
              <span>审核药师：________________</span>
            </div>
            <div className="rx-row">
              <span>调配：________________</span>
              <span>核对 / 发药：________________</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="打印前确认"
        description="请确认处方、剂量、煎服方法及患者信息无误。"
        onConfirm={doPrint}
        confirmLabel="确认打印"
      />
    </div>
  );
}
