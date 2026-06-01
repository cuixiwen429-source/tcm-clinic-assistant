import { signRequest } from "@/lib/volcengine/signer";

const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const ARK_HOST = "ark.cn-beijing.volces.com";
const ARK_PATH = "/api/v3/chat/completions";

export interface VisionRequest {
  imageBase64: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function analyzeImage(req: VisionRequest): Promise<string> {
  const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.VOLCENGINE_SECRET_ACCESS_KEY || process.env.VOLCENGINE_SECRET_KEY;

  if (!apiKey && (!accessKeyId || !secretAccessKey)) {
    throw new Error("火山引擎视觉API密钥未配置 — 需设置 VOLCENGINE_ARK_API_KEY 或 VOLCENGINE_ACCESS_KEY_ID + VOLCENGINE_SECRET_ACCESS_KEY");
  }

  const model = process.env.VOLCENGINE_VISION_MODEL || "doubao-seed-2-0-pro-260215";

  const body = {
    model,
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${req.imageBase64}` },
          },
          { type: "text", text: req.prompt },
        ],
      },
    ],
    temperature: req.temperature ?? 0.3,
    max_tokens: req.maxTokens ?? 2048,
  };

  const payload = JSON.stringify(body);

  // Build headers: prefer IAM signature, fallback to Bearer token
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    // Pre-compute X-Date so it matches the signed headers
    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
    const hhmmss = now.toISOString().slice(11, 19).replace(/:/g, "");
    const xDate = yyyymmdd + "T" + hhmmss + "Z";

    const { authorization } = signRequest({
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      region: "cn-beijing",
      service: "ark",
      method: "POST",
      path: ARK_PATH,
      query: "",
      signedHeaders: {
        "host": ARK_HOST,
        "content-type": "application/json",
        "x-date": xDate,
      },
      payload,
    });

    headers["Authorization"] = authorization;
    headers["X-Date"] = xDate;
  }

  const res = await fetch(ARK_BASE, {
    method: "POST",
    headers,
    body: payload,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`视觉模型调用失败 (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("视觉模型返回为空");
  return text;
}
