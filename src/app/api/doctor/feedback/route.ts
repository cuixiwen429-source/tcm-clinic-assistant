import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

// GET — doctor sees all feedback across their prescriptions
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const feedbacks = await prisma.prescriptionFeedback.findMany({
    where: { doctorId: session.userId },
    include: {
      prescription: {
        select: {
          id: true,
          formulaName: true,
          consultation: { select: { patient: { select: { name: true } } } },
        },
      },
      pharmacy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      prescriptionId: f.prescriptionId,
      formulaName: f.prescription.formulaName,
      patientName: f.prescription.consultation.patient.name,
      pharmacyName: f.pharmacy.name,
      message: f.message,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}
