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

  const herbsWithInfo = herbs.map((h) => {
    const ref = refMap.get(h.name);
    const price = ref?.prices[0]?.retailPrice ?? null;
    const subtotal = price != null ? price * h.dose * prescription.totalDoses : null;
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
    };
  });

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
    isConfirmed: prescription.isConfirmed,
    createdAt: prescription.createdAt.toISOString(),
  });
}
