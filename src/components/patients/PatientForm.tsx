"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AIDisclaimer } from "@/components/shared/AIDisclaimer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceInput } from "@/components/consultations/VoiceInput";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const patientSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  gender: z.string().optional(),
  age: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  constitution: z.string().optional(),
  chronicDisease: z.string().optional(),
  notes: z.string().optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  isLoading?: boolean;
}

function calcAge(birthDateStr: string): string {
  if (!birthDateStr) return "";
  const birth = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? String(age) : "";
}

export function PatientForm({ defaultValues, onSubmit, isLoading }: PatientFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      gender: defaultValues?.gender || "",
      age: defaultValues?.age || "",
      phone: defaultValues?.phone || "",
      birthDate: defaultValues?.birthDate || "",
      address: defaultValues?.address || "",
      allergies: defaultValues?.allergies || "",
      constitution: defaultValues?.constitution || "",
      chronicDisease: defaultValues?.chronicDisease || "",
      notes: defaultValues?.notes || "",
    },
  });

  const birthDate = watch("birthDate");

  useEffect(() => {
    if (birthDate) {
      setValue("age", calcAge(birthDate));
    }
  }, [birthDate, setValue]);

  // Voice + AI parsing state
  const [unstructuredText, setUnstructuredText] = useState("");
  const [parsing, setParsing] = useState(false);

  const handleAiParse = async () => {
    if (!unstructuredText.trim() || unstructuredText.trim().length < 3) {
      toast.error("请先输入至少3个字符的患者描述文本");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/patients/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: unstructuredText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "AI解析失败" }));
        toast.error(data.error || "AI解析失败");
        return;
      }
      const data = await res.json();
      // Auto-fill fields
      if (data.name) setValue("name", data.name);
      if (data.gender) setValue("gender", data.gender);
      if (data.age) setValue("age", data.age);
      if (data.phone) setValue("phone", data.phone);
      if (data.address) setValue("address", data.address);
      if (data.allergies) setValue("allergies", data.allergies);
      if (data.constitution) setValue("constitution", data.constitution);
      if (data.chronicDisease) setValue("chronicDisease", data.chronicDisease);
      if (data.notes) setValue("notes", data.notes);
      toast.success("AI解析完成，已自动填充表单");
    } catch (e) {
      console.error("AI parse error:", e);
      toast.error("网络错误，请重试");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Voice + AI parsing area */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">语音录入 / AI智能识别填充</Label>
          <VoiceInput
            onAppend={(text) => setUnstructuredText((prev) => prev + text)}
            disabled={parsing}
          />
        </div>
        <Textarea
          placeholder="点击麦克风录入患者信息，或手动输入如：'张三，男，35岁，电话13800138000，对青霉素过敏，有高血压病史，气虚质'..."
          value={unstructuredText}
          onChange={(e) => setUnstructuredText(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            支持普通话、广东话语音录入
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAiParse}
            disabled={parsing || unstructuredText.trim().length < 3}
          >
            {parsing ? (
              <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> AI解析中...</>
            ) : (
              <><Sparkles className="mr-1 h-3.5 w-3.5" /> AI智能识别填充</>
            )}
          </Button>
        </div>
        <AIDisclaimer />
      </div>

      {/* Form fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">姓名 *</Label>
            <Input id="name" {...register("name")} placeholder="患者姓名" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">性别</Label>
            <Select
              value={watch("gender")}
              onValueChange={(v) => setValue("gender", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择性别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="男">男</SelectItem>
                <SelectItem value="女">女</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">出生日期</Label>
            <Input id="birthDate" {...register("birthDate")} type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">年龄</Label>
            <Input id="age" {...register("age")} placeholder="自动计算或手动输入" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" {...register("phone")} placeholder="手机号" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="constitution">体质类型</Label>
            <Input id="constitution" {...register("constitution")} placeholder="如：气虚质、湿热质" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">地址</Label>
          <Input id="address" {...register("address")} placeholder="居住地址" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allergies">过敏史</Label>
          <Textarea id="allergies" {...register("allergies")} placeholder="药物、食物过敏史" rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chronicDisease">基础病史</Label>
          <Textarea id="chronicDisease" {...register("chronicDisease")} placeholder="高血压、糖尿病等慢性病史" rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">备注</Label>
          <Textarea id="notes" {...register("notes")} placeholder="其他备注信息" rows={2} />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </form>
    </div>
  );
}
