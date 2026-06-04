import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;

  const binding = await prisma.pharmacyBinding.findFirst({
    where: { pharmacyId: session.userId },
  });
  if (!binding) {
    return NextResponse.json({ error: "未绑定医师" }, { status: 403 });
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: { consultation: true },
  });

  if (!prescription || prescription.consultation.doctorId !== binding.doctorId) {
    return NextResponse.json({ error: "处方不存在或无权访问" }, { status: 404 });
  }

  await prisma.prescription.update({
    where: { id },
    data: {
      isConfirmed: true,
      confirmedAt: new Date(),
    },
  });

  // Also update consultation pharmacyId
  await prisma.consultation.update({
    where: { id: prescription.consultationId },
    data: { pharmacyId: session.userId },
  });

  return NextResponse.json({ success: true });
}
