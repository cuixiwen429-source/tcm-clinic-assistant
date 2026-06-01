import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";

export const maxDuration = 60;
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
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const patientId = String(body.patientId || "unknown");
  const patientName = String(body.patientName || "未知");
  const patientGender = String(body.patientGender || "未知");
  const patientAge = String(body.patientAge || "未知");
  const patientConstitution = String(body.patientConstitution || "未知");

  // Ensure patient + consultation exist — never block
  await prisma.patient.upsert({
    where: { id: patientId },
    update: {},
    create: {
      id: patientId, name: patientName,
      gender: patientGender || null,
      age: typeof body.patientAge === "number" ? body.patientAge : null,
      constitution: patientConstitution,
    },
  }).catch(() => {});

  await prisma.consultation.upsert({
    where: { id },
    update: {},
    create: {
      id, patientId, doctorId: session.userId, status: "AI_ASSISTED",
      editedHistory: typeof body.editedHistory === "string" ? body.editedHistory : undefined,
      tongueAnalysis: typeof body.tongueAnalysis === "string" ? body.tongueAnalysis : undefined,
      faceAnalysis: typeof body.faceAnalysis === "string" ? body.faceAnalysis : undefined,
      huXishuAnalysis: typeof body.huXishuAnalysis === "string" ? body.huXishuAnalysis : undefined,
      zhangXichunAnalysis: typeof body.zhangXichunAnalysis === "string" ? body.zhangXichunAnalysis : undefined,
      niHaixiaAnalysis: typeof body.niHaixiaAnalysis === "string" ? body.niHaixiaAnalysis : undefined,
      liKeAnalysis: typeof body.liKeAnalysis === "string" ? body.liKeAnalysis : undefined,
      doctorFinalPattern: typeof body.doctorFinalPattern === "string" ? body.doctorFinalPattern : undefined,
      doctorFinalPathogenesis: typeof body.doctorFinalPathogenesis === "string" ? body.doctorFinalPathogenesis : undefined,
    },
  }).catch(() => {});

  const tongueAnalysis = typeof body.tongueAnalysis === "string" ? body.tongueAnalysis : null;
  const faceAnalysis = typeof body.faceAnalysis === "string" ? body.faceAnalysis : null;
  const editedHistory = typeof body.editedHistory === "string" ? body.editedHistory : "";
  const huXishuAnalysis = typeof body.huXishuAnalysis === "string" ? body.huXishuAnalysis : "";
  const zhangXichunAnalysis = typeof body.zhangXichunAnalysis === "string" ? body.zhangXichunAnalysis : "";
  const niHaixiaAnalysis = typeof body.niHaixiaAnalysis === "string" ? body.niHaixiaAnalysis : "";
  const liKeAnalysis = typeof body.liKeAnalysis === "string" ? body.liKeAnalysis : "";
  const doctorFinalPattern = typeof body.doctorFinalPattern === "string" ? body.doctorFinalPattern : "";
  const doctorFinalPathogenesis = typeof body.doctorFinalPathogenesis === "string" ? body.doctorFinalPathogenesis : "";

  const userMessage = `患者：${patientName}，${patientGender || ""}，${patientAge || ""}岁。\n体质：${patientConstitution}。\n\n舌诊分析：${tongueAnalysis || "未提供"}\n面诊分析：${faceAnalysis || "未提供"}\n\n病史：${editedHistory}\n\n胡希恕辨证：${huXishuAnalysis}\n张锡纯辨证：${zhangXichunAnalysis}\n倪海厦辨证：${niHaixiaAnalysis}\n李可辨证：${liKeAnalysis}\n\n医生确认辨证：${doctorFinalPattern || "未确认"}\n医生确认病机：${doctorFinalPathogenesis || "未确认"}`;

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
    }).catch(() => {});

    return NextResponse.json(formulas);
  } catch (error) {
    console.error("Formula error:", error);
    return NextResponse.json({ error: "AI选方失败" }, { status: 500 });
  }
}
