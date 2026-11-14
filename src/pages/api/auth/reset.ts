// Récupération : code reçu à l'adresse principale (ou de secours), puis nouveau mot de passe.
import { handle, json, readJson, str } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { hashPassword, passwordProblem } from '../../../lib/server/crypto.ts';
import { createSession, normEmail, verifyOtp } from '../../../lib/server/auth.ts';
import { audit } from '../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const body = await readJson(ctx);
  const email = normEmail(body.email);
  const password = String(body.password ?? '');
  const pb = passwordProblem(password);
  if (pb) throw new HttpError(422, pb);
  const ok = await verifyOtp(db, email, 'RECOVERY', str(body.code, 12));
  if (!ok) throw new HttpError(401, 'Code incorrect ou expiré. Demandez un nouveau code.');
  const user = await db.user.findFirst({ where: { OR: [{ email }, { recoveryEmail: email }], disabledAt: null } });
  if (!user) throw new HttpError(404, 'Compte introuvable.');
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await audit(db, user.id, { action: 'security.password_reset', entity: 'user', entityId: user.id, summary: `Mot de passe réinitialisé par code envoyé à ${email === user.email ? 'l’adresse principale' : 'l’adresse de secours'}` });
  await createSession(db, ctx.cookies, user.id, 1, ctx.request);
  // la deuxième étape reste exigée : le mot de passe seul ne suffit pas
  return json({ next: user.totpEnabledAt || user.githubId ? '/admin/verification' : '/admin' });
});
