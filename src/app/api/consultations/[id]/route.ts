import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: {
      patient: {
        include: { _count: { select: { consultations: true } } },
      },
      doctor: { select: { name: true } },
      prescriptions: { orderBy: { version: "desc" } },
      riskPredictions: { orderBy: { createdAt: "desc" }, take: 1 },
      adviceItems: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  return NextResponse.json(consultation);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const allowed = [
    "chiefComplaint", "presentIllness", "pastHistory", "symptomSummary",
    "constitution", "editedHistory", "status",
    "huXishuAnalysis", "zhangXichunAnalysis", "niHaixiaAnalysis", "liKeAnalysis",
    "doctorFinalPattern", "doctorFinalPathogenesis",
    "tongueImage", "faceImage", "tongueAnalysis", "faceAnalysis",
    "rawTranscription",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const existing = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const consultation = await prisma.consultation.update({ where: { id }, data });
  return NextResponse.json(consultation);
}
