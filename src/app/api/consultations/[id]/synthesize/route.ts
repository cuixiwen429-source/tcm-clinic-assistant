import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";

export const maxDuration = 60;
import { SYNTHESIZE_PROMPT } from "@/lib/ai/prompts";
import { SynthesizeResultSchema } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const { supplementText } = await request.json();

  if (!supplementText || supplementText.trim().length < 5) {
    return NextResponse.json({ error: "补充信息过短" }, { status: 400 });
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  try {
    // Build user message with old structured history + new supplement info
    const oldHistory = consultation.editedHistory || JSON.stringify({
      chief_complaint: consultation.chiefComplaint || "",
      present_illness: consultation.presentIllness || "",
      symptom_summary: consultation.symptomSummary || "{}",
      constitution: consultation.constitution || "",
    });

    const patientInfo = `患者：${consultation.patient.name}，${consultation.patient.gender || ""}，${consultation.patient.age || ""}岁\n体质：${consultation.patient.constitution || "未知"}\n过敏史：${consultation.patient.allergies || "无"}\n基础病史：${consultation.patient.chronicDisease || "无"}`;

    // Include tongue/face analysis if available
    let analysisCtx = "";
    if (consultation.tongueAnalysis) {
      try {
        const t = JSON.parse(consultation.tongueAnalysis);
        analysisCtx += `\n\n【舌象分析】${JSON.stringify(t)}`;
      } catch { /* ignore */ }
    }
    if (consultation.faceAnalysis) {
      try {
        const f = JSON.parse(consultation.faceAnalysis);
        analysisCtx += `\n\n【面象分析】${JSON.stringify(f)}`;
      } catch { /* ignore */ }
    }

    const userMessage = `已有结构化病史：\n${oldHistory}\n\n${patientInfo}${analysisCtx}\n\n医生追加补充信息：\n${supplementText}\n\n请将以上信息进行综合汇总，生成最终版结构化病史。`;

    const result = await callDeepSeekJson({
      systemPrompt: SYNTHESIZE_PROMPT,
      userMessage,
      schema: SynthesizeResultSchema,
      schemaName: "synthesize",
      temperature: 0.3,
    });

    // Save to consultation
    const editedHistory = JSON.stringify(result);

    await prisma.consultation.update({
      where: { id },
      data: {
        editedHistory,
        chiefComplaint: result.chief_complaint,
        presentIllness: result.present_illness,
        symptomSummary: JSON.stringify(result.symptom_summary),
        constitution: result.constitution || undefined,
        status: "AI_ASSISTED",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_SYNTHESIZE",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "综合汇总补充信息生成最终病史",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Synthesize error:", error);
    return NextResponse.json(
      { error: "AI综合汇总失败，请重试" },
      { status: 500 }
    );
  }
}
