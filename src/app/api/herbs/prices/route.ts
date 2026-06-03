import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

// GET: List all herb prices with search & pagination
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (q) where.name = { contains: q };

  const [herbs, total] = await Promise.all([
    prisma.herbReference.findMany({
      where,
      include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } },
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.herbReference.count({ where }),
  ]);

  const items = herbs.map((h) => ({
    id: h.id,
    name: h.name,
    category: h.category,
    retailPrice: h.prices[0]?.retailPrice ?? null,
    wholesalePrice: h.prices[0]?.wholesalePrice ?? null,
    spec: h.prices[0]?.spec ?? null,
    origin: h.prices[0]?.origin ?? null,
  }));

  return NextResponse.json({ items, total });
}

// PUT: Batch update herb prices
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { prices } = await request.json();
  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    return NextResponse.json({ error: "无效数据" }, { status: 400 });
  }

  let updated = 0;
  for (const { name, retailPrice } of prices) {
    if (!name || retailPrice == null) continue;
    const herb = await prisma.herbReference.findUnique({ where: { name } });
    if (!herb) continue;
    await prisma.herbPrice.upsert({
      where: { id: `price-${name}` },
      update: { retailPrice: Number(retailPrice) },
      create: {
        id: `price-${name}`,
        herbId: herb.id,
        retailPrice: Number(retailPrice),
        wholesalePrice: Math.round(Number(retailPrice) * 0.65 * 100) / 100,
        spec: "统",
        origin: "中国",
        unit: "g",
      },
    });
    updated++;
  }

  return NextResponse.json({ updated });
}

// POST: Bulk price lookup by herb names (existing)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { herbNames } = await request.json();
  if (!herbNames || !Array.isArray(herbNames) || herbNames.length === 0) {
    return NextResponse.json({ prices: {}, total: 0 });
  }

  const herbRefs = await prisma.herbReference.findMany({
    where: { name: { in: herbNames } },
    include: { prices: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });

  const prices: Record<string, { retailPrice: number | null; totalForDose: number | null }> = {};

  for (const herb of herbRefs) {
    const price = herb.prices[0]?.retailPrice ?? null;
    prices[herb.name] = {
      retailPrice: price,
      totalForDose: null,
    };
  }

  // Fallback for herbs not found in DB
  for (const name of herbNames) {
    if (!(name in prices)) {
      prices[name] = { retailPrice: 0.15, totalForDose: null };
    }
  }

  return NextResponse.json({ prices });
}
