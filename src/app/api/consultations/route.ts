import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { patientId } = await request.json();
    if (!patientId) {
      return NextResponse.json({ error: "请选择患者" }, { status: 400 });
    }

    // Verify patient exists before creating consultation
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "患者不存在" }, { status: 404 });
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
        detail: `创建就诊记录: ${patient.name}`,
      },
    });

    return NextResponse.json(consultation, { status: 201 });
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message || "";
    if (msg.includes("Foreign key constraint")) {
      return NextResponse.json({ error: "数据关联失败，请检查患者信息" }, { status: 400 });
    }
    console.error("[Consultation] Create error:", msg);
    return NextResponse.json({ error: "创建就诊失败，请重试" }, { status: 500 });
  }
}
