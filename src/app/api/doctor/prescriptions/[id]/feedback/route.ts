import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

// PUT — doctor resolves a feedback
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id: prescriptionId } = await params;
  const { feedbackId } = await request.json();

  if (!feedbackId) {
    return NextResponse.json({ error: "缺少反馈ID" }, { status: 400 });
  }

  // Verify doctor owns this prescription
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { consultation: { select: { doctorId: true } } },
  });

  if (!prescription || prescription.consultation.doctorId !== session.userId) {
    return NextResponse.json({ error: "处方不存在或无权访问" }, { status: 404 });
  }

  const feedback = await prisma.prescriptionFeedback.findUnique({
    where: { id: feedbackId },
  });

  if (!feedback || feedback.prescriptionId !== prescriptionId) {
    return NextResponse.json({ error: "反馈不存在" }, { status: 404 });
  }

  await prisma.prescriptionFeedback.update({
    where: { id: feedbackId },
    data: { status: "RESOLVED" },
  });

  return NextResponse.json({ success: true });
}
