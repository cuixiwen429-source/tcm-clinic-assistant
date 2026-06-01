const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export interface VisionRequest {
  imageBase64: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function analyzeImage(req: VisionRequest): Promise<string> {
  const apiKey = process.env.VOLCENGINE_ARK_API_KEY || process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!apiKey) throw new Error("火山引擎视觉API Key未配置");

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

  const res = await fetch(ARK_BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
