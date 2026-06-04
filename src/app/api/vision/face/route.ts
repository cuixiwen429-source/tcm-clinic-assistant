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
    return buf;
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

    if (!file) return NextResponse.json({ error: "未上传面相图片" }, { status: 400 });

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

    const prompt = `中医面诊。直接返回JSON（每字段≤15字）：${patientCtx}
{
  "facial_color": {"overall_color":"","distribution":"","luster":"","depth":""},
  "facial_morphology": {"overall":"","eyes":"","lips":"","nose":"","other_features":[]},
  "five_organ_face": {"forehead_heart":"","nose_spleen":"","cheeks_lung":"","temples_liver":"","chin_kidney":""},
  "syndrome_analysis": {"overall_impression":"","cold_heat":"","deficiency_excess":"","organs_involved":[],"qi_blood_fluid":[],"likely_patterns":[],"pathological_significance":"","treatment_principle":"","prognosis":""}
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
    const msg = err instanceof Error ? err.message : "面相分析失败";
    console.error("[FaceVision]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
