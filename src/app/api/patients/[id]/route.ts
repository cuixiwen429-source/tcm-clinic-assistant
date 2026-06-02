import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      consultations: {
        orderBy: { visitDate: "desc" },
        take: 20,
        include: {
          prescriptions: {
            where: { isFinal: true },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "患者不存在" }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, gender, birthDate, age, phone, address, allergies, constitution, chronicDisease, notes } = body;

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "患者不存在" }, { status: 404 });
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      gender: gender !== undefined ? gender : existing.gender,
      birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : existing.birthDate,
      age: age !== undefined ? (age ? parseInt(age) : null) : existing.age,
      phone: phone !== undefined ? phone : existing.phone,
      address: address !== undefined ? address : existing.address,
      allergies: allergies !== undefined ? allergies : existing.allergies,
      constitution: constitution !== undefined ? constitution : existing.constitution,
      chronicDisease: chronicDisease !== undefined ? chronicDisease : existing.chronicDisease,
      notes: notes !== undefined ? notes : existing.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "UPDATE",
      entityType: "PATIENT",
      entityId: id,
      detail: `更新患者信息: ${patient.name}`,
    },
  });

  return NextResponse.json(patient);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "患者不存在" }, { status: 404 });
  }

  // Only ADMIN can delete
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可删除患者" }, { status: 403 });
  }

  await prisma.patient.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "DELETE",
      entityType: "PATIENT",
      entityId: id,
      detail: `删除患者: ${existing.name}`,
    },
  });

  return NextResponse.json({ success: true });
}
