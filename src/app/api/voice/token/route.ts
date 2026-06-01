import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const token = process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "语音服务未配置" }, { status: 503 });
  }

  return NextResponse.json({ token });
}
