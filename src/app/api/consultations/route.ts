import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { patientAccessWhere } from "@/lib/auth/access";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { patientId } = await request.json();
    if (!patientId) {
      return NextResponse.json({ error: "请选择患者" }, { status: 400 });
    }

    const patient = await prisma.patient.findFirst({
      where: patientAccessWhere(session, patientId),
    });
    if (!patient) {
      return NextResponse.json({ error: "患者不存在" }, { status: 404 });
    }

    // Verify user still exists (Vercel cold starts may reset the DB)
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "会话已失效，请重新登录" }, { status: 401 });
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        doctorId: session.userId,
        status: "DRAFT",
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE",
          entityType: "CONSULTATION",
          entityId: consultation.id,
          detail: `创建就诊记录: ${patient.name}`,
        },
      });
    } catch (auditErr) {
      console.error("[Consultation] Audit log error:", auditErr);
    }

    return NextResponse.json(consultation, { status: 201 });
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message || "";
    if (msg.includes("Foreign key constraint")) {
      return NextResponse.json({ error: "会话已失效，请刷新页面后重新登录" }, { status: 401 });
    }
    console.error("[Consultation] Create error:", msg);
    return NextResponse.json({ error: "创建就诊失败，请重试" }, { status: 500 });
  }
}
