import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = q
    ? {
        role: "DOCTOR",
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
        ],
      }
    : { role: "DOCTOR" };

  const doctors = await prisma.user.findMany({
    where,
    select: { id: true, name: true, phone: true },
    take: limit,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ doctors });
}
