// Connexion avec GitHub (ou liaison du compte GitHub depuis la page Sécurité).
import type { APIRoute } from 'astro';
import { publicOrigin } from '../../../../lib/server/http.ts';
import { env, isProd } from '../../../../lib/server/env.ts';
import { randomToken } from '../../../../lib/server/crypto.ts';

export const GET: APIRoute = (ctx) => {
  const clientId = env('GITHUB_CLIENT_ID');
  if (!clientId) return ctx.redirect('/admin/connexion?erreur=github-non-configure');
  const wanted = ctx.url.searchParams.get('mode');
  const mode = wanted === 'link' || wanted === 'stepup' ? wanted : 'login';
  const state = `${mode}.${randomToken(24)}`;
  ctx.cookies.set('aulia_gh', state, { path: '/api/auth/github', httpOnly: true, secure: isProd(), sameSite: 'lax', maxAge: 600 });
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', `${publicOrigin(ctx)}/api/auth/github/callback`);
  u.searchParams.set('scope', 'read:user user:email');
  u.searchParams.set('state', state);
  u.searchParams.set('allow_signup', 'false');
  return ctx.redirect(u.toString());
};
