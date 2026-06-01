import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "tcm_token";
const EXPIRATION = "24h";

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyJWT(token);
  if (!payload) return null;

  // Verify user exists in DB (handles Vercel cold starts where DB was re-created)
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (user) return payload;

  // Cold start recovery: user IDs may have changed, fall back to username
  const recovered = await prisma.user.findUnique({ where: { username: payload.username } });
  if (recovered) {
    return { userId: recovered.id, username: recovered.username, role: recovered.role, name: recovered.name };
  }

  return null;
}

/** Validate session with cold-start recovery: if userId not found (DB was reset),
 *  fall back to username lookup. Returns updated session or null. */
export async function getValidatedSession(): Promise<JWTPayload | null> {
  return getSession();
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
