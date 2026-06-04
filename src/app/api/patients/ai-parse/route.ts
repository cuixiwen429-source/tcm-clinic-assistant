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
}).passthrough();

const SYSTEM_PROMPT = `你是一个中医诊所的患者信息录入助手。从用户输入的文本中提取患者信息，严格按照下面的JSON格式输出。

你必须输出一个JSON对象，包含以下字段（未提及的字段设为空字符串""）：

{
  "name": "患者姓名",
  "gender": "男或女",
  "age": "年龄数字",
  "phone": "手机号",
  "address": "地址",
  "allergies": "过敏史",
  "constitution": "中医体质类型",
  "chronicDisease": "慢性病史",
  "notes": "备注"
}

规则：
1. 只提取明确提到的信息，未提及的字段返回空字符串""
2. 性别只返回"男"或"女"，无法判断返回""
3. 年龄、手机号也以字符串形式返回（如"35"、"13800138000"）
4. 过敏史包括药物、食物过敏
5. 体质类型如：气虚质、阳虚质、阴虚质、湿热质、痰湿质、血瘀质、气郁质、特禀质、平和质
6. 所有字段都必须存在，即使为空也要返回空字符串

重要：必须严格返回上述JSON格式，每个字段都必须包含，未提及的字段值设为空字符串""。`;

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
