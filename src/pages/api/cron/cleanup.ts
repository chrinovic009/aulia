/**
 * Entretien quotidien, lancé par Vercel Cron (voir vercel.json).
 * Vercel envoie « Authorization: Bearer <CRON_SECRET> » : sans ce secret, l'appel est refusé.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../lib/server/db.ts';
import { env } from '../../../lib/server/env.ts';
import { safeEqual } from '../../../lib/server/crypto.ts';

const DAY = 864e5;

export const GET: APIRoute = async ({ request }) => {
  const secret = env('CRON_SECRET');
  const given = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(given, `Bearer ${secret}`)) return new Response(null, { status: 401 });
  if (!db) return Response.json({ ok: false, error: 'base non configurée' }, { status: 503 });

  const results = await Promise.allSettled([
    db.changeEvent.deleteMany({ where: { at: { lt: new Date(Date.now() - 2 * DAY) } } }),
    db.loginAttempt.deleteMany({ where: { at: { lt: new Date(Date.now() - 7 * DAY) } } }),
    db.otpCode.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * DAY) } } }),
  ]);
  const [events, logins, codes] = results.map((r) => (r.status === 'fulfilled' ? r.value.count : null));
  const failed = results.filter((r) => r.status === 'rejected');
  for (const f of failed) console.error('[AULIA cron] nettoyage en échec :', String((f as PromiseRejectedResult).reason).slice(0, 200));
  return Response.json({ ok: failed.length === 0, supprimes: { evenements: events, connexions: logins, codes } }, { status: failed.length ? 500 : 200 });
};
