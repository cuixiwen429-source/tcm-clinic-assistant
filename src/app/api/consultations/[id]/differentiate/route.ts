import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { callDeepSeekJson } from "@/lib/ai/client";

export const maxDuration = 60;
import {
  DIFFERENTIATE_HU_XISHU_PROMPT,
  DIFFERENTIATE_ZHANG_XICHUN_PROMPT,
  DIFFERENTIATE_NI_HAIXIA_PROMPT,
  DIFFERENTIATE_LI_KE_PROMPT,
} from "@/lib/ai/prompts";
import { DifferentiationResultSchema } from "@/lib/ai/types";

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
    },
  }).catch(() => {});

  // Build user message from request body (always available)
  const editedHistory = (typeof body.editedHistory === "string" && body.editedHistory) ? body.editedHistory : JSON.stringify({ chief_complaint: "" });

  let analysisCtx = "";
  if (typeof body.tongueAnalysis === "string" && body.tongueAnalysis) {
    try { analysisCtx += `\n\n【舌象AI分析】${JSON.stringify(JSON.parse(body.tongueAnalysis))}`; } catch { /* */ }
  }
  if (typeof body.faceAnalysis === "string" && body.faceAnalysis) {
    try { analysisCtx += `\n\n【面象AI分析】${JSON.stringify(JSON.parse(body.faceAnalysis))}`; } catch { /* */ }
  }

  const userMessage = `患者：${patientName}，${patientGender}，${patientAge}岁。\n体质：${patientConstitution}。${analysisCtx}\n\n结构化病史：\n${editedHistory}`;

  const systems = [
    { name: "huXishu", prompt: DIFFERENTIATE_HU_XISHU_PROMPT },
    { name: "zhangXichun", prompt: DIFFERENTIATE_ZHANG_XICHUN_PROMPT },
    { name: "niHaixia", prompt: DIFFERENTIATE_NI_HAIXIA_PROMPT },
    { name: "liKe", prompt: DIFFERENTIATE_LI_KE_PROMPT },
  ];

  try {
    const results = await Promise.all(
      systems.map((s) =>
        callDeepSeekJson({
          systemPrompt: s.prompt,
          userMessage,
          schema: DifferentiationResultSchema,
          schemaName: `differentiate-${s.name}`,
          temperature: 0.3,
          maxTokens: 8192,
        }).catch((err) => {
          console.error(`Differentiation ${s.name} failed:`, err);
          return { error: `${s.name} 体系分析失败`, doctor_checkpoints: ["请医生手动辨证"] };
        })
      )
    );

    const [huXishu, zhangXichun, niHaixia, liKe] = results;

    await prisma.consultation.update({
      where: { id },
      data: {
        huXishuAnalysis: JSON.stringify(huXishu),
        zhangXichunAnalysis: JSON.stringify(zhangXichun),
        niHaixiaAnalysis: JSON.stringify(niHaixia),
        liKeAnalysis: JSON.stringify(liKe),
      },
    }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_DIFFERENTIATE",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "四大体系AI辨证",
      },
    }).catch(() => {});

    return NextResponse.json({ huXishu, zhangXichun, niHaixia, liKe });
  } catch (error) {
    console.error("Differentiation error:", error);
    return NextResponse.json({ error: "AI辨证失败" }, { status: 500 });
  }
}
