"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AIDisclaimer } from "@/components/shared/AIDisclaimer";
import { VoiceInput } from "@/components/consultations/VoiceInput";
import { Loader2, Sparkles, Pill, AlertTriangle, ScanLine, DollarSign, Camera, Upload, X, Edit3, Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface HerbInfo {
  name: string;
  dose: number;
  retailPrice: number | null;
  unit: string;
  subtotal: number | null;
  pharmacopoeiaMin: number | null;
  pharmacopoeiaMax: number | null;
  overdosed: boolean;
}

interface ParseResult {
  formulaName: string;
  herbs: HerbInfo[];
  totalCost: number;
}

interface PrescriptionRecognizerProps {
  apiEndpoint: string;
  ocrEndpoint: string;
}

export function PrescriptionRecognizer({ apiEndpoint, ocrEndpoint }: PrescriptionRecognizerProps) {
  const [mode, setMode] = useState<"text" | "photo">("text");

  // Text mode state
  const [text, setText] = useState("");

  // Photo mode state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Shared state
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [doses, setDoses] = useState(1);

  // Editable state after recognition
  const [editFormulaName, setEditFormulaName] = useState("");
  const [editHerbs, setEditHerbs] = useState<Array<{ name: string; dose: number }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Text mode: AI parse ───
  const handleTextParse = async () => {
    if (!text.trim() || text.trim().length < 3) {
      toast.error("请先输入至少3个字符的处方描述");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "AI解析失败" }));
        toast.error(data.error || "AI解析失败");
        return;
      }
      const data = await res.json();
      applyResult(data);
      toast.success(`识别完成：${data.herbs?.length || 0}味药材`);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setParsing(false);
    }
  };

  // ─── Photo mode: OCR ───
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handlePhotoParse = async () => {
    if (!imageFile) {
      toast.error("请先拍照或选择处方图片");
      return;
    }
    setParsing(true);
    try {
      const form = new FormData();
      form.set("image", imageFile);
      const res = await fetch(ocrEndpoint, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "OCR识别失败" }));
        toast.error(data.error || "OCR识别失败");
        return;
      }
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      applyResult(data);
      toast.success(`OCR识别完成：${data.herbs?.length || 0}味药材`);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setParsing(false);
    }
  };

  const applyResult = (data: ParseResult) => {
    setResult(data);
    setEditFormulaName(data.formulaName || "");
    setEditHerbs(data.herbs.map((h) => ({ name: h.name, dose: h.dose })));
  };

  const clearPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Herb editing ───
  const addHerb = () => {
    setEditHerbs([...editHerbs, { name: "", dose: 0 }]);
  };

  const removeHerb = (i: number) => {
    setEditHerbs(editHerbs.filter((_, idx) => idx !== i));
  };

  const updateHerb = (i: number, field: "name" | "dose", value: string | number) => {
    const updated = [...editHerbs];
    updated[i] = { ...updated[i], [field]: value };
    setEditHerbs(updated);
  };

  // ─── Recalculate after edits ───
  const recalculate = () => {
    if (editHerbs.length === 0) return;
    setParsing(true);
    // Send edited herbs to AI parse for price lookup
    const herbText = editHerbs.map((h) => `${h.name}${h.dose}克`).join("，");
    fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${editFormulaName ? editFormulaName + "，" : ""}${herbText}` }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setResult(data);
          setEditHerbs(data.herbs.map((h: HerbInfo) => ({ name: h.name, dose: h.dose })));
        }
      })
      .catch(() => toast.error("更新失败"))
      .finally(() => setParsing(false));
  };

  // ─── Price calculation ───
  const totalWithDoses = result
    ? result.herbs.reduce((sum, h) => {
        if (h.retailPrice != null) return sum + h.retailPrice * h.dose * doses;
        return sum;
      }, 0)
    : editHerbs.reduce((sum, h) => sum + h.dose, 0);

  const hasOverdoses = result?.herbs.some((h) => h.overdosed);
  const isModified = result && (
    editFormulaName !== (result.formulaName || "") ||
    JSON.stringify(editHerbs) !== JSON.stringify(result.herbs.map((h) => ({ name: h.name, dose: h.dose })))
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground font-serif flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          处方识别
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          语音/文字录入或拍照上传处方，自动识别药材克数并计算价格
        </p>
      </div>

      {/* Mode switcher */}
      {!result && (
        <div className="flex rounded-lg border border-input bg-muted/30 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              mode === "text"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            文字录入
          </button>
          <button
            type="button"
            onClick={() => setMode("photo")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              mode === "photo"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="h-4 w-4" />
            拍照识别
          </button>
        </div>
      )}

      {/* ── TEXT MODE ── */}
      {!result && mode === "text" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>处方录入</span>
              <VoiceInput
                onAppend={(t) => setText((prev) => prev + t)}
                disabled={parsing}
                compact
              />
            </CardTitle>
            <CardDescription className="text-xs">
              口述或输入处方内容，如：小柴胡汤加减，柴胡12克，黄芩9克，半夏9克，党参9克，炙甘草6克，生姜9克，大枣4枚
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="点击麦克风录音或手动输入处方..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <AIDisclaimer />
              <Button
                type="button"
                onClick={handleTextParse}
                disabled={parsing || text.trim().length < 3}
              >
                {parsing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI识别中...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> 一键识别</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── PHOTO MODE ── */}
      {!result && mode === "photo" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              拍照上传处方
            </CardTitle>
            <CardDescription className="text-xs">
              拍照或上传手写/打印处方的照片，AI自动识别药材和克数。支持手机拍照、截图、扫描件
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border bg-muted">
                <img
                  src={previewUrl}
                  alt="处方预览"
                  className="max-h-64 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  点击选择处方图片或拖拽到此处
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  支持 JPG、PNG、HEIC 格式
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center justify-between">
              <AIDisclaimer />
              <div className="flex gap-2">
                {previewUrl && (
                  <Button variant="outline" size="sm" onClick={clearPhoto}>
                    重新选择
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handlePhotoParse}
                  disabled={parsing || !imageFile}
                >
                  {parsing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> OCR识别中...</>
                  ) : (
                    <><Eye className="mr-2 h-4 w-4" /> 开始识别</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── RESULTS (shared) ── */}
      {result && (
        <>
          {/* Header with formula name editing + dose selector */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Label>方名</Label>
                  <Input
                    value={editFormulaName}
                    onChange={(e) => setEditFormulaName(e.target.value)}
                    placeholder="处方名称"
                    className="font-serif text-lg"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm whitespace-nowrap">剂数</Label>
                  <Input
                    type="number"
                    value={doses}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setDoses(0); } else { const n = parseInt(v); if (!isNaN(n) && n >= 0) setDoses(n); }
                    }}
                    className="w-20"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">剂</span>
                </div>
              </div>

              {/* Editable herb list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>药物组成</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addHerb} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    添加药材
                  </Button>
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  {editHerbs.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <Input
                        value={h.name}
                        onChange={(e) => updateHerb(i, "name", e.target.value)}
                        className="h-8 flex-1 min-w-0"
                        placeholder="药材名"
                      />
                      <Input
                        type="number"
                        value={h.dose || ""}
                        onChange={(e) => updateHerb(i, "dose", parseFloat(e.target.value) || 0)}
                        className="h-8 w-16 shrink-0"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">g</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeHerb(i)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  {editHerbs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">暂无药材，请添加</p>
                  )}
                </div>
              </div>

              {isModified && (
                <Button onClick={recalculate} disabled={parsing} variant="secondary" className="w-full">
                  {parsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  重新计价
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Herb table with prices */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" />
                药材清单
              </CardTitle>
              <CardDescription className="text-xs">
                单价 x 用量 x {doses}剂 = 小计
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
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
                    {result.herbs.map((h, i) => (
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
                          </div>
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
                          {h.retailPrice != null
                            ? `¥${(h.retailPrice * h.dose * doses).toFixed(2)}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={4} className="pt-3 pb-2 text-right font-bold pl-4">
                        {doses}剂合计
                      </td>
                      <td className="pt-3 pb-2 text-right font-bold text-base pr-4">
                        <span className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4 text-primary" />
                          ¥{totalWithDoses.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Overdose warnings */}
          {hasOverdoses && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  剂量超标提醒
                </div>
                <p className="text-xs text-red-500 mt-1">
                  标红闪烁的药材超出药典推荐剂量范围，请核实后调整
                </p>
              </CardContent>
            </Card>
          )}

          {/* Back button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setResult(null);
              setText("");
              setEditFormulaName("");
              setEditHerbs([]);
              setDoses(1);
            }}
          >
            重新识别
          </Button>
        </>
      )}
    </div>
  );
}
