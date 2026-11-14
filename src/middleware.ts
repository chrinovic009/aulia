/**
 * Middleware : chargé à chaque requête.
 *  - site public : charge la version en ligne du contenu (repli automatique sur le code) ;
 *  - espace interne (/admin) : vérifie la session, la deuxième étape et l'appartenance ;
 *  - en-têtes de sécurité et de cache.
 */
import { defineMiddleware } from 'astro:middleware';
import { db } from './lib/server/db.ts';
import { readSession } from './lib/server/auth.ts';
import { loadLive } from './lib/server/content.ts';
import { needsStrongAuth } from './lib/server/authz.ts';

/** Pages de l'espace interne accessibles sans être connecté. */
const PUBLIC_ADMIN = ['/admin/connexion', '/admin/rejoindre', '/admin/recuperation'];
/** Pages accessibles connecté, avant la deuxième étape. */
const STEP_UP = ['/admin/verification', '/admin/securite'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isApi = pathname.startsWith('/api/');
  ctx.locals.dbReady = !!db;

  if ((isAdmin || pathname.startsWith('/api/admin') || pathname.startsWith('/api/auth') || pathname === '/api/live') && db) {
    try {
      ctx.locals.user = await readSession(db, ctx.cookies);
    } catch (err) {
      console.error('[AULIA] session', err);
      ctx.locals.user = null;
    }
  }

  if (isAdmin) {
    const u = ctx.locals.user;
    const open = PUBLIC_ADMIN.some((p) => pathname.startsWith(p));
    if (!open) {
      if (!u) return ctx.redirect(`/admin/connexion?suite=${encodeURIComponent(pathname + ctx.url.search)}`);
      const stepUp = STEP_UP.some((p) => pathname.startsWith(p));
      if (!stepUp) {
        if (u.totpEnabled && u.aal < 2) return ctx.redirect('/admin/verification');
        if (!u.totpEnabled && needsStrongAuth(u)) return ctx.redirect('/admin/securite?obligatoire=1');
      }
      if (u.memberships.length === 0 && pathname !== '/admin/securite') {
        // compte sans appartenance active (suspendu ou départ) : aucun accès aux données
        if (pathname !== '/admin') return ctx.redirect('/admin');
      }
    }
    return withHeaders(await next(), {
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    });
  }

  if (!isApi) {
    const { live, since } = await loadLive(Number(ctx.url.searchParams.get('_live')) || 0);
    ctx.locals.live = live;
    ctx.locals.liveSince = since;
  }

  const res = await next();
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  if (!isApi && ctx.request.method === 'GET' && res.status === 200 && (res.headers.get('content-type') ?? '').includes('text/html')) {
    // Le CDN garde la page quelques secondes ; les visiteurs déjà présents reçoivent les
    // mises à jour en direct (voir /api/live), et une page servie depuis le cache se met
    // à jour dès son ouverture grâce au repère data-live-since.
    headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    headers['Vercel-CDN-Cache-Control'] = 'max-age=15, stale-while-revalidate=300';
  }
  return withHeaders(res, headers);
});

/** Ajoute des en-têtes (une réponse de redirection peut avoir des en-têtes figés : on la recopie). */
function withHeaders(res: Response, headers: Record<string, string>): Response {
  try {
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return res;
  } catch {
    const copy = new Response(res.body, res);
    for (const [k, v] of Object.entries(headers)) copy.headers.set(k, v);
    return copy;
  }
}
