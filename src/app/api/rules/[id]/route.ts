import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可修改" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const rule = await prisma.complianceRule.update({ where: { id }, data: body });
  return NextResponse.json(rule);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可删除" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.complianceRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
