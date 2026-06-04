import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import fs from "fs";
import path from "path";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { name } = await params;
  // Prevent path traversal
  const safe = path.basename(name);
  const isUserScopedName = /^[A-Za-z0-9_-]+_\d+_[a-f0-9]{16}\.(jpg|jpeg|png|webp)$/i.test(safe);
  if (isUserScopedName && session.role !== "ADMIN" && !safe.startsWith(`${session.userId}_`)) {
    return NextResponse.json({ error: "无权限访问该文件" }, { status: 403 });
  }

  const filePath = path.join("/tmp/uploads", safe);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const ext = safe.split(".").pop() || "jpg";
  const contentType = MIME[ext] || "image/jpeg";
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" } });
}
