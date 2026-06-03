import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, name: true, role: true, phone: true,
      createdAt: true,
      _count: { select: { consultations: true, editedPrescriptions: true, createdPatients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { userId, role } = await request.json();
  if (!userId || !role) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { role } });
  return NextResponse.json({ success: true });
}
