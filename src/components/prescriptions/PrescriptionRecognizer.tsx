"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AIDisclaimer } from "@/components/shared/AIDisclaimer";
import { VoiceInput } from "@/components/consultations/VoiceInput";
import { Loader2, Sparkles, Pill, AlertTriangle, ScanLine, DollarSign } from "lucide-react";
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
}

export function PrescriptionRecognizer({ apiEndpoint }: PrescriptionRecognizerProps) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [doses, setDoses] = useState(1);

  const handleParse = async () => {
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
      setResult(data);
      toast.success(`识别完成：${data.herbs?.length || 0}味药材`);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setParsing(false);
    }
  };

  const totalWithDoses = result
    ? result.herbs.reduce((sum, h) => {
        if (h.retailPrice != null) return sum + h.retailPrice * h.dose * doses;
        return sum;
      }, 0)
    : 0;

  const hasOverdoses = result?.herbs.some((h) => h.overdosed);

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground font-serif flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          处方识别
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          语音或文字录入他人处方，自动识别药材克数并计算价格
        </p>
      </div>

      {/* Input area */}
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
            口述或输入处方内容，如："小柴胡汤加减，柴胡12克，黄芩9克，半夏9克，党参9克，炙甘草6克，生姜9克，大枣4枚"
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
              onClick={handleParse}
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

      {/* Results */}
      {result && (
        <>
          {/* Formula name + dose selector */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-serif">
                  {result.formulaName || "未命名方剂"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {result.herbs.length}味药材
                </p>
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
            </CardContent>
          </Card>

          {/* Herb table */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" />
                药材清单
              </CardTitle>
              <CardDescription className="text-xs">
                单价 × 用量 × {doses}剂 = 小计
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
                        <td className="py-2.5 text-right font-medium">
                          {h.dose}{h.unit}
                        </td>
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
                  标红闪烁的药材超出药典推荐剂量范围，请核实
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
