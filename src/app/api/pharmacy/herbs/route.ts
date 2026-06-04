import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const herbRefs = await prisma.herbReference.findMany({
    include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  const herbs = herbRefs.map((ref) => ({
    id: ref.id,
    herbId: ref.id,
    name: ref.name,
    pharmacopoeiaMin: ref.pharmacopoeiaMin,
    pharmacopoeiaMax: ref.pharmacopoeiaMax,
    retailPrice: ref.prices[0]?.retailPrice ?? null,
    unit: ref.unit,
  }));

  return NextResponse.json({ herbs });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PHARMACY") {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { herbId, retailPrice } = await request.json();
  if (!herbId) {
    return NextResponse.json({ error: "缺少药材ID" }, { status: 400 });
  }

  const existing = await prisma.herbPrice.findFirst({ where: { herbId } });
  if (existing) {
    await prisma.herbPrice.update({
      where: { id: existing.id },
      data: { retailPrice: retailPrice ?? null, updatedAt: new Date() },
    });
  } else {
    await prisma.herbPrice.create({
      data: {
        herbId,
        retailPrice: retailPrice ?? null,
        sourceNote: `Pharmacy ${session.userId}`,
      },
    });
  }

  return NextResponse.json({ success: true });
}
