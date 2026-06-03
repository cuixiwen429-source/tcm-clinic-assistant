import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const doctorId = searchParams.get("doctorId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (doctorId && doctorId !== "ALL") where.doctorId = doctorId;

  const [consultations, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      include: {
        patient: { select: { name: true, gender: true } },
        doctor: { select: { name: true } },
        prescriptions: { select: { id: true, formulaName: true, isConfirmed: true } },
      },
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.consultation.count({ where }),
  ]);

  return NextResponse.json({
    consultations: consultations.map(c => ({
      id: c.id, visitDate: c.visitDate, chiefComplaint: c.chiefComplaint,
      status: c.status, patient: c.patient, doctor: c.doctor,
      prescriptionCount: c.prescriptions.length,
      hasConfirmed: c.prescriptions.some(p => p.isConfirmed),
    })),
    total, page, limit, totalPages: Math.ceil(total / limit),
  });
}
