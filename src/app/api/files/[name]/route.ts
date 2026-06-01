import { NextRequest, NextResponse } from "next/server";
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
  const { name } = await params;
  // Prevent path traversal
  const safe = path.basename(name);
  const filePath = path.join("/tmp/uploads", safe);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const ext = safe.split(".").pop() || "jpg";
  const contentType = MIME[ext] || "image/jpeg";
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" } });
}
