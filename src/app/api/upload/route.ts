import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import fs from "fs";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const formData = await request.formData();
  const file = (formData.get("image") || formData.get("file")) as File | null;
  if (!file) return NextResponse.json({ error: "未上传文件" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "仅支持 JPG/PNG/WebP 图片" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });

  const ext = file.type.split("/")[1] || "jpg";
  const name = `tongue_${Date.now()}.${ext}`;
  const dir = "/tmp/uploads";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, name), buffer);

  const url = `/api/files/${name}`;
  return NextResponse.json({ url });
}
