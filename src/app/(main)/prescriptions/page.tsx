"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Pill, Clock, CheckCircle2, AlertCircle, MessageSquare, ChevronRight } from "lucide-react";

interface PrescriptionItem {
  id: string;
  consultationId: string;
  formulaName: string;
  patientName: string;
  patientId: string;
  herbCount: number;
  totalDoses: number;
  createdAt: string;
  isConfirmed: boolean;
  feedbackCount: number;
  pendingFeedbackCount: number;
}

export default function DoctorPrescriptionsPage() {
  const [list, setList] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/doctor/prescriptions")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setList(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground font-serif">处方管理</h1>
        <p className="text-sm text-muted-foreground mt-1">查看历史处方与药房反馈</p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">暂无处方记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <Link key={item.id} href={`/prescriptions/${item.id}`}>
              <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base group-hover:text-primary transition-colors">
                        {item.formulaName}
                      </span>
                      {item.isConfirmed ? (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-600 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          已捡药
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 text-amber-600 text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          待捡药
                        </Badge>
                      )}
                      {item.pendingFeedbackCount > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {item.pendingFeedbackCount}条待处理反馈
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                      <span>{item.patientName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Pill className="h-3 w-3" />
                        {item.herbCount}味
                      </span>
                      <span>·</span>
                      <span>{item.totalDoses}剂</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                      {item.feedbackCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {item.feedbackCount}条反馈
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
