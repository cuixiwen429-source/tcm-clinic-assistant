import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      username: session.username,
      role: session.role,
      name: session.name,
    },
  });
}
