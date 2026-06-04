import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";
import { callDeepSeekJson } from "@/lib/ai/client";
import { REFINE_SYMPTOM_PROMPT } from "@/lib/ai/prompts";
import { z } from "zod";

const RefinedSymptomSchema = z.object({
  symptoms: z.array(z.string()),
  tongue_pulse: z.string(),
});

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: {
      patient: true,
      prescriptions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      adviceItems: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const prescription = consultation.prescriptions[0];

  // Refine symptoms via AI
  let refinedSymptoms: { symptoms: string[]; tongue_pulse: string } | null = null;
  try {
    const chiefComplaint = consultation.chiefComplaint || "";
    const presentIllness = consultation.presentIllness || "";
    let symptomSummaryText = "";
    try {
      const s = JSON.parse(consultation.symptomSummary || "{}");
      if (s.tongue_pulse) symptomSummaryText += `舌脉：${s.tongue_pulse}。`;
      if (s.stool_urine) symptomSummaryText += `二便：${s.stool_urine}。`;
    } catch { /* */ }

    const refineInput = [chiefComplaint, presentIllness, symptomSummaryText].filter(Boolean).join("\n");
    if (refineInput.trim().length > 10) {
      refinedSymptoms = await callDeepSeekJson({
        systemPrompt: REFINE_SYMPTOM_PROMPT,
        userMessage: refineInput,
        schema: RefinedSymptomSchema,
        schemaName: "refine-symptoms",
        temperature: 0.2,
        maxTokens: 1024,
      });
    }
  } catch {
    // Non-critical — proceed without AI refinement
  }

  const printData = {
    patient: {
      name: consultation.patient?.name,
      gender: consultation.patient?.gender,
      age: consultation.patient?.age,
      phone: consultation.patient?.phone,
      address: consultation.patient?.address,
      allergies: consultation.patient?.allergies,
      chronicDisease: consultation.patient?.chronicDisease,
      notes: consultation.patient?.notes,
    },
    diagnosis: {
      chiefComplaint: consultation.chiefComplaint,
      pattern: consultation.doctorFinalPattern,
      pathogenesis: consultation.doctorFinalPathogenesis,
    },
    prescription: prescription
      ? {
          formulaName: prescription.formulaName,
          herbs: safeJsonParse(prescription.herbs, [] as unknown[]),
          totalDoses: prescription.totalDoses,
          decoctionMethod: prescription.decoctionMethod,
          usageInstruction: prescription.usageInstruction,
          precautions: prescription.precautions,
          createdAt: prescription.createdAt,
        }
      : null,
    advice: consultation.adviceItems[0]
      ? safeJsonParse(consultation.adviceItems[0].editedContent || consultation.adviceItems[0].adviceContent, null)
      : null,
    refinedSymptoms,
    costCalculation: null as Record<string, unknown> | null,
  };

  // Fetch cost calculation
  if (prescription) {
    try {
      const cost = await prisma.costCalculation.findFirst({
        where: { prescriptionId: prescription.id },
        orderBy: { calculatedAt: "desc" },
      });
      if (cost) {
        printData.costCalculation = {
          totalCost: cost.totalCost,
          breakdown: safeJsonParse(cost.breakdown, {}),
        };
      }
    } catch { /* */ }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "PRINT",
      entityType: "CONSULTATION",
      entityId: id,
      detail: "打印/预览处方",
    },
  }).catch(() => {});

  return NextResponse.json(printData);
}
