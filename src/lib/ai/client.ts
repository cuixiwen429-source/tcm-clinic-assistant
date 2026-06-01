import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

let clientInstance: OpenAI | null = null;

function getClient(): OpenAI {
  if (!clientInstance) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
    clientInstance = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
      timeout: 55000, // Vercel maxDuration=60s, leave 5s buffer
      maxRetries: 1,
    });
  }
  return clientInstance;
}

export function createDeepSeekClient(): OpenAI {
  return getClient();
}

interface CallJsonOptions<T> {
  systemPrompt: string;
  userMessage: string;
  schema: ZodType<T>;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callDeepSeekJson<T>(options: CallJsonOptions<T>): Promise<T> {
  const { systemPrompt, userMessage, schema, schemaName, temperature = 0.3, maxTokens = 4096 } = options;
  const client = getClient();

  // Try up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from AI");
      }

      // Track token usage
      console.log(`[DeepSeek] ${schemaName} tokens:`, {
        prompt: response.usage?.prompt_tokens,
        completion: response.usage?.completion_tokens,
      });

      // Parse and validate
      const parsed = JSON.parse(content);
      const validated = schema.parse(parsed);
      return validated as T;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      console.warn(`[DeepSeek] ${schemaName} attempt ${attempt + 1} failed, retrying...`);
    }
  }

  throw new Error(`Failed to get valid response for ${schemaName}`);
}

interface CallWithToolsOptions {
  systemPrompt: string;
  userMessage: string;
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  temperature?: number;
}

export async function callDeepSeekWithTools(
  options: CallWithToolsOptions
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
  const { systemPrompt, userMessage, tools, temperature = 0.3 } = options;
  const client = getClient();

  const response = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    tools,
    temperature,
    max_tokens: 4096,
  });

  const message = response.choices[0]?.message;
  if (!message) {
    throw new Error("Empty response from AI");
  }

  console.log("[DeepSeek] tool_calls tokens:", {
    prompt: response.usage?.prompt_tokens,
    completion: response.usage?.completion_tokens,
  });

  return message;
}

export async function streamDeepSeek(
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream> {
  const client = getClient();

  const stream = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 4096,
  });

  // Convert OpenAI stream to web ReadableStream
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          controller.enqueue(new TextEncoder().encode(content));
        }
      }
      controller.close();
    },
  });
}
