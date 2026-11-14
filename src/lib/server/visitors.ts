/** Mesure d'audience respectueuse : ni cookie, ni adresse IP conservée. */
import type { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { appSecret, clientIp } from './auth.ts';

let orgCache: { at: number; map: Map<string, string>; holding: string | null } | null = null;

export async function orgIndex(db: PrismaClient) {
  if (orgCache && Date.now() - orgCache.at < 60_000) return orgCache;
  const orgs = await db.organization.findMany({ select: { id: true, slug: true, kind: true } });
  orgCache = { at: Date.now(), map: new Map(orgs.map((o) => [o.slug, o.id])), holding: orgs.find((o) => o.kind === 'HOLDING')?.id ?? null };
  return orgCache;
}

/** Organisation concernée par une page du site : la filiale pour ses pages, sinon la holding. */
export async function orgForPath(db: PrismaClient, path: string): Promise<string | null> {
  const idx = await orgIndex(db);
  const m = path.match(/^\/(?:fr\/ecosysteme|ecosystem)\/([a-z0-9-]+)/);
  return (m && idx.map.get(m[1])) || idx.holding;
}

export async function orgForTopic(db: PrismaClient, topic: string): Promise<string | null> {
  const idx = await orgIndex(db);
  return idx.map.get(topic) ?? idx.holding;
}

/** Empreinte quotidienne : permet de compter des visiteurs uniques sans pouvoir les identifier. */
export function visitorHash(req: Request): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${day}|${clientIp(req) ?? ''}|${req.headers.get('user-agent') ?? ''}|${appSecret()}`)
    .digest('hex')
    .slice(0, 20);
}

export const isBot = (ua: string) => !ua || /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios/i.test(ua);

export function deviceOf(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'tablette';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'ordinateur';
}
