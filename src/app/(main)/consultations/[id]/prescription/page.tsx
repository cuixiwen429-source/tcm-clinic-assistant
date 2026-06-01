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
import { ArrowLeft, Save, Printer, ShieldAlert, AlertTriangle, CheckCircle, History, Loader2, DollarSign } from "lucide-react";

interface HerbItem { name: string; dose: number; note: string; }
interface ComplianceItem { checkType: string; herbName: string; conflictWith?: string; severity: string; detail: string; }

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

  // Price estimation
  const [prices, setPrices] = useState<Record<string, { retailPrice: number | null }>>({});
  const [totalEstimate, setTotalEstimate] = useState(0);

  useEffect(() => {
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

  // Fetch herb prices when herbs change
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/consultations/${consultationId}/ai`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">处方编辑</h1>
            <p className="text-muted-foreground text-sm">
              患者：{patient.name as string} · 版本 v{(currentVersion?.version as number) || 1}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/consultations/${consultationId}/print`)}>
            <Printer className="mr-2 h-4 w-4" /> 预览打印
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">药方信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>方名</Label>
                  <Input value={formulaName} onChange={(e) => setFormulaName(e.target.value)} placeholder="如：小柴胡汤加减" />
                </div>
                <div className="space-y-2">
                  <Label>剂数</Label>
                  <Input type="number" value={totalDoses} onChange={(e) => setTotalDoses(parseInt(e.target.value) || 7)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>药物组成</Label>
                <HerbSelector herbs={herbs} onChange={setHerbs} />
              </div>

              <div className="space-y-2">
                <Label>煎服方法</Label>
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

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              保存为新版本
            </Button>
            <Button variant="default" onClick={handleFinalize}>
              <CheckCircle className="mr-2 h-4 w-4" />
              确认为终版处方
            </Button>
          </div>
        </div>

        {/* Right Sidebar: Compliance + Version History */}
        <div className="space-y-4">
          {/* Compliance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                合规校验
                {checking && <Loader2 className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {herbs.length === 0 ? "请先添加药物" : "未检测到合规问题"}
                </p>
              ) : (
                <div className="space-y-2">
                  {dangerCount > 0 && (
                    <Badge variant="destructive" className="w-full justify-center">
                      <AlertTriangle className="mr-1 h-3 w-3" /> {dangerCount} 项高风险
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="warning" className="w-full justify-center">
                      {warningCount} 项警告
                    </Badge>
                  )}
                  <div className="max-h-64 overflow-y-auto space-y-2 mt-2">
                    {checks.map((c, i) => (
                      <div key={i} className={`rounded-md border p-2 text-xs ${c.severity === "BLOCK" ? "border-danger/50 bg-danger/5" : c.severity === "DANGER" ? "border-danger/30 bg-danger/3" : "border-warning/30 bg-warning/3"}`}>
                        <p className="font-medium">{c.checkType === "ANTAGONISM" ? "十八反" : c.checkType === "FEAR" ? "十九畏" : c.checkType === "PREGNANCY" ? "妊娠禁忌" : c.checkType === "DOSE_EXCEEDED" ? "超剂量" : c.checkType === "TOXICITY" ? "毒性提示" : c.checkType}</p>
                        <p className="text-muted-foreground">{c.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Estimation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                药费估算（广东参考）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {herbs.length === 0 ? (
                <p className="text-xs text-muted-foreground">请先添加药物</p>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {herbs.map((h, i) => {
                      const p = prices[h.name];
                      const unitPrice = p?.retailPrice;
                      const lineTotal = unitPrice != null ? Math.round(unitPrice * (h.dose || 0) * 100) / 100 : null;
                      return (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="truncate max-w-[120px]">{h.name} {h.dose}g</span>
                          <span className="text-muted-foreground">
                            {unitPrice != null ? (
                              <>@{unitPrice.toFixed(2)}/g = ¥{lineTotal?.toFixed(2)}</>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>估算总药费</span>
                    <span className="text-primary">¥{totalEstimate.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    ×{totalDoses}剂 = ¥{(totalEstimate * totalDoses).toFixed(2)}（仅供参考，以实际采购价为准）
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> 版本历史
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无历史版本</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((p, idx) => (
                    <div key={idx} className={`rounded-md border p-2 cursor-pointer hover:bg-accent text-xs ${(p.version as number) === (currentVersion?.version as number) ? "border-primary/50 bg-primary/5" : ""}`}>
                      <div className="flex justify-between">
                        <span className="font-medium">v{p.version as number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {p.source as string === "AI" ? "AI草稿" : "医师编辑"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{p.formulaName as string || "未命名方"}</p>
                      {(p.isConfirmed as boolean) && <Badge variant="success" className="mt-1 text-[10px]">已确认</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
