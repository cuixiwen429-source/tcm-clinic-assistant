import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { parsePrescriptionText } from "@/lib/ai/prescription-parse";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return NextResponse.json({ error: "请输入至少3个字符的处方描述" }, { status: 400 });
    }

    const result = await parsePrescriptionText(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Doctor Prescription AI Parse]", error);
    const message = error instanceof Error ? error.message : "AI解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
