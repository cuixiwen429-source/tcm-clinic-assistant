import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可访问" }, { status: 403 });
  }
  const rules = await prisma.complianceRule.findMany({ orderBy: { ruleType: "asc" } });
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可添加规则" }, { status: 403 });
  }
  const body = await request.json();
  const rule = await prisma.complianceRule.create({ data: body });
  return NextResponse.json(rule, { status: 201 });
}
