import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      patient: true,
      prescriptions: {
        where: { isConfirmed: true },
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
    return NextResponse.json({
      patient: { name: "", gender: null, age: null, phone: null },
      diagnosis: { chiefComplaint: null, pattern: null, pathogenesis: null },
      prescription: null,
      advice: null,
    });
  }

  const prescription = consultation.prescriptions[0];

  const printData = {
    patient: {
      name: consultation.patient?.name,
      gender: consultation.patient?.gender,
      age: consultation.patient?.age,
      phone: consultation.patient?.phone,
    },
    diagnosis: {
      chiefComplaint: consultation.chiefComplaint,
      pattern: consultation.doctorFinalPattern,
      pathogenesis: consultation.doctorFinalPathogenesis,
    },
    prescription: prescription
      ? {
          formulaName: prescription.formulaName,
          herbs: JSON.parse(prescription.herbs || "[]"),
          totalDoses: prescription.totalDoses,
          decoctionMethod: prescription.decoctionMethod,
          usageInstruction: prescription.usageInstruction,
          precautions: prescription.precautions,
          createdAt: prescription.createdAt,
        }
      : null,
    advice: consultation.adviceItems[0]
      ? JSON.parse(consultation.adviceItems[0].editedContent || consultation.adviceItems[0].adviceContent)
      : null,
  };

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
