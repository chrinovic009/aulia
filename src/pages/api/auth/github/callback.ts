import type { APIRoute } from 'astro';
import { db } from '../../../../lib/server/db.ts';
import { env } from '../../../../lib/server/env.ts';
import { safeEqual } from '../../../../lib/server/crypto.ts';
import { createSession } from '../../../../lib/server/auth.ts';
import { audit } from '../../../../lib/server/audit.ts';

/**
 * Par sécurité, GitHub ne crée jamais de compte et n'est jamais relié automatiquement :
 * la personne relie son compte GitHub une fois, depuis la page Sécurité, après s'être
 * connectée par e-mail. La deuxième étape (application d'authentification) reste exigée.
 */
export const GET: APIRoute = async (ctx) => {
  const back = (q: string) => ctx.redirect(`/admin/connexion?erreur=${q}`);
  const state = ctx.url.searchParams.get('state') ?? '';
  const code = ctx.url.searchParams.get('code');
  const expected = ctx.cookies.get('aulia_gh')?.value ?? '';
  ctx.cookies.delete('aulia_gh', { path: '/api/auth/github' });
  if (!db || !code || !expected || !safeEqual(state, expected)) return back('github-etat');
  const mode = expected.startsWith('link.') ? 'link' : 'login';

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env('GITHUB_CLIENT_ID'),
      client_secret: env('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: `${ctx.url.origin}/api/auth/github/callback`,
    }),
  });
  const token = ((await tokenRes.json().catch(() => ({}))) as { access_token?: string }).access_token;
  if (!token) return back('github-refus');
  const gh = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'aulia-portal', Accept: 'application/vnd.github+json' } });
  const profile = (await gh.json().catch(() => ({}))) as { id?: number; login?: string };
  if (!profile.id) return back('github-profil');
  const githubId = String(profile.id);

  if (mode === 'link') {
    const u = ctx.locals.user;
    if (!u || (u.totpEnabled && u.aal < 2)) return back('github-session');
    const other = await db.user.findUnique({ where: { githubId } });
    if (other && other.id !== u.id) return ctx.redirect('/admin/securite?github=deja-utilise');
    await db.user.update({ where: { id: u.id }, data: { githubId, githubLogin: profile.login ?? null } });
    await audit(db, u.id, { action: 'security.github_link', entity: 'user', entityId: u.id, summary: `Compte GitHub relié (@${profile.login})` });
    return ctx.redirect('/admin/securite?github=relie');
  }

  const user = await db.user.findUnique({ where: { githubId } });
  if (!user || user.disabledAt) return back('github-non-relie');
  await createSession(db, ctx.cookies, user.id, 1, ctx.request);
  return ctx.redirect(user.totpEnabledAt ? '/admin/verification' : '/admin');
};
