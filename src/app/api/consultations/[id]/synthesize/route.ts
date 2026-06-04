import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";
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
  const body = await request.json() as Record<string, unknown>;

  const supplementText = String(body.supplementText || "");
  if (supplementText.trim().length < 5) {
    return NextResponse.json({ error: "补充信息过短" }, { status: 400 });
  }

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: { patient: true },
  });
  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const patientName = consultation.patient.name || "未知";
  const patientGender = consultation.patient.gender || "未知";
  const patientAge = consultation.patient.age ?? "未知";
  const patientAllergies = consultation.patient.allergies || String(body.patientAllergies || "无");
  const patientChronic = consultation.patient.chronicDisease || String(body.patientChronicDisease || "无");
  const patientConstitution = consultation.patient.constitution || String(body.patientConstitution || "未知");

  try {
    // Build old history from DB or client-provided data
    let oldHistory: string;
    try {
      oldHistory = consultation.editedHistory || (typeof body.editedHistory === "string" ? body.editedHistory : "") || JSON.stringify({
        chief_complaint: consultation.chiefComplaint || (typeof body.chiefComplaint === "string" ? body.chiefComplaint : ""),
        present_illness: consultation.presentIllness || (typeof body.presentIllness === "string" ? body.presentIllness : ""),
        symptom_summary: consultation.symptomSummary || (typeof body.symptomSummary === "string" ? body.symptomSummary : "{}"),
        constitution: consultation.constitution || (typeof body.constitution === "string" ? body.constitution : ""),
      });
    } catch {
      oldHistory = JSON.stringify({
        chief_complaint: body.chiefComplaint || "",
        present_illness: body.presentIllness || "",
        symptom_summary: body.symptomSummary || "{}",
        constitution: body.constitution || "",
      });
    }

    const patientInfo = `患者：${patientName}，${patientGender}，${patientAge}岁\n体质：${patientConstitution}\n过敏史：${patientAllergies}\n基础病史：${patientChronic}`;

    let analysisCtx = "";
    const ta = typeof body.tongueAnalysis === "string" ? body.tongueAnalysis : null;
    const fa = typeof body.faceAnalysis === "string" ? body.faceAnalysis : null;
    if (ta) { try { analysisCtx += `\n\n【舌象分析】${JSON.stringify(JSON.parse(ta))}`; } catch { /* */ } }
    if (fa) { try { analysisCtx += `\n\n【面象分析】${JSON.stringify(JSON.parse(fa))}`; } catch { /* */ } }

    const userMessage = `已有结构化病史：\n${oldHistory}\n\n${patientInfo}${analysisCtx}\n\n医生追加补充信息：\n${supplementText}\n\n请将以上信息进行综合汇总，生成最终版结构化病史。`;

    const result = await callDeepSeekJson({
      systemPrompt: SYNTHESIZE_PROMPT,
      userMessage,
      schema: SynthesizeResultSchema,
      schemaName: "synthesize",
      temperature: 0.3,
    });

    await prisma.consultation.update({
      where: { id },
      data: {
        editedHistory: JSON.stringify(result),
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
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("Synthesize error:", error);
    return NextResponse.json({ error: "AI综合汇总失败，请重试" }, { status: 500 });
  }
}
