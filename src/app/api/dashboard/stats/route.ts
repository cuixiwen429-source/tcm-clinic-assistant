import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todayPatients,
    pendingPrescriptions,
    pendingPrints,
    highRiskAlerts,
    recentConsultations,
  ] = await Promise.all([
    prisma.consultation.count({
      where: { visitDate: { gte: today } },
    }),
    prisma.prescription.count({
      where: { isConfirmed: false },
    }),
    prisma.prescription.count({
      where: { isConfirmed: true, isFinal: false },
    }),
    prisma.complianceCheck.count({
      where: { severity: { in: ["DANGER", "BLOCK"] }, resolved: false },
    }),
    prisma.consultation.findMany({
      take: 5,
      orderBy: { visitDate: "desc" },
      include: {
        patient: { select: { id: true, name: true, gender: true, age: true } },
        doctor: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    todayPatients,
    pendingPrescriptions,
    pendingPrints,
    highRiskAlerts,
    recentConsultations,
  });
}
