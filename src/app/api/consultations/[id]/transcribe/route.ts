import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
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
  const { rawText, tongueAnalysis, faceAnalysis } = await request.json();

  if (!rawText || rawText.trim().length < 10) {
    return NextResponse.json({ error: "问诊文本过短，请输入至少10个字符" }, { status: 400 });
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  try {
    let analysisCtx = "";
    if (tongueAnalysis) {
      const t = tongueAnalysis as Record<string, unknown>;
      const sa = t.syndrome_analysis as Record<string, unknown> | undefined;
      analysisCtx += `\n\n【舌象AI分析结果】\n舌体：${JSON.stringify(t.tongue_body)}，\n舌苔：${JSON.stringify(t.tongue_coating)}，\n辨证：寒热${sa?.cold_heat || "？"}，虚实${sa?.deficiency_excess || "？"}，病位${sa?.disease_location || "？"}，六经${sa?.six_channel || "？"}，可能证型${JSON.stringify(sa?.likely_patterns || [])}，治则${sa?.treatment_principle || "？"}`;
    }
    if (faceAnalysis) {
      const f = faceAnalysis as Record<string, unknown>;
      const sa = f.syndrome_analysis as Record<string, unknown> | undefined;
      analysisCtx += `\n\n【面象AI分析结果】\n面色：${JSON.stringify(f.facial_color)}，\n面部形态：${JSON.stringify(f.facial_morphology)}，\n五脏对应：${JSON.stringify(f.five_organ_face)}，\n辨证：寒热${sa?.cold_heat || "？"}，虚实${sa?.deficiency_excess || "？"}，脏腑${sa?.zangfu_differentiation || "？"}，可能证型${JSON.stringify(sa?.likely_patterns || [])}，治则${sa?.treatment_principle || "？"}`;
    }

    const userMessage = `患者信息：姓名${consultation.patient.name}，性别${consultation.patient.gender || "未知"}，年龄${consultation.patient.age || "未知"}。\n\n已知过敏史：${consultation.patient.allergies || "无"}。\n已知基础病史：${consultation.patient.chronicDisease || "无"}。${analysisCtx}\n\n原始问诊文本：\n${rawText}`;

    const result = await callDeepSeekJson({
      systemPrompt: TRANSCRIBE_PROMPT,
      userMessage,
      schema: StructuredHistorySchema,
      schemaName: "transcribe",
      temperature: 0.2,
    });

    // Save to consultation
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
    if (result.allergy_history && !consultation.patient.allergies) {
      await prisma.patient.update({
        where: { id: consultation.patientId },
        data: { allergies: result.allergy_history },
      });
    }
    if (result.chronic_disease_history && !consultation.patient.chronicDisease) {
      await prisma.patient.update({
        where: { id: consultation.patientId },
        data: { chronicDisease: result.chronic_disease_history },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_TRANSCRIBE",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "AI结构化病史",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      { error: "AI处理失败，请重试" },
      { status: 500 }
    );
  }
}
