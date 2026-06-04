import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const binding = await prisma.pharmacyBinding.findFirst({
    where: { pharmacyId: session.userId },
    include: { doctor: { select: { name: true } } },
  });

  if (!binding) {
    return NextResponse.json({ prescriptions: [] });
  }

  const confirmed = await prisma.prescription.findMany({
    where: {
      consultation: { doctorId: binding.doctorId },
      isConfirmed: true,
    },
    include: {
      consultation: {
        include: { patient: { select: { name: true } } },
      },
    },
    orderBy: { confirmedAt: "desc" },
    take: 100,
  });

  const prescriptions = confirmed.map((p) => {
    let herbCount = 0;
    try { herbCount = JSON.parse(p.herbs).length; } catch {}
    return {
      id: p.id,
      consultationId: p.consultationId,
      formulaName: p.formulaName,
      patientName: p.consultation.patient.name,
      herbCount,
      totalCost: null,
      confirmedAt: p.confirmedAt?.toISOString() || p.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ prescriptions });
}
