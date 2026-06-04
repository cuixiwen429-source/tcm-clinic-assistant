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

  // Only doctor/admin can see costs
  if (!["DOCTOR", "ADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "无权限查看成本信息" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const prescriptionId = searchParams.get("prescriptionId");

  if (!prescriptionId) {
    return NextResponse.json({ error: "请提供处方ID" }, { status: 400 });
  }

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    select: { id: true },
  });
  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const prescription = await prisma.prescription.findFirst({
    where: { id: prescriptionId, consultationId: id },
  });

  if (!prescription) {
    return NextResponse.json({ error: "处方不存在" }, { status: 404 });
  }

  let herbs: Array<{ name: string; dose: number }> = [];
  try { herbs = JSON.parse(prescription.herbs); } catch { /* empty */ }

  // Calculate costs
  const herbNames = herbs.map((h) => h.name);
  const prices = await prisma.herbPrice.findMany({
    where: { herb: { name: { in: herbNames } } },
    include: { herb: true },
  });

  const breakdown = herbs.map((herb) => {
    const price = prices.find((p) => p.herb.name === herb.name);
    const retailPrice = price?.retailPrice || 0;
    const wholesalePrice = price?.wholesalePrice || 0;
    const cost = retailPrice * herb.dose;
    return {
      name: herb.name,
      dose: herb.dose,
      retailPrice,
      wholesalePrice,
      cost,
    };
  });

  const totalCost = breakdown.reduce((sum, b) => sum + b.cost, 0);
  const suggestedRetail = totalCost * 1.5; // 50% margin suggestion

  // Save cost calculation
  const calc = await prisma.costCalculation.create({
    data: {
      prescriptionId,
      totalCost,
      breakdown: JSON.stringify(breakdown),
      calculatedBy: session.userId,
    },
  });

  return NextResponse.json({
    id: calc.id,
    totalCost: Math.round(totalCost * 100) / 100,
    suggestedRetail: Math.round(suggestedRetail * 100) / 100,
    breakdown: breakdown.map((b) => ({
      ...b,
      cost: Math.round(b.cost * 100) / 100,
    })),
  });
}
