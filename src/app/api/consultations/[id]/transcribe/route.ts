import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";
import { callDeepSeekJson } from "@/lib/ai/client";
import { TRANSCRIBE_PROMPT } from "@/lib/ai/prompts";
import { StructuredHistorySchema } from "@/lib/ai/types";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const rawText = String(body.rawText || "");
  if (rawText.trim().length < 10) {
    return NextResponse.json({ error: "问诊文本过短，请输入至少10个字符" }, { status: 400 });
  }

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: { patient: true },
  });
  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const patientId = consultation.patientId;
  const patientName = consultation.patient.name || "未知";
  const patientGender = consultation.patient.gender || "未知";
  const patientAge = consultation.patient.age ?? "未知";
  const patientAllergies = consultation.patient.allergies || String(body.patientAllergies || "无");
  const patientChronic = consultation.patient.chronicDisease || String(body.patientChronicDisease || "无");

  try {
    let analysisCtx = "";
    const tongueAnalysis = body.tongueAnalysis as Record<string, unknown> | undefined;
    const faceAnalysis = body.faceAnalysis as Record<string, unknown> | undefined;
    if (tongueAnalysis) {
      const sa = tongueAnalysis.syndrome_analysis as Record<string, unknown> | undefined;
      analysisCtx += `\n\n【舌象AI分析结果】\n舌体：${JSON.stringify(tongueAnalysis.tongue_body)}，\n舌苔：${JSON.stringify(tongueAnalysis.tongue_coating)}，\n辨证：寒热${sa?.cold_heat || "？"}，虚实${sa?.deficiency_excess || "？"}，病位${sa?.disease_location || "？"}，六经${sa?.six_channel || "？"}，可能证型${JSON.stringify(sa?.likely_patterns || [])}，治则${sa?.treatment_principle || "？"}`;
    }
    if (faceAnalysis) {
      const sa = faceAnalysis.syndrome_analysis as Record<string, unknown> | undefined;
      analysisCtx += `\n\n【面象AI分析结果】\n面色：${JSON.stringify(faceAnalysis.facial_color)}，\n面部形态：${JSON.stringify(faceAnalysis.facial_morphology)}，\n五脏对应：${JSON.stringify(faceAnalysis.five_organ_face)}，\n辨证：寒热${sa?.cold_heat || "？"}，虚实${sa?.deficiency_excess || "？"}，脏腑${sa?.zangfu_differentiation || "？"}，可能证型${JSON.stringify(sa?.likely_patterns || [])}，治则${sa?.treatment_principle || "？"}`;
    }

    const userMessage = `患者信息：姓名${patientName}，性别${patientGender}，年龄${patientAge}。\n\n已知过敏史：${patientAllergies}。\n已知基础病史：${patientChronic}。${analysisCtx}\n\n原始问诊文本：\n${rawText}`;

    const result = await callDeepSeekJson({
      systemPrompt: TRANSCRIBE_PROMPT,
      userMessage,
      schema: StructuredHistorySchema,
      schemaName: "transcribe",
      temperature: 0.2,
    });

    const symptomSummary = JSON.stringify(result.symptom_summary);
    const editedHistory = JSON.stringify(result);

    await prisma.consultation.update({
      where: { id },
      data: {
        rawTranscription: rawText,
        editedHistory,
        chiefComplaint: result.chief_complaint,
        presentIllness: result.present_illness,
        constitution: result.constitution || undefined,
        symptomSummary,
        status: "AI_ASSISTED",
      },
    });

    // Update patient if new info discovered
    if (result.allergy_history) {
      try {
        await prisma.patient.update({ where: { id: patientId }, data: { allergies: result.allergy_history } });
      } catch { /* */ }
    }
    if (result.chronic_disease_history) {
      try {
        await prisma.patient.update({ where: { id: patientId }, data: { chronicDisease: result.chronic_disease_history } });
      } catch { /* */ }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_TRANSCRIBE",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "AI结构化病史",
      },
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json({ error: "AI处理失败，请重试" }, { status: 500 });
  }
}
