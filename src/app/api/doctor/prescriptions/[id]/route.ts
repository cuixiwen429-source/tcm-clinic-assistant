import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      consultation: {
        include: { patient: true },
      },
      feedbacks: {
        include: { pharmacy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!prescription || prescription.consultation.doctorId !== session.userId) {
    return NextResponse.json({ error: "处方不存在或无权访问" }, { status: 404 });
  }

  let herbs: Array<{ name: string; dose: number; note?: string }> = [];
  try { herbs = JSON.parse(prescription.herbs); } catch {}

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
    };
  });

  totalCost = +totalCost.toFixed(2);

  // Compliance warnings
  const complianceWarnings: Array<{ herbA: string; herbB: string; severity: string; description: string }> = [];
  if (herbNames.length >= 2) {
    const rules = await prisma.complianceRule.findMany({
      where: { herbA: { in: herbNames }, herbB: { in: herbNames } },
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
    herbsRaw: herbs,
    totalCost,
    toxicHerbs,
    complianceWarnings,
    isConfirmed: prescription.isConfirmed,
    createdAt: prescription.createdAt.toISOString(),
    feedbacks: prescription.feedbacks.map((f) => ({
      id: f.id,
      message: f.message,
      status: f.status,
      pharmacyName: f.pharmacy.name,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: { consultation: { select: { doctorId: true } } },
  });

  if (!prescription || prescription.consultation.doctorId !== session.userId) {
    return NextResponse.json({ error: "处方不存在或无权访问" }, { status: 404 });
  }

  const body = await request.json();

  const updated = await prisma.prescription.update({
    where: { id },
    data: {
      formulaName: body.formulaName ?? prescription.formulaName,
      herbs: body.herbs ? JSON.stringify(body.herbs) : prescription.herbs,
      totalDoses: body.totalDoses ?? prescription.totalDoses,
      decoctionMethod: body.decoctionMethod ?? prescription.decoctionMethod,
      usageInstruction: body.usageInstruction ?? prescription.usageInstruction,
      precautions: body.precautions ?? prescription.precautions,
      editorId: session.userId,
      changeDescription: body.changeDescription || "医师修改处方",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "UPDATE",
      entityType: "PRESCRIPTION",
      entityId: id,
      detail: `更新处方: ${updated.formulaName || "未命名"}`,
    },
  });

  // Auto-resolve pending feedback when doctor edits
  await prisma.prescriptionFeedback.updateMany({
    where: { prescriptionId: id, status: "PENDING" },
    data: { status: "RESOLVED" },
  });

  return NextResponse.json({ success: true, updated });
}
