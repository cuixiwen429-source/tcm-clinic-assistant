"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PatientForm, PatientFormValues } from "@/components/patients/PatientForm";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Loader2, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Patient {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  phone: string | null;
  constitution: string | null;
  updatedAt: string;
  _count: { consultations: number };
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "50");
      const res = await fetch(`/api/patients?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients);
      }
    } catch {
      toast.error("加载患者列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(search);
  }, [search, fetchPatients]);

  const handleCreate = async (values: PatientFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "创建失败");
        return;
      }
      const patient = await res.json();
      toast.success("患者创建成功");
      setDialogOpen(false);
      router.push(`/patients/${patient.id}`);
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">患者管理</h1>
          <p className="text-muted-foreground text-sm">管理患者档案</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新增患者
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-full sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>新增患者</DialogTitle>
            </DialogHeader>
            <PatientForm onSubmit={handleCreate} isLoading={submitting} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索姓名或手机号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">患者列表 ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : patients.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {search ? "未找到匹配的患者" : "暂无患者记录"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead className="hidden sm:table-cell">性别</TableHead>
                  <TableHead className="hidden sm:table-cell">年龄</TableHead>
                  <TableHead className="hidden md:table-cell">手机号</TableHead>
                  <TableHead className="hidden sm:table-cell">体质</TableHead>
                  <TableHead className="hidden sm:table-cell">就诊次数</TableHead>
                  <TableHead className="hidden md:table-cell">更新时间</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/patients/${p.id}`)}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {[p.gender, p.age ? `${p.age}岁` : null].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{p.gender || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{p.age || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.phone || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {p.constitution ? (
                        <Badge variant="outline">{p.constitution}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{p._count.consultations}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {p.updatedAt ? format(new Date(p.updatedAt), "MM-dd HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
