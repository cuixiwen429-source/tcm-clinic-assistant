import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { analyzeImage } from "@/lib/vision/doubao-vision";

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

    const buf = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buf.toString("base64");

    // Fetch patient info for context
    let patientCtx = "";
    if (consultationId) {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: { patient: { select: { name: true, gender: true, age: true, constitution: true, allergies: true, chronicDisease: true } } },
      });
      if (consultation?.patient) {
        const p = consultation.patient;
        patientCtx = `\n\n【患者基本信息】姓名：${p.name || "未知"}，性别：${p.gender || "未知"}，年龄：${p.age ?? "未知"}岁，体质：${p.constitution || "未知"}，过敏史：${p.allergies || "无"}，慢性病史：${p.chronicDisease || "无"}`;
      }
    }

    const prompt = `中医面诊专家。请直接观察面部特征并返回分析结果。${patientCtx}

【分析要点】
面色（五色、分布、光泽、浮沉）
面部形态（整体、眼部、口唇、鼻部、其他特征）
五脏面部分候（额-心、鼻-脾、颧-肺、颞-肝、颌-肾）
辨证（寒热、虚实、脏腑、气血津液、证型）
临床意义（病理、治则、预后）

返回JSON（简洁扼要，每个字段控制在20字内）：
{
  "facial_color": {"overall_color":"","distribution":"","luster":"","depth":""},
  "facial_morphology": {"overall":"","eyes":"","lips":"","nose":"","other_features":[]},
  "five_organ_face": {"forehead_heart":"","nose_spleen":"","cheeks_lung":"","temples_liver":"","chin_kidney":""},
  "syndrome_analysis": {"overall_impression":"","primary_secondary_color":"","cold_heat":"","deficiency_excess":"","disease_location":"","organs_involved":[],"qi_blood_fluid":[],"zangfu_differentiation":"","likely_patterns":[],"pathological_significance":"","differential_points":"","treatment_principle":"","prognosis":""}
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
