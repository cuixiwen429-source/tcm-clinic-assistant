import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";
import { z } from "zod";

// Coerce all values to string — DeepSeek may return numbers for age etc.
const coerceString = z.union([z.string(), z.number(), z.boolean()]).transform((v) => String(v));
const patientParseSchema = z.object({
  name: z.string().optional(),
  gender: z.string().optional(),
  age: coerceString.optional(),
  phone: coerceString.optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  constitution: z.string().optional(),
  chronicDisease: z.string().optional(),
  notes: z.string().optional(),
  _raw: z.string().optional(),
}).passthrough();

const SYSTEM_PROMPT = `你是一个中医诊所的患者信息录入助手。请从非结构化的医患对话或描述文本中，提取患者的基本信息。

规则：
1. 只提取明确提到的信息，不要猜测或编造
2. 性别：只返回"男"或"女"
3. 年龄：返回数字字符串，如"35"
4. 手机号：中国大陆11位手机号，或文本中明确提到的电话号码
5. 过敏史：对药物、食物等的过敏信息
6. 基础病史：慢性病如高血压、糖尿病等
7. 体质类型：中医体质分类如气虚质、阳虚质、湿热质等
8. 地址：居住地址
9. 备注：其他可能有用的信息

请返回JSON格式数据。`;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return NextResponse.json({ error: "请输入至少3个字符的患者描述文本" }, { status: 400 });
    }

    const result = await callDeepSeekJson({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: text,
      schema: patientParseSchema,
      schemaName: "PatientParse",
      temperature: 0.1,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Patient AI Parse]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "AI返回数据格式异常，请重试" }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "AI解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
