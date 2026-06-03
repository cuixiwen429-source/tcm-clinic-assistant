import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 500);

  const herbs = await prisma.herbReference.findMany({
    where: q ? { name: { contains: q } } : {},
    take: limit,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ herbs });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "DOCTOR"].includes(session.role)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const body = await request.json();
  const herb = await prisma.herbReference.create({ data: body });
  return NextResponse.json(herb, { status: 201 });
}
