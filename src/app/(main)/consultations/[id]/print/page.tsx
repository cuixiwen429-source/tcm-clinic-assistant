"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download, Home, Plus } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface HerbItem { name: string; dose: number; note: string; }

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [printData, setPrintData] = useState<Record<string, unknown> | null>(null);
  const [herbs, setHerbs] = useState<HerbItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showPostPrint, setShowPostPrint] = useState(false);
  const [clinicName, setClinicName] = useState("");

  const isMobile = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    setClinicName(localStorage.getItem("clinicName") || "深圳同修仁德中医（综合）诊所");
    fetchData();
  }, [consultationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/print`);
      if (res.ok) {
        const data = await res.json();
        setPrintData(data);
        if (data.prescription?.herbs) {
          setHerbs(data.prescription.herbs as HerbItem[]);
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

    // After print dialog closes, show post-print dialog
    setTimeout(() => setShowPostPrint(true), 1000);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  const patient = printData?.patient as Record<string, unknown> || {};
  const diagnosis = printData?.diagnosis as Record<string, unknown> || {};
  const prescription = printData?.prescription as Record<string, unknown> || {};
  const refined = printData?.refinedSymptoms as { symptoms: string[]; tongue_pulse: string } | null;
  const costCalc = printData?.costCalculation as { totalCost: number } | null;

  const pattern = (diagnosis.pattern as string) || "";
  const today = format(new Date(), "yyyy年MM月dd日", { locale: zhCN });
  const prescriptionDate = (prescription?.createdAt as string)
    ? format(new Date(prescription?.createdAt as string), "yyyy年MM月dd日", { locale: zhCN })
    : today;
  const decoction = (prescription?.decoctionMethod as string) || "";
  const usage = (prescription?.usageInstruction as string) || "";
  const precautions = (prescription?.precautions as string) || "";
  const totalDoses = (prescription?.totalDoses as number) || 7;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => router.push(`/consultations/${consultationId}/prescription`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">处方预览与打印</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">A5格式 · 楷体</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="self-start sm:self-auto">
          {isMobile ? (
            <><Download className="mr-2 h-4 w-4" /> 保存PDF到本地</>
          ) : (
            <><Printer className="mr-2 h-4 w-4" /> 打印处方</>
          )}
        </Button>
      </div>

      {/* Prescription Document */}
      <div className="flex justify-center">
        <div className="prescription-doc print-doc max-w-full overflow-x-auto">
          {/* === HEADER === */}
          <div className="rx-header">{clinicName}处方笺</div>

          {/* === PATIENT INFO === */}
          <div className="rx-patient">
            <div className="rx-row">
              <span>费别：□ 医保 □ 自费</span>
              <span>电脑号 / 医保卡号：________________</span>
            </div>
            <div className="rx-row">
              <span>姓名：<b>{patient.name as string || "________"}</b></span>
              <span>性别：{patient.gender as string || "____"}</span>
              <span>年龄：{(patient.age as number) ? `${patient.age}岁` : "____"}</span>
              <span>电话：{patient.phone as string || "________________"}</span>
            </div>
            <div className="rx-row">
              <span>地址：{patient.address as string || "________________________"}</span>
            </div>
            <div className="rx-row">
              <span>临床诊断：{pattern || "________________"}</span>
              <span>日期：{prescriptionDate}</span>
            </div>
            {(patient.allergies as string) && (
              <div className="rx-row">
                <span>过敏史：{patient.allergies as string}</span>
              </div>
            )}
            {(patient.chronicDisease as string) && (
              <div className="rx-row">
                <span>基础病史：{patient.chronicDisease as string}</span>
              </div>
            )}
            {(patient.notes as string) && (
              <div className="rx-row">
                <span>备注：{patient.notes as string}</span>
              </div>
            )}
          </div>

          {/* === SYMPTOMS === */}
          <div className="rx-symptoms">
            {refined?.symptoms && refined.symptoms.length > 0 ? (
              <div className="rx-sym-line">
                <span>现症：</span>
                {refined.symptoms.join("；")}
                {refined.tongue_pulse && `。${refined.tongue_pulse}`}
              </div>
            ) : (
              <>
                {(diagnosis.chiefComplaint as string) && (
                  <div className="rx-sym-line">现症：{diagnosis.chiefComplaint as string}</div>
                )}
              </>
            )}
          </div>

          {/* === RP === */}
          <div className="rx-rp">
            <div className="rx-rp-title">Rp</div>
            <div className="rx-rp-grid">
              {herbs.map((h, i) => (
                <div key={i} className="rx-rp-item">
                  <div className="rx-rp-herb-main">
                    <span className="rx-rp-herb-name">{h.name}</span>
                    <span className="rx-rp-herb-dose">{h.dose}g</span>
                  </div>
                  {h.note && <div className="rx-rp-herb-note">（{h.note}）</div>}
                </div>
              ))}
            </div>
          </div>

          {/* === USAGE === */}
          <div className="rx-usage">
            <div className="rx-row">
              <span><b>剂数：</b>{totalDoses} 剂</span>
              <span><b>煎法：</b>{decoction || "________________"}</span>
              <span><b>服法：</b>{usage || "________________"}</span>
            </div>
            {precautions && (
              <div className="rx-row"><b>医嘱：</b>{precautions}</div>
            )}
          </div>

          {/* === SIGNATURES (includes cost) === */}
          <div className="rx-signatures">
            <div className="rx-row">
              <span>医师：________________</span>
            </div>
            <div className="rx-row">
              <span>审核药师：________________</span>
              <span>调配：________________</span>
            </div>
            <div className="rx-row">
              <span>核对 / 发药：________________</span>
              <span><b>费用合计：</b>{costCalc ? `¥${costCalc.totalCost.toFixed(2)}` : "________________"} 元</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isMobile ? "保存前确认" : "打印前确认"}
        description="请确认处方、剂量、煎服方法及患者信息无误。"
        onConfirm={doPrint}
        confirmLabel={isMobile ? "保存PDF" : "确认打印"}
      />

      {/* Post-Print Dialog */}
      <ConfirmDialog
        open={showPostPrint}
        onOpenChange={setShowPostPrint}
        title={isMobile ? "PDF已保存" : "处方已打印"}
        description="是否返回工作台或新建就诊？"
        onConfirm={() => {
          setShowPostPrint(false);
          router.push("/dashboard");
        }}
        confirmLabel="返回工作台"
      >
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => {
            setShowPostPrint(false);
            router.push("/consultations/new");
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> 新建就诊
        </Button>
      </ConfirmDialog>
    </div>
  );
}
