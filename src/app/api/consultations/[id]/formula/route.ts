import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";
import { FORMULA_RECOMMENDATION_PROMPT } from "@/lib/ai/prompts";
import { z } from "zod";
import { FormulaPlanSchema } from "@/lib/ai/types";

const FormulaArraySchema = z.array(FormulaPlanSchema);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const userMessage = `患者：${consultation.patient.name}，${consultation.patient.gender || ""}，${consultation.patient.age || ""}岁。\n体质：${consultation.patient.constitution || "未知"}。\n\n病史：${consultation.editedHistory || ""}\n\n胡希恕辨证：${consultation.huXishuAnalysis || ""}\n张锡纯辨证：${consultation.zhangXichunAnalysis || ""}\n倪海厦辨证：${consultation.niHaixiaAnalysis || ""}\n李可辨证：${consultation.liKeAnalysis || ""}\n\n医生确认辨证：${consultation.doctorFinalPattern || "未确认"}\n医生确认病机：${consultation.doctorFinalPathogenesis || "未确认"}`;

  try {
    const formulas = await callDeepSeekJson({
      systemPrompt: FORMULA_RECOMMENDATION_PROMPT,
      userMessage,
      schema: FormulaArraySchema,
      schemaName: "formula",
      temperature: 0.3,
      maxTokens: 8192,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_FORMULA",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "AI分层选方推荐",
      },
    });

    return NextResponse.json(formulas);
  } catch (error) {
    console.error("Formula error:", error);
    return NextResponse.json({ error: "AI选方失败" }, { status: 500 });
  }
}
