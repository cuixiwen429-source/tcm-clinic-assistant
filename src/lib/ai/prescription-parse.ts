import { callDeepSeekJson } from "@/lib/ai/client";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const herbItemSchema = z.object({
  name: z.string(),
  dose: z.number(),
});

const prescriptionParseSchema = z.object({
  formulaName: z.string().optional(),
  herbs: z.array(herbItemSchema).min(1),
}).passthrough();

const SYSTEM_PROMPT = `你是一个中医处方录入助手。从用户输入的文本中提取处方信息。

你必须输出一个严格的JSON对象：
{
  "formulaName": "方名（如果提到了就填，没提到填空字符串）",
  "herbs": [
    {"name": "药材标准中文名", "dose": 克数（数字，不是字符串）}
  ]
}

规则：
1. 提取所有提到的药材和克数，克数必须是数字（如30，不是"30"）
2. 如果提到方名（如"小柴胡汤加减"、"四物汤"、"麻黄汤"等），提取为formulaName，没提到返回空字符串""
3. 药材名请使用标准中文名称，去掉"克"、"g"等单位词
4. 同一药材多次提到只保留一次
5. herbs数组至少包含一味药

重要：必须严格返回上述JSON格式，herbs必须是非空数组。`;

export interface ParsedPrescription {
  formulaName: string;
  herbs: Array<{
    name: string;
    dose: number;
    retailPrice: number | null;
    unit: string;
    subtotal: number | null;
    pharmacopoeiaMin: number | null;
    pharmacopoeiaMax: number | null;
    overdosed: boolean;
  }>;
  totalCost: number;
}

export async function parsePrescriptionText(text: string): Promise<ParsedPrescription> {
  const result = await callDeepSeekJson({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: text,
    schema: prescriptionParseSchema,
    schemaName: "PrescriptionParse",
    temperature: 0.1,
  });

  const formulaName = (result as Record<string, unknown>).formulaName as string || "";
  const herbs: Array<{ name: string; dose: number }> = (result as Record<string, unknown>).herbs as Array<{ name: string; dose: number }> || [];

  // Look up prices from database
  const herbNames = herbs.map((h) => h.name);
  const herbRefs = herbNames.length > 0
    ? await prisma.herbReference.findMany({
        where: { name: { in: herbNames } },
        include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } },
      })
    : [];

  const refMap = new Map(herbRefs.map((r) => [r.name, r]));

  let totalCost = 0;
  const herbsWithInfo = herbs.map((h) => {
    const ref = refMap.get(h.name);
    const price = ref?.prices[0]?.retailPrice ?? null;
    // For cost calculation, use 1 dose as the default; user can adjust later
    const subtotal = price != null ? +(price * h.dose * 1).toFixed(2) : null;
    if (subtotal != null) totalCost += subtotal;
    return {
      name: h.name,
      dose: h.dose,
      retailPrice: price,
      unit: ref?.unit || "g",
      subtotal,
      pharmacopoeiaMin: ref?.pharmacopoeiaMin ?? null,
      pharmacopoeiaMax: ref?.pharmacopoeiaMax ?? null,
      overdosed: ref?.pharmacopoeiaMax != null ? h.dose > ref.pharmacopoeiaMax : false,
    };
  });

  totalCost = +totalCost.toFixed(2);

  return { formulaName, herbs: herbsWithInfo, totalCost };
}
