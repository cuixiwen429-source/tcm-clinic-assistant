import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalUsers, totalPatients, totalConsultations, totalPrescriptions,
    usersByRole, recentConsultations, statusBreakdown,
    topDoctors, prescriptionsByDoctor,
    todayConsultations, todayPrescriptions,
    yesterdayConsultations, yesterdayPrescriptions,
    recentPrescriptions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count(),
    prisma.consultation.count(),
    prisma.prescription.count(),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    prisma.consultation.findMany({
      take: 10, orderBy: { visitDate: "desc" },
      include: {
        patient: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    }),
    prisma.consultation.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, name: true, role: true, _count: { select: { consultations: true } } },
      orderBy: { consultations: { _count: "desc" } },
      take: 10,
    }),
    prisma.prescription.groupBy({
      by: ["editorId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.consultation.count({ where: { visitDate: { gte: today, lt: tomorrow } } }),
    prisma.prescription.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    prisma.consultation.count({ where: { visitDate: { gte: yesterday, lt: today } } }),
    prisma.prescription.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.prescription.findMany({ select: { herbs: true }, take: 500, orderBy: { createdAt: "desc" } }),
  ]);

  // Monthly trend — 6 months
  const monthlyConsultations: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const y = d.getFullYear(); const m = d.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    const count = await prisma.consultation.count({
      where: { visitDate: { gte: start, lt: end } },
    });
    monthlyConsultations.push({
      month: `${y}-${String(m + 1).padStart(2, "0")}`,
      count,
    });
  }

  // Herb frequency from recent prescription JSON
  const herbCounts = new Map<string, number>();
  for (const p of recentPrescriptions) {
    try {
      const herbs: { name?: string; herbName?: string }[] = JSON.parse(p.herbs);
      for (const h of herbs) {
        const name = h.name || h.herbName;
        if (name) herbCounts.set(name, (herbCounts.get(name) || 0) + 1);
      }
    } catch { /* skip malformed JSON */ }
  }
  const topHerbs = [...herbCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  // Resolve doctor names for prescription counts
  const doctorIds = prescriptionsByDoctor.map(d => d.editorId).filter(Boolean) as string[];
  const doctors = doctorIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: doctorIds } }, select: { id: true, name: true } })
    : [];
  const doctorMap = new Map(doctors.map(d => [d.id, d.name]));

  return NextResponse.json({
    totalUsers, totalPatients, totalConsultations, totalPrescriptions,
    todayConsultations, todayPrescriptions,
    yesterdayConsultations, yesterdayPrescriptions,
    usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
    recentConsultations: recentConsultations.map(c => ({
      id: c.id, visitDate: c.visitDate, chiefComplaint: c.chiefComplaint,
      status: c.status, patient: c.patient.name, doctor: c.doctor.name,
    })),
    monthlyConsultations,
    topDoctors: topDoctors.map(d => ({
      id: d.id, name: d.name, role: d.role, consultations: d._count.consultations,
    })),
    prescriptionsByDoctor: prescriptionsByDoctor.map(p => ({
      doctorId: p.editorId, doctorName: doctorMap.get(p.editorId || "") || "未知",
      count: p._count.id,
    })),
    statusBreakdown: statusBreakdown.map(s => ({ status: s.status, count: s._count.id })),
    topHerbs,
    updatedAt: new Date().toISOString(),
  });
}
