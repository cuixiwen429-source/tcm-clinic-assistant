import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { signJWT, setSessionCookie } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, phone } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: "用户名、密码和姓名为必填项" }, { status: 400 });
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: "用户名需3-30个字符" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
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
        role: "DOCTOR", // Default role for self-registration
        phone: phone || null,
      },
    });

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
