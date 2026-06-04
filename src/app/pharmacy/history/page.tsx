"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900">历史记录</h1>
        <p className="text-emerald-600">已完成捡药的处方记录</p>
      </div>

      <Card className="border-emerald-200">
        <CardHeader>
          <CardTitle className="text-lg text-emerald-800">
            已完成处方
            <span className="text-sm font-normal text-muted-foreground ml-2">
              共 {history.length} 条
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
              <p>暂无已完成处方</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Link
                  key={item.id}
                  href={`/pharmacy/prescriptions/${item.id}`}
                  className="flex items-center justify-between rounded-lg border border-emerald-100 p-4 hover:bg-emerald-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-emerald-900">
                      {item.formulaName || "未命名方剂"}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.herbCount}味药
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{item.patientName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {item.totalCost != null && (
                      <p className="text-sm font-semibold text-emerald-700">
                        ¥{item.totalCost.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.confirmedAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
