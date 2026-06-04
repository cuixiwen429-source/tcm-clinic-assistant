import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const prescriptionId = body.prescriptionId as string | undefined;
  const herbs = body.herbs as Array<{ name: string; dose: number }> | undefined;

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: { patient: true },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  if (!herbs || !Array.isArray(herbs) || herbs.length === 0) {
    return NextResponse.json({ checks: [] });
  }

  const patient = consultation.patient;
  const herbNames = herbs.map((h) => h.name);
  const checks: Array<{
    checkType: string;
    herbName: string;
    conflictWith?: string;
    severity: string;
    detail: string;
  }> = [];

  // 1. Check 十八反 and 十九畏
  const rules = await prisma.complianceRule.findMany({
    where: {
      ruleType: { in: ["ANTAGONISM", "FEAR"] },
      herbA: { in: herbNames },
      herbB: { in: herbNames },
    },
  });

  for (const rule of rules) {
    if (rule.herbB && herbNames.includes(rule.herbB)) {
      checks.push({
        checkType: rule.ruleType,
        herbName: rule.herbA,
        conflictWith: rule.herbB,
        severity: rule.severity,
        detail: rule.description,
      });
    }
  }

  // 2. Check pregnancy contraindications
  if (patient && patient.gender === "女") {
    const pregnancyRules = await prisma.complianceRule.findMany({
      where: {
        ruleType: "PREGNANCY",
        herbA: { in: herbNames },
      },
    });

    for (const rule of pregnancyRules) {
      checks.push({
        checkType: "PREGNANCY",
        herbName: rule.herbA,
        severity: rule.severity,
        detail: rule.description,
      });
    }
  }

  // 3. Check dose ranges
  const herbRefs = await prisma.herbReference.findMany({
    where: { name: { in: herbNames } },
  });

  for (const herb of herbs) {
    const ref = herbRefs.find((r) => r.name === herb.name);
    if (ref && ref.pharmacopoeiaMax && herb.dose > ref.pharmacopoeiaMax) {
      checks.push({
        checkType: "DOSE_EXCEEDED",
        herbName: herb.name,
        severity: "WARNING",
        detail: `${herb.name} 剂量 ${herb.dose}g 超过药典上限 ${ref.pharmacopoeiaMax}g`,
      });
    }
  }

  // 4. Check toxicity
  for (const herb of herbs) {
    const ref = herbRefs.find((r) => r.name === herb.name);
    if (ref?.toxicity) {
      checks.push({
        checkType: "TOXICITY",
        herbName: herb.name,
        severity: "WARNING",
        detail: `${herb.name} 标注：${ref.toxicity}，请确认用法用量`,
      });
    }
  }

  // Save checks to DB if prescriptionId provided
  if (prescriptionId) {
    const prescription = await prisma.prescription.findFirst({
      where: { id: prescriptionId, consultationId: id },
      select: { id: true },
    });
    if (!prescription) {
      return NextResponse.json({ error: "处方不存在" }, { status: 404 });
    }

    await prisma.complianceCheck.deleteMany({ where: { prescriptionId } }).catch(() => {});
    for (const check of checks) {
      await prisma.complianceCheck.create({
        data: {
          prescriptionId,
          checkType: check.checkType,
          herbName: check.herbName,
          conflictWith: check.conflictWith || null,
          severity: check.severity,
          detail: check.detail,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ checks });
}
