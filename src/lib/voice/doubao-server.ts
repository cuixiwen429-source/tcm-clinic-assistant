// Volcengine HTTP-based ASR (non-streaming) — works on Vercel serverless
// Replaces the WebSocket approach which is incompatible with serverless runtimes.

export async function recognizePcm(pcmData: Buffer, language: string): Promise<string> {
  const appId = process.env.VOLCENGINE_APP_ID;
  const accessToken = process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!appId || !accessToken) throw new Error("语音服务未配置");

  console.log("[ASR] HTTP request — audio:", pcmData.length, "bytes, lang:", language);

  // Build WAV from raw PCM
  const wav = pcmToWav(pcmData, 16000);

  const form = new FormData();
  form.set("appid", appId);
  form.set("token", accessToken);
  form.set("cluster", "volcengine_input_common");
  form.set("format", "wav");
  form.set("rate", "16000");
  form.set("language", language);
  form.set("bits", "16");
  form.set("channel", "1");
  form.set("audio", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "audio.wav");

  const res = await fetch("https://openspeech.bytedance.com/api/v1/asr", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[ASR] HTTP error:", res.status, errText);
    throw new Error(`语音识别失败 (${res.status})`);
  }

  const data = await res.json();
  console.log("[ASR] Raw response:", JSON.stringify(data).substring(0, 300));

  // Parse response — format: { result: [{ text: "..." }], ... } or { text: "..." }
  if (data.result) {
    if (Array.isArray(data.result)) {
      const texts = data.result.map((r: { text?: string }) => r.text || "").filter(Boolean);
      return texts.join("");
    }
    if (typeof data.result === "string") return data.result;
  }
  if (data.text && typeof data.text === "string") return data.text;
  if (data.response && typeof data.response === "string") return data.response;

  // Try nested paths
  const text = data?.result?.text || data?.payload_msg?.result?.[0]?.text || "";
  if (text) return text;

  console.error("[ASR] Unexpected response format:", JSON.stringify(data));
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
