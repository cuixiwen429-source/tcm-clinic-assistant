import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";

export const maxDuration = 60;
import { ADVICE_PROMPT } from "@/lib/ai/prompts";
import { AdviceResultSchema } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  let consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      patient: true,
      prescriptions: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  // Never block — create stub if missing
  if (!consultation) {
    await prisma.consultation.upsert({
      where: { id },
      update: {},
      create: { id, patientId: "unknown", doctorId: session.userId, status: "DRAFT" },
    }).catch(() => {});
    await prisma.patient.upsert({
      where: { id: "unknown" },
      update: {},
      create: { id: "unknown", name: "未知患者" },
    }).catch(() => {});
    consultation = await prisma.consultation.findUnique({
      where: { id },
      include: { patient: true, prescriptions: { orderBy: { version: "desc" }, take: 1 } },
    });
  }

  const prescription = consultation?.prescriptions?.[0];
  const patient = consultation?.patient;
  const userMessage = `患者：${patient?.name || "未知"}，${patient?.gender || ""}，${patient?.age || ""}岁\n体质：${patient?.constitution || "未知"}\n\n辨证：${consultation?.doctorFinalPattern || consultation?.chiefComplaint || ""}\n\n处方：${prescription?.herbs || "[]"}\n方名：${prescription?.formulaName || ""}`;

  try {
    const result = await callDeepSeekJson({
      systemPrompt: ADVICE_PROMPT,
      userMessage,
      schema: AdviceResultSchema,
      schemaName: "advice",
      temperature: 0.4,
    });

    const adviceText = JSON.stringify(result);

    const advice = await prisma.advice.create({
      data: {
        consultationId: id,
        adviceContent: adviceText,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_ADVICE",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "生成个性化医嘱",
      },
    }).catch(() => {});

    return NextResponse.json({ ...result, id: advice.id });
  } catch (error) {
    console.error("Advice error:", error);
    return NextResponse.json({ error: "AI医嘱生成失败" }, { status: 500 });
  }
}
