import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "DOCTOR"].includes(session.role)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const requestedUserId = searchParams.get("userId");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (session.role === "ADMIN") {
    if (requestedUserId) where.userId = requestedUserId;
  } else {
    where.userId = session.userId;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({ logs });
}
