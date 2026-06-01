"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Edit, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PatientForm, PatientFormValues } from "@/components/patients/PatientForm";

interface Consultation {
  id: string;
  visitDate: string;
  chiefComplaint: string | null;
  status: string;
  prescriptions: { id: string; formulaName: string | null; version: number }[];
}

interface Patient {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  birthDate: string | null;
  allergies: string | null;
  constitution: string | null;
  chronicDisease: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  consultations: Consultation[];
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPatient();
  }, [params.id]);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`);
      if (res.ok) {
        setPatient(await res.json());
      } else {
        toast.error("患者不存在");
        router.push("/patients");
      }
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (values: PatientFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("更新失败");
        return;
      }
      toast.success("患者信息已更新");
      setEditOpen(false);
      fetchPatient();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patient) return null;

  const statusLabels: Record<string, string> = {
    DRAFT: "草稿",
    AI_ASSISTED: "AI辅助中",
    PRESCRIBED: "已处方",
    FINALIZED: "已完成",
    ARCHIVED: "已归档",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/patients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground text-sm">
              {patient.gender && `${patient.gender} · `}
              {patient.age && `${patient.age}岁 · `}
              {patient.phone || "无手机号"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-full sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>编辑患者信息</DialogTitle>
              </DialogHeader>
              <PatientForm
                defaultValues={{
                  name: patient.name,
                  gender: patient.gender || "",
                  age: patient.age?.toString() || "",
                  phone: patient.phone || "",
                  birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : "",
                  allergies: patient.allergies || "",
                  constitution: patient.constitution || "",
                  chronicDisease: patient.chronicDisease || "",
                  notes: patient.notes || "",
                }}
                onSubmit={handleUpdate}
                isLoading={submitting}
              />
            </DialogContent>
          </Dialog>
          <Button onClick={() => router.push(`/consultations/new?patientId=${patient.id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            新建就诊
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">姓名</span>
              <span className="font-medium">{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">性别</span>
              <span>{patient.gender || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">年龄</span>
              <span>{patient.age || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">手机号</span>
              <span>{patient.phone || "-"}</span>
            </div>
            {patient.constitution && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">体质</span>
                <Badge variant="outline">{patient.constitution}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">健康信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">过敏史</p>
              <p className="text-sm">{patient.allergies || "无"}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">基础病史</p>
              <p className="text-sm">{patient.chronicDisease || "无"}</p>
            </div>
            {patient.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">备注</p>
                  <p className="text-sm">{patient.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">就诊记录 ({patient.consultations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.consultations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">暂无就诊记录</p>
          ) : (
            <div className="space-y-3">
              {patient.consultations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/consultations/${c.id}/ai`)}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {c.chiefComplaint || "未填写主诉"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.visitDate), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.prescriptions[0] && (
                      <Badge variant="outline" className="text-xs">
                        {c.prescriptions[0].formulaName || "处方v" + c.prescriptions[0].version}
                      </Badge>
                    )}
                    <Badge>{statusLabels[c.status] || c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
