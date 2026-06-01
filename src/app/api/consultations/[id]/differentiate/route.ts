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

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { patient: true },
  });

  if (!consultation || !consultation.editedHistory) {
    return NextResponse.json(
      { error: "请先完成病史结构化" },
      { status: 400 }
    );
  }

  // Include tongue/face analysis if available
  let analysisCtx = "";
  if (consultation.tongueAnalysis) {
    try {
      const t = JSON.parse(consultation.tongueAnalysis);
      analysisCtx += `\n\n【舌象AI分析】${JSON.stringify(t)}`;
    } catch { /* ignore */ }
  }
  if (consultation.faceAnalysis) {
    try {
      const f = JSON.parse(consultation.faceAnalysis);
      analysisCtx += `\n\n【面象AI分析】${JSON.stringify(f)}`;
    } catch { /* ignore */ }
  }

  const userMessage = `患者：${consultation.patient.name}，${consultation.patient.gender || ""}，${consultation.patient.age || ""}岁。\n体质：${consultation.patient.constitution || "未知"}。${analysisCtx}\n\n结构化病史：\n${consultation.editedHistory}`;

  const systems = [
    { name: "huXishu", prompt: DIFFERENTIATE_HU_XISHU_PROMPT },
    { name: "zhangXichun", prompt: DIFFERENTIATE_ZHANG_XICHUN_PROMPT },
    { name: "niHaixia", prompt: DIFFERENTIATE_NI_HAIXIA_PROMPT },
    { name: "liKe", prompt: DIFFERENTIATE_LI_KE_PROMPT },
  ];

  try {
    // Run all 4 in parallel
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

    // Save to consultation
    await prisma.consultation.update({
      where: { id },
      data: {
        huXishuAnalysis: JSON.stringify(huXishu),
        zhangXichunAnalysis: JSON.stringify(zhangXichun),
        niHaixiaAnalysis: JSON.stringify(niHaixia),
        liKeAnalysis: JSON.stringify(liKe),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "AI_DIFFERENTIATE",
        entityType: "CONSULTATION",
        entityId: id,
        detail: "四大体系AI辨证",
      },
    });

    return NextResponse.json({ huXishu, zhangXichun, niHaixia, liKe });
  } catch (error) {
    console.error("Differentiation error:", error);
    return NextResponse.json({ error: "AI辨证失败" }, { status: 500 });
  }
}
