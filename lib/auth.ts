import { createHash, createHmac } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "polla_session";
const SECRET = process.env.SESSION_SECRET ?? "polla-dev-secret";

export function hashPassword(password: string) {
  return createHash("sha256").update(`polla-mundial:${password}`).digest("hex");
}

function sign(userId: string) {
  return createHmac("sha256", SECRET).update(userId).digest("hex").slice(0, 24);
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60, // 60 días, cubre todo el torneo
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentUser() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [userId, sig] = raw.split(".");
  if (!userId || sig !== sign(userId)) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}
