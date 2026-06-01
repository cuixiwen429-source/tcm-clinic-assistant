import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
        ],
      }
    : {};

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { consultations: true } } },
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({
    patients,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();
  const { name, gender, birthDate, age, phone, allergies, constitution, chronicDisease, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "患者姓名不能为空" }, { status: 400 });
  }

  const patient = await prisma.patient.create({
    data: {
      name,
      gender: gender || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      age: age ? parseInt(age) : null,
      phone: phone || null,
      allergies: allergies || null,
      constitution: constitution || null,
      chronicDisease: chronicDisease || null,
      notes: notes || null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "CREATE",
      entityType: "PATIENT",
      entityId: patient.id,
      detail: `创建患者: ${name}`,
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
