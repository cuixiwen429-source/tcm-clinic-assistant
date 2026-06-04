import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { ocrPrescription } from "@/lib/vision/prescription-ocr";

export const maxDuration = 60;

async function resizeImage(buf: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buf)
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return buf;
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const apiKey = process.env.VOLCENGINE_ARK_API_KEY || process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!apiKey) return NextResponse.json({ error: "火山引擎视觉API Key未配置" }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "未上传处方图片" }, { status: 400 });

    const arr = new Uint8Array(await file.arrayBuffer());
    const buf = await resizeImage(Buffer.from(arr));
    const imageBase64 = buf.toString("base64");

    const result = await ocrPrescription(imageBase64);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Pharmacy Prescription OCR]", error);
    const message = error instanceof Error ? error.message : "OCR识别失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
