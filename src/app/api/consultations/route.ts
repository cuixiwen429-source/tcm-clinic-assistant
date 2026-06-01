import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { patientId } = await request.json();
  if (!patientId) {
    return NextResponse.json({ error: "请选择患者" }, { status: 400 });
  }

  const consultation = await prisma.consultation.create({
    data: {
      patientId,
      doctorId: session.userId,
      status: "DRAFT",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "CREATE",
      entityType: "CONSULTATION",
      entityId: consultation.id,
      detail: `创建就诊记录`,
    },
  });

  return NextResponse.json(consultation, { status: 201 });
}
