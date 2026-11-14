// Création d'un compte : adresse prouvée par le code, puis nom et mot de passe.
import { handle, json, readJson, str } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { hashPassword, passwordProblem } from '../../../lib/server/crypto.ts';
import { createSession, founderEmail, founderExists, normEmail, verifyOtp } from '../../../lib/server/auth.ts';
import { acceptPendingInvitations } from '../../../lib/server/people.ts';
import { importCatalog, invalidateLive } from '../../../lib/server/content.ts';
import { audit } from '../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const body = await readJson(ctx);
  const email = normEmail(body.email);
  const name = str(body.name, 100);
  const password = String(body.password ?? '');
  if (name.length < 2) throw new HttpError(422, 'Indiquez votre nom complet.');
  const pb = passwordProblem(password);
  if (pb) throw new HttpError(422, pb);
  if (await db.user.findUnique({ where: { email } })) throw new HttpError(409, 'Un compte existe déjà avec cette adresse.');

  const bootstrap = !(await founderExists(db)) && email === founderEmail();
  const ok = await verifyOtp(db, email, bootstrap ? 'BOOTSTRAP' : 'JOIN', str(body.code, 12));
  if (!ok) throw new HttpError(401, 'Code incorrect ou expiré. Demandez un nouveau code.');

  const passwordHash = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email, name, passwordHash, emailVerifiedAt: new Date() } });
    if (bootstrap) {
      const holding = await tx.organization.findFirstOrThrow({ where: { kind: 'HOLDING' } });
      await tx.membership.create({ data: { userId: u.id, orgId: holding.id, roleCode: 'founder', title: 'Fondateur' } });
      const n = await importCatalog(tx, u.id);
      await audit(tx, u.id, { orgId: holding.id, action: 'founder.bootstrap', entity: 'user', entityId: u.id, summary: `Compte fondateur créé — ${n} blocs du site importés` });
    }
    return u;
  }, { timeout: 30_000 });
  if (bootstrap) invalidateLive();
  else await acceptPendingInvitations(db, user.id, email);

  await createSession(db, ctx.cookies, user.id, 1, ctx.request);
  return json({ next: '/admin/securite?bienvenue=1' });
});
