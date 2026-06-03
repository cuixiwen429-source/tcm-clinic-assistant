import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const where: Record<string, unknown> = {};
  if (search) {
    where.name = { contains: search };
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        creator: { select: { name: true } },
        consultations: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({
    patients: patients.map(p => ({
      id: p.id, name: p.name, gender: p.gender, age: p.age,
      phone: p.phone, constitution: p.constitution,
      allergies: p.allergies, chronicDisease: p.chronicDisease,
      createdBy: p.creator?.name || "未知",
      consultationCount: p.consultations.length,
      createdAt: p.createdAt,
    })),
    total, page, limit, totalPages: Math.ceil(total / limit),
  });
}
