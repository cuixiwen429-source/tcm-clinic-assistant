import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { herbNames } = await request.json();
  if (!herbNames || !Array.isArray(herbNames) || herbNames.length === 0) {
    return NextResponse.json({ prices: {}, total: 0 });
  }

  // Look up prices from HerbPrice via HerbReference
  const herbRefs = await prisma.herbReference.findMany({
    where: { name: { in: herbNames } },
    include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });

  const prices: Record<string, { retailPrice: number | null; totalForDose: number | null }> = {};
  let totalEstimate = 0;

  for (const herb of herbRefs) {
    const price = herb.prices[0]?.retailPrice ?? null;
    prices[herb.name] = {
      retailPrice: price,
      totalForDose: null, // will be filled by client with dose info
    };
  }

  // For herbs not found in DB, estimate default ~0.15/g (广东市场常见饮片均价)
  for (const name of herbNames) {
    if (!(name in prices)) {
      prices[name] = { retailPrice: 0.15, totalForDose: null };
    }
  }

  return NextResponse.json({ prices });
}
