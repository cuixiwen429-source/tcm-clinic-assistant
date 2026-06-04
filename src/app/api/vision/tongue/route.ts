import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { consultationAccessWhere } from "@/lib/auth/access";
import { analyzeImage } from "@/lib/vision/doubao-vision";

export const maxDuration = 60;

async function resizeImage(buf: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buf)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer();
  } catch {
    return buf; // sharp unavailable or image malformed — use original
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const apiKey = process.env.VOLCENGINE_ARK_API_KEY || process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!apiKey) return NextResponse.json({ error: "火山引擎视觉API Key未配置" }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("image") as File | null;
    const consultationId = form.get("consultationId") as string | null;

    if (!file) return NextResponse.json({ error: "未上传舌苔图片" }, { status: 400 });

    const arr = new Uint8Array(await file.arrayBuffer());
    const buf = await resizeImage(Buffer.from(arr));
    const imageBase64 = buf.toString("base64");

    // Fetch patient info for context
    let patientCtx = "";
    if (consultationId) {
      const consultation = await prisma.consultation.findFirst({
        where: consultationAccessWhere(session, consultationId),
        include: { patient: { select: { name: true, gender: true, age: true, constitution: true, allergies: true, chronicDisease: true } } },
      });
      if (!consultation) {
        return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
      }
      if (consultation?.patient) {
        const p = consultation.patient;
        patientCtx = `\n\n【患者基本信息】姓名：${p.name || "未知"}，性别：${p.gender || "未知"}，年龄：${p.age ?? "未知"}岁，体质：${p.constitution || "未知"}，过敏史：${p.allergies || "无"}，慢性病史：${p.chronicDisease || "无"}`;
      }
    }

    const prompt = `中医舌诊专家。请直接观察舌象并返回分析结果。${patientCtx}

【分析要点】
舌质（舌色、舌形、舌态、舌下络脉）
舌苔（苔色、苔质、分布）
辨证（寒热、虚实、病位、脏腑、六经、证型）
临床意义（病理、治则、预后）

返回JSON（简洁扼要，每个字段控制在20字内）：
{
  "tongue_body": {"color":"","color_desc":"","shape":[],"shape_desc":"","mobility":"","sublingual_veins":""},
  "tongue_coating": {"color":"","coating_type":[],"distribution":"","coating_desc":""},
  "syndrome_analysis": {"overall_description":"","cold_heat":"","deficiency_excess":"","disease_location":"","organs_involved":[],"qi_blood_fluid":[],"six_channel":"","eight_principles":"","likely_patterns":[],"pathological_significance":"","differential_points":"","treatment_principle":"","prognosis":""}
}`;

    const result = await analyzeImage({ imageBase64, prompt });

    // Try to parse as JSON; if fails, return raw text
    let parsed: unknown;
    try {
      const cleaned = result.replace(/```json\s*|```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw_analysis: result };
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "舌象分析失败";
    console.error("[TongueVision]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
