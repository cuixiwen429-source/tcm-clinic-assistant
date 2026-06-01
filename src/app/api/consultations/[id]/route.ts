import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      patient: true,
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
  const body = await request.json();

  const allowed = [
    "chiefComplaint", "presentIllness", "pastHistory", "symptomSummary",
    "constitution", "editedHistory", "status",
    "huXishuAnalysis", "zhangXichunAnalysis", "niHaixiaAnalysis", "liKeAnalysis",
    "doctorFinalPattern", "doctorFinalPathogenesis",
    "tongueImage", "faceImage", "tongueAnalysis", "faceAnalysis",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const consultation = await prisma.consultation.update({
    where: { id },
    data,
  });

  return NextResponse.json(consultation);
}
