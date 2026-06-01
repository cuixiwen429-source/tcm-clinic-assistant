import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { recognizePcm } from "@/lib/voice/doubao-server";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const token = process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "语音服务未配置" }, { status: 503 });
  }

  try {
    // Accept WAV file via FormData
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "未上传音频文件" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());

    // Strip WAV header (44 bytes) to extract raw PCM
    const pcm = buf.length > 44 && buf.toString("utf-8", 0, 4) === "RIFF"
      ? buf.subarray(44)
      : buf;

    if (pcm.length === 0) {
      return NextResponse.json({ error: "音频数据为空" }, { status: 400 });
    }

    const lang = request.nextUrl.searchParams.get("lang") || "zh-CN";
    console.log(`[Voice] Received ${pcm.length} bytes PCM, lang=${lang}, duration≈${(pcm.length / 32000).toFixed(1)}s`);

    const text = await recognizePcm(pcm, lang);
    console.log(`[Voice] Result: ${text}`);
    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "语音转写失败";
    console.error("[Voice] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
