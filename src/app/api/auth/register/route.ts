import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { signJWT, setSessionCookie } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, phone, role, doctorId } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: "用户名、密码和姓名为必填项" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: "用户名需3-30个字符" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const userRole = role === "PHARMACY" ? "PHARMACY" : "DOCTOR";

    if (userRole === "PHARMACY") {
      if (!doctorId) {
        return NextResponse.json({ error: "药房注册必须绑定一位执业药师" }, { status: 400 });
      }
      // Verify the doctor exists and is a DOCTOR
      const doctor = await prisma.user.findFirst({
        where: { id: doctorId, role: "DOCTOR" },
      });
      if (!doctor) {
        return NextResponse.json({ error: "所选药师不存在" }, { status: 400 });
      }
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        name,
        role: userRole,
        phone: phone || null,
      },
    });

    // Create pharmacy binding
    if (userRole === "PHARMACY" && doctorId) {
      await prisma.pharmacyBinding.create({
        data: {
          pharmacyId: user.id,
          doctorId,
        },
      });
    }

    const token = await signJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 });
  }
}
