// Statistiques du site public (visites et interactions), sans cookie.
import type { APIRoute } from 'astro';
import { db } from '../../lib/server/db.ts';
import { deviceOf, isBot, orgForPath, visitorHash } from '../../lib/server/visitors.ts';

const ok = () => new Response(null, { status: 204 });

export const POST: APIRoute = async (ctx) => {
  if (!db) return ok();
  try {
    const ua = ctx.request.headers.get('user-agent') ?? '';
    if (isBot(ua)) return ok();
    const text = await ctx.request.text();
    if (text.length > 2000) return ok();
    const b = JSON.parse(text || '{}') as { k?: string; p?: string; l?: string; r?: string; t?: string };
    const path = String(b.p ?? '/').slice(0, 200);
    if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return ok();
    let referrerHost: string | null = null;
    try {
      const h = b.r ? new URL(b.r).host : '';
      referrerHost = h && h !== ctx.url.host ? h.replace(/^www\./, '').slice(0, 100) : null;
    } catch {
      // provenance mal formée : la visite est enregistrée sans provenance
    }
    await db.siteEvent.create({
      data: {
        kind: b.k === 'click' ? 'CLICK' : 'VIEW',
        path,
        orgId: await orgForPath(db, path),
        lang: b.l === 'fr' ? 'fr' : 'en',
        country: ctx.request.headers.get('x-vercel-ip-country')?.slice(0, 2) ?? null,
        referrerHost,
        device: deviceOf(ua),
        label: b.k === 'click' ? String(b.t ?? '').slice(0, 120) || null : null,
        visitorHash: visitorHash(ctx.request),
      },
    });
  } catch (err) {
    console.warn('[AULIA track]', String((err as Error).message).slice(0, 200));
  }
  return ok();
};
