import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { findSeededUser } from "./users";

const COOKIE = "session";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function sign(userId: string): string {
  const sig = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const expected = Buffer.from(sign(userId));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? userId : null;
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Returns the signed-in user, or null. Seeded users are created on first use,
 * so a fresh database works without a separate seed step. */
export async function getCurrentUser() {
  const store = await cookies();
  const userId = verify(store.get(COOKIE)?.value);
  if (!userId) return null;
  const seeded = findSeededUser(userId);
  if (!seeded) return null;
  return prisma.user.upsert({
    where: { id: seeded.id },
    update: {},
    create: { id: seeded.id, name: seeded.name, email: seeded.email },
  });
}
