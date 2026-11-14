import type { APIRoute } from 'astro';
import { db } from '../../../../lib/server/db.ts';
import { publicOrigin } from '../../../../lib/server/http.ts';
import { env } from '../../../../lib/server/env.ts';
import { safeEqual } from '../../../../lib/server/crypto.ts';
import { createSession, elevateSession } from '../../../../lib/server/auth.ts';
import { hasSecondFactor } from '../../../../lib/server/authz.ts';
import { audit } from '../../../../lib/server/audit.ts';

/**
 * GitHub sert de DEUXIÈME ÉTAPE : après le mot de passe, la personne confirme son identité
 * avec son compte GitHub relié (lui-même protégé par la double vérification de GitHub).
 *  - mode « link »   : relier son compte GitHub (depuis la page Sécurité) ;
 *  - mode « stepup » : valider la deuxième étape après le mot de passe ;
 *  - mode « login »  : se connecter avec GitHub, réservé aux comptes dont la deuxième étape
 *                      est l'application de codes (sinon GitHub serait à la fois 1re et 2e étape).
 * GitHub ne crée jamais de compte et n'est jamais relié automatiquement.
 */
export const GET: APIRoute = async (ctx) => {
  const back = (q: string, to = '/admin/connexion') => ctx.redirect(`${to}?erreur=${q}`);
  const state = ctx.url.searchParams.get('state') ?? '';
  const code = ctx.url.searchParams.get('code');
  const expected = ctx.cookies.get('aulia_gh')?.value ?? '';
  ctx.cookies.delete('aulia_gh', { path: '/api/auth/github' });
  if (!db || !code || !expected || !safeEqual(state, expected)) return back('github-etat');
  const mode = expected.split('.')[0];

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env('GITHUB_CLIENT_ID'),
      client_secret: env('GITHUB_CLIENT_SECRET'),
      code,
      redirect_uri: `${publicOrigin(ctx)}/api/auth/github/callback`,
    }),
  });
  const token = ((await tokenRes.json().catch(() => ({}))) as { access_token?: string }).access_token;
  if (!token) return back('github-refus');
  const gh = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'aulia-portal', Accept: 'application/vnd.github+json' } });
  const profile = (await gh.json().catch(() => ({}))) as { id?: number; login?: string; two_factor_authentication?: boolean };
  if (!profile.id) return back('github-profil');
  const githubId = String(profile.id);
  const u = ctx.locals.user;

  if (mode === 'link') {
    if (!u) return back('github-session');
    // si une deuxième étape existe déjà, elle doit avoir été validée
    if (hasSecondFactor(u) && u.aal < 2) return back('github-session');
    // GitHub ne compte comme deuxième étape que s'il est lui-même protégé
    if (profile.two_factor_authentication === false) return ctx.redirect('/admin/securite?github=sans-2fa');
    const other = await db.user.findUnique({ where: { githubId } });
    if (other && other.id !== u.id) return ctx.redirect('/admin/securite?github=deja-utilise');
    await db.user.update({ where: { id: u.id }, data: { githubId, githubLogin: profile.login ?? null } });
    await elevateSession(db, u.sessionId);
    await audit(db, u.id, { action: 'security.github_link', entity: 'user', entityId: u.id, summary: `Compte GitHub relié comme deuxième étape (@${profile.login})` });
    return ctx.redirect('/admin/securite?github=relie');
  }

  if (mode === 'stepup') {
    if (!u) return back('github-session');
    const user = await db.user.findUnique({ where: { id: u.id } });
    if (!user?.githubId || user.githubId !== githubId) return back('github-autre-compte', '/admin/verification');
    await elevateSession(db, u.sessionId);
    return ctx.redirect('/admin');
  }

  const user = await db.user.findUnique({ where: { githubId } });
  if (!user || user.disabledAt) return back('github-non-relie');
  if (!user.totpEnabledAt) return back('github-mot-de-passe');
  await createSession(db, ctx.cookies, user.id, 1, ctx.request);
  return ctx.redirect('/admin/verification');
};
