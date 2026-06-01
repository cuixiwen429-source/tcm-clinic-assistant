import { createHash, createHmac } from "crypto";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

export interface SignOptions {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  method: string;
  path: string;
  query: string;
  signedHeaders: Record<string, string>;
  payload: string;
}

export function signRequest(opts: SignOptions): { authorization: string } {
  // Use the x-date value from signedHeaders as the authoritative timestamp
  const timestamp = opts.signedHeaders["x-date"] || "";
  if (!timestamp) {
    throw new Error("x-date header is required in signedHeaders");
  }

  const dateMatch = timestamp.match(/^(\d{8})T/);
  if (!dateMatch) {
    throw new Error("x-date format must be YYYYMMDDTHHmmSSZ");
  }
  const yyyymmdd = dateMatch[1];

  const sortedKeys = Object.keys(opts.signedHeaders).sort();
  const signedHeadersStr = sortedKeys.join(";");
  const canonicalHeaders = sortedKeys
    .map((k) => k + ":" + opts.signedHeaders[k].trim())
    .join("\n") + "\n";

  const hashedPayload = sha256(opts.payload);
  const canonicalRequest = [
    opts.method,
    opts.path,
    opts.query,
    canonicalHeaders,
    signedHeadersStr,
    hashedPayload,
  ].join("\n");

  const credentialScope = `${yyyymmdd}/${opts.region}/${opts.service}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(opts.secretAccessKey, yyyymmdd);
  const kRegion = hmacSha256(kDate, opts.region);
  const kService = hmacSha256(kRegion, opts.service);
  const kSigning = hmacSha256(kService, "request");
  const signature = hmacSha256(kSigning, stringToSign).toString("hex");

  const authorization = `HMAC-SHA256 Credential=${opts.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  return { authorization };
}
