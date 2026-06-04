import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

// GET — list feedback for a prescription
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const feedbacks = await prisma.prescriptionFeedback.findMany({
    where: { prescriptionId: id },
    include: {
      pharmacy: { select: { name: true } },
      doctor: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      message: f.message,
      status: f.status,
      pharmacyName: f.pharmacy.name,
      doctorName: f.doctor.name,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}

// POST — pharmacy sends feedback
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;
  const { message } = await request.json();

  if (!message || !message.trim()) {
    return NextResponse.json({ error: "反馈内容不能为空" }, { status: 400 });
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: { consultation: true },
  });

  if (!prescription) {
    return NextResponse.json({ error: "处方不存在" }, { status: 404 });
  }

  const feedback = await prisma.prescriptionFeedback.create({
    data: {
      prescriptionId: id,
      pharmacyId: session.userId,
      doctorId: prescription.consultation.doctorId,
      message: message.trim(),
      status: "PENDING",
    },
    include: {
      pharmacy: { select: { name: true } },
    },
  });

  return NextResponse.json({
    id: feedback.id,
    message: feedback.message,
    status: feedback.status,
    pharmacyName: feedback.pharmacy.name,
    createdAt: feedback.createdAt.toISOString(),
  });
}
