/** Outils communs aux points d'accès /api. */
import type { APIContext } from 'astro';
import { HttpError } from './db.ts';
import { env, isProd } from './env.ts';

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

/** Refuse les requêtes d'écriture venant d'un autre site (protection CSRF). */
export function assertSameOrigin(ctx: APIContext) {
  const origin = ctx.request.headers.get('origin');
  if (!origin) {
    // navigateurs modernes : Origin toujours présent sur un POST fetch ; à défaut, on exige Sec-Fetch-Site
    const site = ctx.request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'Requête refusée.');
    return;
  }
  let host = '';
  try {
    host = new URL(origin).host;
  } catch {
    // origine illisible : host reste vide et la requête est refusée juste en dessous
  }
  // derrière Vercel, l'adresse interne de la requête peut différer du domaine public :
  // on accepte le domaine réellement demandé (en-têtes du proxy) et les domaines officiels
  const h = ctx.request.headers;
  const allowed = new Set(
    [ctx.url.host, h.get('host'), h.get('x-forwarded-host'), 'www.aulia-holding.com', 'aulia-holding.com', env('VERCEL_URL'), env('VERCEL_BRANCH_URL')]
      .flatMap((v) => (v ?? '').split(','))
      .map((v) => v.trim())
      .filter(Boolean),
  );
  if (!allowed.has(host)) throw new HttpError(403, 'Requête refusée (origine).');
}

export async function readJson<T = Record<string, unknown>>(ctx: APIContext, max = 300_000): Promise<T> {
  const text = await ctx.request.text();
  if (text.length > max) throw new HttpError(413, 'Données trop volumineuses.');
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new HttpError(400, 'Données illisibles.');
  }
}

/** Traduit les erreurs (y compris les verrous de la base) en réponses claires. */
export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  const msg = String((err as { message?: string })?.message ?? err);
  const guard = msg.match(/AULIA: ([^\n"]+)/);
  if (guard) return json({ error: guard[1].trim() }, 403);
  if ((err as { code?: string })?.code === 'P2002') return json({ error: 'Cet élément existe déjà.' }, 409);
  if (msg.includes('memberships_one_dg_per_org')) return json({ error: 'Cette filiale a déjà un DG actif.' }, 409);
  console.error('[AULIA api]', err);
  // en développement, le détail s'affiche aussi à l'écran pour faciliter le diagnostic
  return json({ error: isProd() ? 'Une erreur est survenue. Réessayez.' : `Erreur serveur : ${msg.slice(0, 400)}` }, 500);
}

type Handler = (ctx: APIContext) => Promise<Response>;

/** Enveloppe d'un point d'accès : contrôle d'origine sur les écritures + erreurs propres. */
export function handle(fn: Handler, opts: { origin?: boolean } = {}): Handler {
  return async (ctx) => {
    try {
      if (opts.origin !== false && ctx.request.method !== 'GET') assertSameOrigin(ctx);
      return await fn(ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max);

/** Adresse publique du site (derrière Vercel, l'adresse interne de la requête peut différer). */
export function publicOrigin(ctx: { url: URL; request: Request }): string {
  const h = ctx.request.headers;
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0].trim();
  if (!host) return ctx.url.origin;
  const proto = (h.get('x-forwarded-proto') ?? ctx.url.protocol.replace(':', '')).split(',')[0].trim();
  return `${proto}://${host}`;
}
