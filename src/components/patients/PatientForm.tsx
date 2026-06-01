"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const patientSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  gender: z.string().optional(),
  age: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
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

export function PatientForm({ defaultValues, onSubmit, isLoading }: PatientFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      gender: defaultValues?.gender || "",
      age: defaultValues?.age || "",
      phone: defaultValues?.phone || "",
      birthDate: defaultValues?.birthDate || "",
      allergies: defaultValues?.allergies || "",
      constitution: defaultValues?.constitution || "",
      chronicDisease: defaultValues?.chronicDisease || "",
      notes: defaultValues?.notes || "",
    },
  });

  return (
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
          <Label htmlFor="age">年龄</Label>
          <Input id="age" {...register("age")} placeholder="年龄" type="number" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">手机号</Label>
          <Input id="phone" {...register("phone")} placeholder="手机号" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">出生日期</Label>
          <Input id="birthDate" {...register("birthDate")} type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="constitution">体质类型</Label>
          <Input id="constitution" {...register("constitution")} placeholder="如：气虚质、湿热质" />
        </div>
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
  );
}
