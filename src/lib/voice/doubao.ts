const WS_URL = "wss://openspeech.bytedance.com/api/v2/asr";

export const MANDARIN = "zh-CN";
export const CANTONESE = "yue";
export const ENGLISH = "en";

export const LANGUAGES = [
  { code: MANDARIN, label: "普通话", short: "普" },
  { code: CANTONESE, label: "广东话", short: "粤" },
  { code: ENGLISH, label: "English", short: "EN" },
] as const;

const MSG_FULL_REQUEST = 0x10;
const MSG_AUDIO_ONLY = 0x11;

function buildHeader(type: number, flags: number = 0): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = 1;
  header[1] = 4;
  header[2] = type;
  header[3] = flags;
  return header;
}

function encodeFullRequest(language: string, token: string): Uint8Array {
  const json = JSON.stringify({
    access_token: token,
    appid: process.env.NEXT_PUBLIC_VOLCENGINE_APP_ID || "",
    audio: {
      format: "pcm",
      rate: 16000,
      bits: 16,
      channel: 1,
      language,
    },
  });
  const encoder = new TextEncoder();
  const payload = encoder.encode(json);
  const header = buildHeader(MSG_FULL_REQUEST);
  const packet = new Uint8Array(4 + payload.length);
  packet.set(header, 0);
  packet.set(payload, 4);
  return packet;
}

function encodeAudio(pcm: ArrayBuffer): Uint8Array {
  const header = buildHeader(MSG_AUDIO_ONLY);
  const audio = new Uint8Array(pcm);
  const packet = new Uint8Array(4 + audio.length);
  packet.set(header, 0);
  packet.set(audio, 4);
  return packet;
}

interface ServerResponse {
  result?: Array<{
    text: string;
    is_final?: boolean;
    confidence?: number;
  }>;
  error?: string;
}

export class DoubaoClient {
  private ws: WebSocket | null = null;
  private token: string;
  private lang: string;
  private _connected = false;
  private closed = false;

  constructor(token: string, lang: string) {
    this.token = token;
    this.lang = lang;
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.closed) return reject(new Error("Client already closed"));

      // Pass token via URL query param (browser WebSocket can't set headers)
      const appId = process.env.NEXT_PUBLIC_VOLCENGINE_APP_ID || "5217068653";
      const url = `${WS_URL}?access_token=${encodeURIComponent(this.token)}&appid=${encodeURIComponent(appId)}`;
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        const fullReq = encodeFullRequest(this.lang, this.token);
        this.ws!.send(fullReq);
        this._connected = true;
        resolve();
      };

      this.ws.onerror = () => {
        if (!this._connected) reject(new Error("语音服务连接失败"));
        else this.onError?.(new Error("语音连接出错"));
      };

      this.ws.onclose = () => {
        this._connected = false;
      };

      this.ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const data = new Uint8Array(event.data);
        if (data.length < 4) return;

        const msgType = data[2];
        if (msgType === 0x91) {
          try {
            const json = JSON.parse(new TextDecoder().decode(data.slice(4)));
            this.onError?.(new Error(json.error || json.message || "ASR error"));
          } catch {
            this.onError?.(new Error("ASR protocol error"));
          }
          return;
        }

        if (msgType === 0x90) {
          try {
            const json: ServerResponse = JSON.parse(new TextDecoder().decode(data.slice(4)));
            if (json.error) {
              this.onError?.(new Error(json.error));
              return;
            }
            if (json.result && json.result.length > 0) {
              const text = json.result.map((r) => r.text).join("");
              const isFinal = json.result.every((r) => r.is_final !== false);
              this.onResult?.(text, isFinal);
            }
          } catch { /* ignore parse errors */ }
        }
      };
    });
  }

  sendAudio(pcm: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const packet = encodeAudio(pcm);
    this.ws.send(packet);
  }

  close(): void {
    this.closed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }

  onResult: ((text: string, isFinal: boolean) => void) | null = null;
  onError: ((err: Error) => void) | null = null;
}
