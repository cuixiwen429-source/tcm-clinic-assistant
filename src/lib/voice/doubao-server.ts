// Volcengine ASR — 大模型录音文件极速版 (synchronous HTTP, Vercel serverless compatible)
// POST /api/v3/auc/bigmodel/recognize/flash — base64 audio in JSON, header auth.
// Docs: https://www.volcengine.com/docs/6561/1631584

import { randomUUID } from "crypto";

export async function recognizePcm(pcmData: Buffer, language: string): Promise<string> {
  const appId = process.env.VOLCENGINE_APP_ID;
  const accessToken = process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!appId || !accessToken) throw new Error("语音服务未配置");

  console.log("[ASR] HTTP request — audio:", pcmData.length, "bytes, lang:", language);

  // Build WAV from raw PCM, then base64-encode
  const wav = pcmToWav(pcmData, 16000);
  const base64Audio = Buffer.from(wav).toString("base64");

  const body = JSON.stringify({
    user: { uid: appId },
    audio: { data: base64Audio },
    request: { model_name: "bigmodel" },
  });

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch("https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-App-Key": appId,
        "X-Api-Access-Key": accessToken,
        "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
        "X-Api-Request-Id": randomUUID(),
        "X-Api-Sequence": "-1",
      },
      body,
      signal: AbortSignal.timeout(300000),
    });
  } catch (err) {
    const ms = (performance.now() - t0).toFixed(0);
    console.error(`[ASR] Fetch failed after ${ms}ms:`, err);
    throw new Error(`语音服务连接失败 (${err instanceof Error ? err.message : "网络错误"})`);
  }

  const ms = (performance.now() - t0).toFixed(0);
  const statusCode = res.headers.get("X-Api-Status-Code");
  const rawBody = await res.text().catch(() => "");
  console.log(`[ASR] HTTP ${res.status} X-Api-Status-Code=${statusCode} time=${ms}ms`);
  console.log("[ASR] Raw response:", rawBody.substring(0, 600));

  let data: Record<string, unknown> = {};
  try { data = JSON.parse(rawBody); } catch { /* not JSON */ }

  if (!res.ok || (statusCode && !statusCode.startsWith("2000"))) {
    const errMsg = (data as Record<string, unknown>)?.message
      || (data as Record<string, unknown>)?.error
      || `HTTP ${res.status} / ${statusCode}`;
    console.error("[ASR] API error:", errMsg);
    throw new Error(`语音识别失败: ${errMsg}`);
  }

  // Parse: { result: { text: "...", utterances: [...] } }
  const result = (data as Record<string, unknown>)?.result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (typeof r.text === "string" && r.text) return r.text;
    if (Array.isArray(r.utterances)) {
      const joined = (r.utterances as Array<{ text?: string }>)
        .map((u) => u.text || "").join("");
      if (joined) return joined;
    }
  }

  console.error("[ASR] Unexpected response format:", rawBody.substring(0, 500));
  throw new Error("语音识别未返回有效文本");
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcm.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buf = Buffer.alloc(totalSize);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(totalSize - 8, 4);
  buf.write("WAVE", 8);
  // fmt chunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);       // chunk size
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  // data chunk
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  // PCM data
  pcm.copy(buf, 44);

  return buf;
}
