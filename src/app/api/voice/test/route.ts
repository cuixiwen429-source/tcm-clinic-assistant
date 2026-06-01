import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { randomUUID } from "crypto";

export const maxDuration = 30;

function makeSilentWav(seconds: number): Buffer {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = sampleRate * seconds * numChannels * bitsPerSample / 8;
  const headerSize = 44;

  const buf = Buffer.alloc(headerSize + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(buf.length - 8, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
  buf.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  return buf;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const appId = process.env.VOLCENGINE_APP_ID;
  const accessToken = process.env.VOLCENGINE_ACCESS_TOKEN;

  if (!appId || !accessToken) {
    return NextResponse.json({
      error: "语音服务未配置",
      missing: [!appId && "VOLCENGINE_APP_ID", !accessToken && "VOLCENGINE_ACCESS_TOKEN"].filter(Boolean),
    }, { status: 503 });
  }

  const wav = makeSilentWav(1);
  const base64Audio = wav.toString("base64");

  const body = JSON.stringify({
    user: { uid: appId },
    audio: { data: base64Audio },
    request: { model_name: "bigmodel" },
  });

  const requestId = randomUUID();
  const t0 = performance.now();

  let res: Response;
  let fetchError: string | null = null;
  try {
    res = await fetch("https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-App-Key": appId,
        "X-Api-Access-Key": accessToken,
        "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
        "X-Api-Request-Id": requestId,
        "X-Api-Sequence": "-1",
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const ms = (performance.now() - t0).toFixed(0);

  if (fetchError || !res!) {
    return NextResponse.json({
      status: "error",
      stage: "fetch_failed",
      fetchError,
      timeMs: parseInt(ms),
      request: {
        url: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
        appIdUsed: appId,
        accessTokenPrefix: accessToken.substring(0, 8) + "...",
        requestId,
        wavSize: wav.length,
        base64Size: base64Audio.length,
      },
    });
  }

  const statusCode = res.headers.get("X-Api-Status-Code");
  const rawBody = await res.text().catch(() => "");
  let parsed: unknown = rawBody;
  try { parsed = JSON.parse(rawBody); } catch { /* keep as string */ }

  return NextResponse.json({
    status: res.ok && statusCode?.startsWith("2000") ? "ok" : "error",
    stage: "api_response",
    timeMs: parseInt(ms),
    httpStatus: res.status,
    apiStatusCode: statusCode,
    responseBody: typeof parsed === "string" ? parsed.substring(0, 1000) : parsed,
    request: {
      url: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
      appIdUsed: appId,
      accessTokenPrefix: accessToken.substring(0, 8) + "...",
      requestId,
      wavSize: wav.length,
      base64Size: base64Audio.length,
    },
    interpretation: interpretStatus(statusCode, res.status),
  });
}

function interpretStatus(apiCode: string | null, httpStatus: number): string {
  if (!apiCode) return `无 X-Api-Status-Code 响应头，HTTP ${httpStatus}`;
  const code = apiCode;
  if (code === "20000000") return "成功 — API 正常工作";
  if (code === "20000001") return "授权失败 — 检查 X-Api-App-Key / X-Api-Access-Key 是否正确，或服务是否已开通";
  if (code === "20000002") return "参数错误 — 请求体格式不正确";
  if (code === "20000003") return "静音音频 — 测试音频被判定为无声（太短或全零），这其实是正常的技术返回";
  if (code === "20000004") return "音频过长 — 超过限制";
  if (code === "20000005") return "服务繁忙 — 请稍后重试";
  if (code.startsWith("2000")) return `业务成功 (${code})`;
  return `未知状态码: ${code}，HTTP ${httpStatus}`;
}
