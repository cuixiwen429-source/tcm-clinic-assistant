"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, ChevronRight } from "lucide-react";

interface HistoryItem {
  id: string;
  consultationId: string;
  formulaName: string | null;
  patientName: string;
  herbCount: number;
  totalCost: number | null;
  confirmedAt: string;
}

export default function PharmacyHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pharmacy/history")
      .then((r) => r.json())
      .then((data) => setHistory(data.prescriptions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-emerald-900">历史记录</h1>
        <p className="text-sm text-emerald-600 mt-0.5">已完成捡药的处方记录</p>
      </div>

      <Card className="border-emerald-200">
        <CardHeader className="pb-2 px-4 md:px-6 pt-4 md:pt-5">
          <CardTitle className="text-base md:text-lg text-emerald-800">
            已完成处方
            <span className="text-sm font-normal text-muted-foreground ml-2">
              共 {history.length} 条
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-2 pb-2">
          {history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-200" />
              <p className="text-sm">暂无已完成处方</p>
            </div>
          ) : (
            <div className="divide-y divide-emerald-50">
              {history.map((item) => (
                <Link
                  key={item.id}
                  href={`/pharmacy/prescriptions/${item.id}`}
                  className="flex items-center gap-3 px-4 md:px-6 py-3.5 hover:bg-emerald-50/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm md:text-base text-emerald-900 truncate">
                      {item.formulaName || "未命名方剂"}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                      {item.patientName} · {item.herbCount}味药
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.totalCost != null && (
                      <p className="text-sm md:text-base font-semibold text-emerald-700">
                        ¥{item.totalCost.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.confirmedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-500 transition-colors hidden sm:block" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
