import WebSocket from "ws";

const WS_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel";

// ── Binary protocol (exact match with official Volcengine Python SDK) ──
// Frame: header(4) + size(4) + payload
// Header layout:
//   [0] = 0x11 (protocol version)
//   [1] = (msg_type << 4) | flags
//         msg_type: 0x1=full-request(JSON), 0x2=audio(raw)
//         flags for audio: 0x0=normal, 0x2=final
//   [2] = (serialization << 4) | compression
//         0x10 = JSON / no compression (for full request)
//         0x00 = raw / no compression (for audio)
//   [3] = reserved (0x00)

function buildFullRequest(language: string): Buffer {
  const payload = {
    user: { uid: "tcm-clinic-user" },
    audio: {
      format: "pcm",
      rate: 16000,
      bits: 16,
      channel: 1,
      codec: "raw",
      language,
    },
    request: {
      model_name: "bigmodel",
      language,
      enable_itn: true,
      enable_punc: true,
      result_type: "single",
      show_utterances: false,
      vad: { vad_enable: true, end_window_size: 800 },
    },
  };
  const json = Buffer.from(JSON.stringify(payload), "utf-8");
  // Exact header from Python SDK: struct.pack(">BBBB", 0x11, 0x10, 0x10, 0x00)
  const header = Buffer.from([0x11, 0x10, 0x10, 0x00]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(json.length, 0);
  return Buffer.concat([header, size, json]);
}

function buildAudioChunk(pcm: Buffer, isFinal: boolean): Buffer {
  const flags = isFinal ? 0x2 : 0x0;
  const msgTypeFlags = (0x2 << 4) | flags;
  // Audio header from Python SDK: [0x11, msgTypeFlags, 0x00, 0x00]
  const header = Buffer.from([0x11, msgTypeFlags, 0x00, 0x00]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(pcm.length, 0);
  if (pcm.length === 0) return Buffer.concat([header, size]);
  return Buffer.concat([header, size, pcm]);
}

// ── Parse server response ──
function parseResponse(data: Buffer): { text: string; isFinal: boolean } | { error: string } | null {
  if (data.length < 12) return null;

  const msgType = (data.readUInt8(1) >> 4) & 0x0f;
  // Skip 4-byte header + 8-byte reserved = 12 bytes offset to JSON
  let payload = data.subarray(12);

  // Server sometimes prepends non-JSON bytes, find JSON start
  const jsonStart = payload.indexOf(0x7b); // '{'
  if (jsonStart > 0) payload = payload.subarray(jsonStart);

  let json: Record<string, unknown>;
  try { json = JSON.parse(payload.toString("utf-8")); } catch { return null; }

  // Error: type 0xF (0b1111) or JSON error
  if (msgType === 0xf || json.type === "error") {
    return { error: (json.error as string) || (json.header as Record<string, unknown>)?.["message"] as string || "ASR error" };
  }

  // ASR result: type 0x9 (0b1001)
  const result = json.result;
  if (!result) return null;

  const texts: string[] = [];
  if (Array.isArray(result)) {
    for (const r of result) {
      if (typeof r === "string") texts.push(r);
      else if (typeof r === "object" && r && "text" in r) texts.push(String(r.text));
    }
  } else if (typeof result === "object" && result && "text" in result) {
    texts.push(String(result.text));
  }

  const text = texts.join("");
  if (!text) return null;

  return { text, isFinal: json.type === "final" };
}

export async function recognizePcm(pcmData: Buffer, language: string): Promise<string> {
  const appId = process.env.VOLCENGINE_APP_ID;
  const accessToken = process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!appId || !accessToken) throw new Error("语音服务未配置");

  console.log("[ASR] Connecting to Volcengine bigmodel v3...");
  console.log("[ASR] Audio:", pcmData.length, "bytes, lang:", language);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, {
      headers: {
        "X-Api-App-Key": appId,
        "X-Api-Access-Key": accessToken,
        "X-Api-Resource-Id": "volc.bigasr.sauc.duration",
        "X-Api-Connect-Id": `tcm-${Date.now()}`,
      },
    });

    const results: string[] = [];
    let settled = false;

    const finish = (err: Error | null, text?: string) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* */ }
      if (err) reject(err);
      else resolve(text || results.join(""));
    };

    ws.on("open", () => {
      console.log("[ASR] Connected, sending full request + audio...");
      ws.send(buildFullRequest(language));

      // Send audio in chunks
      const CHUNK = 128 * 1024;
      for (let i = 0; i < pcmData.length; i += CHUNK) {
        const chunk = pcmData.subarray(i, i + CHUNK);
        ws.send(buildAudioChunk(chunk, false));
      }

      // Final empty frame signals end of audio
      ws.send(buildAudioChunk(Buffer.alloc(0), true));
      console.log("[ASR] Audio sent, waiting for result...");
    });

    ws.on("message", (data: Buffer) => {
      console.log("[ASR] Raw response:", data.length, "bytes, hex:", data.subarray(0, Math.min(16, data.length)).toString("hex"));
      const r = parseResponse(data);
      if (!r) return;

      if ("error" in r) {
        finish(new Error(r.error));
        return;
      }

      console.log("[ASR] Text:", r.text, "final:", r.isFinal);
      if (r.text) results.push(r.text);
      if (r.isFinal) finish(null);
    });

    ws.on("close", () => finish(new Error("连接意外关闭")));
    ws.on("error", (err) => finish(new Error(`连接错误: ${err.message}`)));

    setTimeout(() => finish(new Error("识别超时")), 15000);
  });
}
