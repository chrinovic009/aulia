/**
 * Comptes et sessions de l'espace interne.
 *  - connexion : e-mail + mot de passe, ou GitHub (compte relié au préalable) ;
 *  - deuxième étape : code TOTP de l'application d'authentification, ou code de secours ;
 *  - création de compte : sur invitation uniquement, adresse prouvée par un code à 6 chiffres ;
 *  - récupération : code à 6 chiffres envoyé à l'adresse principale ou à l'adresse de secours.
 */
import type { AstroCookies } from 'astro';
import type { OtpPurpose, PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { env, isProd } from './env.ts';
import { HttpError } from './db.ts';
import { randomToken, sha256, sixDigits, safeEqual } from './crypto.ts';
import { codeMail, sendMail } from './mail.ts';
import type { MemberCtx, UserCtx } from './authz.ts';

export const SESSION_COOKIE = 'aulia_sid';
const SESSION_DAYS = 7;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PER_HOUR = 5;
const LOGIN_FAILS_LOCK = 8;
const LOGIN_WINDOW_MIN = 15;

export const normEmail = (e: unknown) => String(e ?? '').trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

export function appSecret(): string {
  const s = env('APP_SECRET');
  if (!s || s.length < 32) {
    if (isProd()) throw new HttpError(500, 'APP_SECRET manquant ou trop court (32 caractères minimum).');
    return 'developpement-uniquement-ne-pas-utiliser-en-production';
  }
  return s;
}

const otpHash = (email: string, purpose: string, code: string) =>
  createHmac('sha256', appSecret()).update(`${purpose}:${email}:${code}`).digest('hex');

// ───────────────────────── sessions ─────────────────────────

export async function createSession(db: PrismaClient, cookies: AstroCookies, userId: string, aal: number, req: Request) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      aal,
      expiresAt,
      ip: clientIp(req),
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, 200),
    },
  });
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    expires: expiresAt,
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroySession(db: PrismaClient | null, cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token && db) await db.session.deleteMany({ where: { id: sha256(token) } });
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function readSession(db: PrismaClient, cookies: AstroCookies): Promise<UserCtx | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || s.user.disabledAt) return null;
  if (Date.now() - s.lastSeenAt.getTime() > 5 * 60_000) {
    await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  }
  return loadCtx(db, s.user, s.id, s.aal);
}

export async function loadCtx(
  db: PrismaClient,
  user: { id: string; email: string; name: string; totpEnabledAt: Date | null; githubLogin: string | null },
  sessionId: string,
  aal: number,
): Promise<UserCtx> {
  const ms = await db.membership.findMany({
    where: { userId: user.id, status: 'ACTIVE', org: { status: { not: 'ARCHIVED' } } },
    include: { org: true, role: true },
    orderBy: { role: { rank: 'asc' } },
  });
  const memberships: MemberCtx[] = ms.map((m) => ({
    orgId: m.orgId,
    orgSlug: m.org.slug,
    orgName: m.org.name,
    orgKind: m.org.kind,
    roleCode: m.roleCode,
    roleLabel: m.role.labelFr,
    rank: m.role.rank,
    permissions: m.role.permissions,
  }));
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    totpEnabled: !!user.totpEnabledAt,
    githubLogin: user.githubLogin,
    aal,
    sessionId,
    memberships,
  };
}

export async function elevateSession(db: PrismaClient, sessionId: string) {
  await db.session.update({ where: { id: sessionId }, data: { aal: 2 } });
}

// ───────────────────────── mot de passe : limitation des essais ─────────────────────────

export async function loginLocked(db: PrismaClient, email: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MIN * 60_000);
  const fails = await db.loginAttempt.count({ where: { email, ok: false, at: { gte: since } } });
  return fails >= LOGIN_FAILS_LOCK;
}

export async function recordLogin(db: PrismaClient, email: string, ok: boolean) {
  await db.loginAttempt.create({ data: { email, ok } });
}

// ───────────────────────── codes à 6 chiffres par e-mail ─────────────────────────

/** Envoie un code. Retourne false si la limite horaire est atteinte. */
export async function issueOtp(db: PrismaClient, email: string, purpose: OtpPurpose, sendTo = email) {
  const hourAgo = new Date(Date.now() - 3600_000);
  const recent = await db.otpCode.count({ where: { email, createdAt: { gte: hourAgo } } });
  if (recent >= OTP_PER_HOUR) return { ok: false as const, error: 'Trop de codes demandés. Réessayez dans une heure.' };
  const code = sixDigits();
  await db.otpCode.updateMany({ where: { email, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
  await db.otpCode.create({
    data: { email, purpose, codeHash: otpHash(email, purpose, code), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
  });
  const sent = await sendMail(codeMail(sendTo, code, purpose));
  if (!sent.ok) return { ok: false as const, error: sent.error ?? 'Envoi impossible.' };
  return { ok: true as const };
}

export async function verifyOtp(db: PrismaClient, email: string, purpose: OtpPurpose, code: string): Promise<boolean> {
  const c = String(code ?? '').replace(/\s/g, '');
  const row = await db.otpCode.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!row || row.attempts >= OTP_MAX_ATTEMPTS || !/^\d{6}$/.test(c)) {
    if (row) await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  if (!safeEqual(row.codeHash, otpHash(email, purpose, c))) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return true;
}

// ───────────────────────── divers ─────────────────────────

export function clientIp(req: Request): string | null {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null;
}

export const founderEmail = () => normEmail(env('FOUNDER_EMAIL'));

export async function founderExists(db: PrismaClient): Promise<boolean> {
  return (await db.membership.count({ where: { roleCode: 'founder', status: 'ACTIVE' } })) > 0;
}
