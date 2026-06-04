import { analyzeImage } from "@/lib/vision/doubao-vision";
import { prisma } from "@/lib/db/prisma";

const OCR_PROMPT = `你是一个中医处方OCR识别助手。请仔细观察这张处方图片（可能是手写或打印），识别其中所有药材名称及其用量（克数）。

你必须返回一个严格的JSON对象：
{
  "formulaName": "处方名（如果图片上有方名就填，没看到就填空字符串）",
  "herbs": [
    {"name": "药材标准中文名", "dose": 克数（数字类型，不是字符串）}
  ]
}

规则：
1. 仔细识别图片中所有药材名称和对应的克数（g），克数必须是数字如30，不是"30"
2. 如果处方有名称（如"小柴胡汤"、"四物汤加减"、"自拟方"等），提取到formulaName，没看到方名返回空字符串""
3. 药名使用标准中文名称，去除序号、特殊符号、单位词（克、g等）
4. 手写处方请尽量辨认，模糊不清的药材宁可不识别也不要猜测
5. 克数写数字，不要带单位
6. herbs数组必须包含至少一味药（如果连一味药都识别不出，返回空数组）
7. 中药饮片才识别，西药、中成药不识别

重要：返回格式必须是合法的JSON。`;

export interface OcrResult {
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
  rawText?: string;
}

export async function ocrPrescription(imageBase64: string): Promise<OcrResult> {
  const rawText = await analyzeImage({
    imageBase64,
    prompt: OCR_PROMPT,
    maxTokens: 2048,
    temperature: 0.1,
  });

  // Parse the JSON response from the vision model
  let parsed: { formulaName?: string; herbs?: Array<{ name: string; dose: number }> };
  try {
    const cleaned = rawText.replace(/```json\s*|```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("OCR识别结果解析失败，请重试");
      }
    } else {
      throw new Error("OCR识别结果格式异常，请重试");
    }
  }

  const formulaName = parsed.formulaName || "";
  const herbs = parsed.herbs || [];

  if (herbs.length === 0) {
    throw new Error("未能从图片中识别出药材，请确认图片清晰且包含处方内容");
  }

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

  return { formulaName, herbs: herbsWithInfo, totalCost, rawText };
}
