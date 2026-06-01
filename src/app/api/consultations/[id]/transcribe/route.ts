import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";
import { TRANSCRIBE_PROMPT } from "@/lib/ai/prompts";
import { StructuredHistorySchema } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const { rawText } = await request.json();

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
    const userMessage = `患者信息：姓名${consultation.patient.name}，性别${consultation.patient.gender || "未知"}，年龄${consultation.patient.age || "未知"}。\n\n已知过敏史：${consultation.patient.allergies || "无"}。\n已知基础病史：${consultation.patient.chronicDisease || "无"}。\n\n原始问诊文本：\n${rawText}`;

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
