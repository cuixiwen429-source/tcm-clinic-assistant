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

  const prescriptions = await prisma.prescription.findMany({
    where: { consultationId: id },
    orderBy: { version: "desc" },
    include: {
      complianceChecks: true,
      costCalculations: { orderBy: { calculatedAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(prescriptions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Find the latest version number
  const latest = await prisma.prescription.findFirst({
    where: { consultationId: id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version || 0) + 1;

  const prescription = await prisma.prescription.create({
    data: {
      consultationId: id,
      version: nextVersion,
      formulaName: body.formulaName || null,
      formulaClass: body.formulaClass || null,
      source: body.source || "DOCTOR",
      herbs: body.herbs || "[]",
      totalDoses: body.totalDoses || 7,
      decoctionMethod: body.decoctionMethod || "",
      usageInstruction: body.usageInstruction || "",
      precautions: body.precautions || "",
      editorId: session.userId,
      changeDescription: body.changeDescription || null,
      isConfirmed: body.isConfirmed || false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "CREATE",
      entityType: "PRESCRIPTION",
      entityId: prescription.id,
      detail: `创建处方版本 v${nextVersion}: ${body.formulaName || "未命名"}`,
    },
  });

  return NextResponse.json(prescription, { status: 201 });
}
