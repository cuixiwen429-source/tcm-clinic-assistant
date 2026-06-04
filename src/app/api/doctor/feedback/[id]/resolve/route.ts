import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

// POST — doctor marks feedback as REVISED (prescription updated)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;

  const feedback = await prisma.prescriptionFeedback.findUnique({ where: { id } });
  if (!feedback || feedback.doctorId !== session.userId) {
    return NextResponse.json({ error: "反馈不存在或无权操作" }, { status: 404 });
  }

  const updated = await prisma.prescriptionFeedback.update({
    where: { id },
    data: { status: "REVISED" },
  });

  return NextResponse.json({ success: true, status: updated.status });
}
