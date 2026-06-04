import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;

  // Verify pharmacy has access through binding
  const binding = await prisma.pharmacyBinding.findFirst({
    where: { pharmacyId: session.userId },
  });
  if (!binding) {
    return NextResponse.json({ error: "未绑定医师" }, { status: 403 });
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      consultation: {
        include: { patient: true },
      },
    },
  });

  if (!prescription || prescription.consultation.doctorId !== binding.doctorId) {
    return NextResponse.json({ error: "处方不存在或无权访问" }, { status: 404 });
  }

  // Parse herbs
  let herbs: Array<{ name: string; dose: number; note?: string }> = [];
  try { herbs = JSON.parse(prescription.herbs); } catch {}

  // Get pharmacopoeia refs and prices for these herbs
  const herbNames = herbs.map((h) => h.name);
  const herbRefs = herbNames.length > 0
    ? await prisma.herbReference.findMany({
        where: { name: { in: herbNames } },
        include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } },
      })
    : [];

  const refMap = new Map(herbRefs.map((r) => [r.name, r]));

  let totalCost = 0;
  const herbsWithInfo = herbs.map((h) => {
    const ref = refMap.get(h.name);
    const price = ref?.prices[0]?.retailPrice ?? null;
    const subtotal = price != null ? +(price * h.dose * prescription.totalDoses).toFixed(2) : null;
    if (subtotal != null) totalCost += subtotal;
    return {
      name: h.name,
      dose: h.dose,
      note: h.note,
      pharmacopoeiaMin: ref?.pharmacopoeiaMin ?? null,
      pharmacopoeiaMax: ref?.pharmacopoeiaMax ?? null,
      retailPrice: price,
      unit: ref?.unit || "g",
      subtotal,
      overdosed: ref?.pharmacopoeiaMax != null ? h.dose > ref.pharmacopoeiaMax : false,
      toxicity: ref?.toxicity ?? null,
      nature: ref?.nature ?? null,
      taste: ref?.taste ?? null,
      meridian: ref?.meridian ?? null,
    };
  });

  totalCost = +totalCost.toFixed(2);

  // Check compliance rules for herb-herb interactions
  const complianceWarnings: Array<{ herbA: string; herbB: string; severity: string; description: string }> = [];
  if (herbNames.length >= 2) {
    const rules = await prisma.complianceRule.findMany({
      where: {
        herbA: { in: herbNames },
        herbB: { in: herbNames },
      },
    });
    for (const rule of rules) {
      if (rule.herbB && herbNames.includes(rule.herbB)) {
        complianceWarnings.push({
          herbA: rule.herbA,
          herbB: rule.herbB,
          severity: rule.severity,
          description: rule.description,
        });
      }
    }
  }

  // Gather toxic herbs
  const toxicHerbs = herbsWithInfo.filter((h) => h.toxicity && h.toxicity !== "无" && h.toxicity !== "无毒");

  return NextResponse.json({
    id: prescription.id,
    consultationId: prescription.consultationId,
    formulaName: prescription.formulaName,
    formulaClass: prescription.formulaClass,
    patientName: prescription.consultation.patient.name,
    patientGender: prescription.consultation.patient.gender,
    patientAge: prescription.consultation.patient.age,
    totalDoses: prescription.totalDoses,
    decoctionMethod: prescription.decoctionMethod,
    usageInstruction: prescription.usageInstruction,
    precautions: prescription.precautions,
    herbs: herbsWithInfo,
    totalCost,
    toxicHerbs,
    complianceWarnings,
    isConfirmed: prescription.isConfirmed,
    createdAt: prescription.createdAt.toISOString(),
  });
}
