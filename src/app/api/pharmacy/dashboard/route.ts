import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  // Get the binding to find the associated doctor
  const binding = await prisma.pharmacyBinding.findFirst({
    where: { pharmacyId: session.userId },
    include: { doctor: { select: { name: true } } },
  });

  if (!binding) {
    return NextResponse.json({
      stats: { pendingCount: 0, completedThisMonth: 0, doctorName: null },
      prescriptions: [],
    });
  }

  const doctorId = binding.doctorId;
  const doctorName = binding.doctor.name;

  // Count pending (FINALIZED = ready for pharmacy)
  const pendingCount = await prisma.prescription.count({
    where: {
      consultation: { doctorId, status: { in: ["FINALIZED", "PRESCRIBED"] } },
      isConfirmed: false,
    },
  });

  // Count completed this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = await prisma.prescription.count({
    where: {
      consultation: { doctorId },
      isConfirmed: true,
      confirmedAt: { gte: monthStart },
    },
  });

  // Get pending prescriptions
  const pendingPrescriptions = await prisma.prescription.findMany({
    where: {
      consultation: { doctorId, status: { in: ["FINALIZED", "PRESCRIBED"] } },
      isConfirmed: false,
    },
    include: {
      consultation: {
        include: { patient: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const prescriptions = pendingPrescriptions.map((p) => {
    let herbCount = 0;
    try { herbCount = JSON.parse(p.herbs).length; } catch {}
    return {
      id: p.id,
      consultationId: p.consultationId,
      formulaName: p.formulaName,
      patientName: p.consultation.patient.name,
      visitDate: p.consultation.visitDate?.toISOString() || p.createdAt.toISOString(),
      status: p.consultation.status,
      herbCount,
    };
  });

  return NextResponse.json({
    stats: { pendingCount, completedThisMonth, doctorName },
    prescriptions,
  });
}
