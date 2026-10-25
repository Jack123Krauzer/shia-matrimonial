import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";
import { demoAccounts } from './demo-accounts';
import { AppError } from './store';

const SESSION_COOKIE = "sukoon_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, "sha512").toString("hex");
  return { hash: `${s}:${hash}`, salt: s };
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const { hash: computed } = hashPassword(password, salt);
  const [, computedHash] = computed.split(":");
  return hash === computedHash;
}

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const { hash } = hashPassword(password);
    await prisma.user.create({ data: { email, password: hash, isAdmin: true } });
  }
}

export async function signUp(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new Error("An account with this email already exists.");
  const { hash } = hashPassword(password);
  const user = await prisma.user.create({ data: { email: normalizedEmail, password: hash } });
  return createSession(user.id);
}

export async function signIn(email: string, password: string, options?: { adminOnly?: boolean }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (process.env.NODE_ENV !== 'development' && Object.values(demoAccounts).some(account => account.email === normalizedEmail)) {
    throw new Error('Demo accounts are available only in local development.');
  }
  if (process.env.NODE_ENV === 'development') {
    const demo = Object.entries(demoAccounts).find(([, account]) => account.email === normalizedEmail && account.password === password);
    if (demo) {
      const [role] = demo;
      const { hash } = hashPassword(password);
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {},
        create: { email: normalizedEmail, password: hash, isAdmin: role === 'admin' },
      });
    }
  }
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !verifyPassword(password, user.password)) {
    throw new AppError("Sign-in failed. Check your email and password.", 401);
  }
  if (options?.adminOnly && !user.isAdmin && !administrator(user.email)) throw new AppError('This account does not have administrator access.', 403);
  return createSession(user.id);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
  return { userId, token };
}

export async function currentUser(): Promise<{ userId: string; email: string; isAdmin: boolean } | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    if (process.env.NODE_ENV !== 'development' && Object.values(demoAccounts).some(account => account.email === session.user.email.toLowerCase())) return null;
    const adminEmail = process.env.ADMIN_EMAIL || "admin@sukoon.dev";
    const isAdmin = session.user.isAdmin || session.user.email.toLowerCase() === adminEmail.toLowerCase();
    return { userId: session.user.id, email: session.user.email, isAdmin };
  } catch {
    return null;
  }
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function administrator(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sukoon.dev";
  return adminEmail.toLowerCase() === email.toLowerCase();
}
