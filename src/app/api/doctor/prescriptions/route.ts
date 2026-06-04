import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const prescriptions = await prisma.prescription.findMany({
    where: { consultation: { doctorId: session.userId } },
    orderBy: { createdAt: "desc" },
    include: {
      consultation: {
        select: {
          id: true,
          visitDate: true,
          patient: { select: { id: true, name: true } },
        },
      },
      feedbacks: { select: { id: true, status: true } },
    },
  });

  const list = prescriptions.map((p) => {
    let herbCount = 0;
    try { herbCount = JSON.parse(p.herbs).length; } catch {}
    return {
      id: p.id,
      consultationId: p.consultationId,
      formulaName: p.formulaName || "未命名方剂",
      patientName: p.consultation.patient.name,
      patientId: p.consultation.patient.id,
      herbCount,
      totalDoses: p.totalDoses,
      createdAt: p.createdAt.toISOString(),
      isConfirmed: p.isConfirmed,
      feedbackCount: p.feedbacks.length,
      pendingFeedbackCount: p.feedbacks.filter((f) => f.status === "PENDING").length,
    };
  });

  return NextResponse.json(list);
}
