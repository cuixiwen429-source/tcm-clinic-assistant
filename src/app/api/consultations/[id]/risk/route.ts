import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";
import { callDeepSeekJson } from "@/lib/ai/client";

export const maxDuration = 60;
import { RISK_PREDICTION_PROMPT } from "@/lib/ai/prompts";
import { RiskPredictionSchema } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const prescriptionId = body.prescriptionId as string | undefined;

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const prescription = prescriptionId
    ? await prisma.prescription.findFirst({ where: { id: prescriptionId, consultationId: id } }).catch(() => null)
    : null;

  if (prescriptionId && !prescription) {
    return NextResponse.json({ error: "处方不存在" }, { status: 404 });
  }

  const patient = consultation?.patient;
  const userMessage = `患者：${patient?.name || "未知"}，${patient?.gender || ""}，${patient?.age || ""}岁\n体质：${patient?.constitution || "未知"}\n过敏史：${patient?.allergies || "无"}\n\n辨证：${consultation?.doctorFinalPattern || consultation?.chiefComplaint || ""}\n\n处方：${prescription?.herbs || "[]"}\n方名：${prescription?.formulaName || ""}`;

  try {
    const result = await callDeepSeekJson({
      systemPrompt: RISK_PREDICTION_PROMPT,
      userMessage,
      schema: RiskPredictionSchema,
      schemaName: "risk",
      temperature: 0.2,
    });

    const patientFriendly = `服药期间如出现${result.risk_items.flatMap(r => r.possible_reactions).slice(0, 3).join("、")}等轻微反应，请先观察并按医嘱反馈；如出现明显皮疹、胸闷心慌、剧烈呕吐、严重腹泻、咽喉明显肿痛等不适，请立即停药并联系医生复诊。`;

    const riskPrediction = await prisma.riskPrediction.create({
      data: {
        consultationId: id,
        predictedRisks: JSON.stringify(result),
        patientFriendlyText: patientFriendly,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_RISK",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "生成副作用预判",
      },
    }).catch(() => {});

    return NextResponse.json({
      ...result,
      patient_friendly: patientFriendly,
      id: riskPrediction.id,
    });
  } catch (error) {
    console.error("Risk prediction error:", error);
    return NextResponse.json({ error: "AI风险预判失败" }, { status: 500 });
  }
}
