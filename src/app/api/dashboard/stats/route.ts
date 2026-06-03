import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const doctorFilter = session.role === "ADMIN" ? {} : { doctorId: session.userId };
  const prescDoctorFilter = session.role === "ADMIN" ? {} : { consultation: { doctorId: session.userId } };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Last 6 months date range
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    todayPatients,
    pendingPrescriptions,
    pendingPrints,
    highRiskAlerts,
    recentConsultations,
    totalPatients,
    totalConsultations,
    totalPrescriptions,
    recentPrescriptions,
  ] = await Promise.all([
    // Today's patients
    prisma.consultation.count({
      where: { visitDate: { gte: today }, ...doctorFilter },
    }),
    // Pending prescriptions
    prisma.prescription.count({
      where: { isConfirmed: false, ...prescDoctorFilter },
    }),
    // Pending prints (confirmed but not finalized)
    prisma.prescription.count({
      where: { isConfirmed: true, isFinal: false, ...prescDoctorFilter },
    }),
    // High risk alerts
    prisma.complianceCheck.count({
      where: { severity: { in: ["DANGER", "BLOCK"] }, resolved: false, prescription: { consultation: doctorFilter } },
    }),
    // Recent consultations
    prisma.consultation.findMany({
      where: doctorFilter,
      take: 8,
      orderBy: { visitDate: "desc" },
      include: {
        patient: { select: { id: true, name: true, gender: true, age: true } },
        doctor: { select: { name: true } },
      },
    }),
    // Total patients (for this doctor)
    prisma.patient.count({
      where: session.role === "ADMIN" ? {} : { consultations: { some: { doctorId: session.userId } } },
    }),
    // Total consultations
    prisma.consultation.count({ where: doctorFilter }),
    // Total prescriptions
    prisma.prescription.count({ where: prescDoctorFilter }),
    // Recent prescriptions with herbs (for cost data)
    prisma.prescription.findMany({
      where: { ...prescDoctorFilter, herbs: { not: "[]" } },
      select: { herbs: true, createdAt: true, costCalculations: { orderBy: { calculatedAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  // ===== Monthly trend: last 6 months consultation count by month =====
  const trendMonths: string[] = [];
  const trendData: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    trendMonths.push(`${year}-${String(month + 1).padStart(2, "0")}`);

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const count = await prisma.consultation.count({
      where: { visitDate: { gte: start, lt: end }, ...doctorFilter },
    });
    trendData.push(count);
  }

  // ===== Status breakdown =====
  const statusCounts: Record<string, number> = {};
  const statuses = ["DRAFT", "AI_ASSISTED", "PRESCRIBED", "FINALIZED", "ARCHIVED"];
  for (const s of statuses) {
    statusCounts[s] = await prisma.consultation.count({ where: { status: s, ...doctorFilter } });
  }

  // ===== Top herbs from prescriptions =====
  const herbFreq: Record<string, number> = {};
  for (const p of recentPrescriptions) {
    try {
      const herbs: Array<{ name: string; dose: number }> = JSON.parse(p.herbs);
      for (const h of herbs) {
        herbFreq[h.name] = (herbFreq[h.name] || 0) + 1;
      }
    } catch { /* */ }
  }
  const topHerbs = Object.entries(herbFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  // ===== Patient constitution breakdown =====
  const constitutions = await prisma.patient.groupBy({
    by: ["constitution"],
    where: {
      constitution: { not: null },
      ...(session.role === "ADMIN" ? {} : { consultations: { some: { doctorId: session.userId } } }),
    },
    _count: { id: true },
  });
  const constitutionData = constitutions
    .filter((c) => c.constitution)
    .map((c) => ({ name: c.constitution!, count: c._count.id }))
    .sort((a, b) => b.count - a.count);

  // ===== Average prescription cost (from costCalculations) =====
  const costs = recentPrescriptions
    .filter((p) => p.costCalculations.length > 0)
    .map((p) => p.costCalculations[0].totalCost);
  const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;

  return NextResponse.json(
    {
      todayPatients,
      pendingPrescriptions,
      pendingPrints,
      highRiskAlerts,
      recentConsultations,
      totalPatients,
      totalConsultations,
      totalPrescriptions,
      trendMonths,
      trendData,
      statusBreakdown: statusCounts,
      topHerbs,
      constitutionData,
      avgCost,
    },
    {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
    }
  );
}
