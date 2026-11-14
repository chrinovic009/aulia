import { handle, json, readJson } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { hashPassword, passwordProblem, verifyPassword } from '../../../lib/server/crypto.ts';
import { audit } from '../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u) throw new HttpError(401, 'Connectez-vous.');
  const body = await readJson(ctx);
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await verifyPassword(String(body.current ?? ''), user.passwordHash))) throw new HttpError(401, 'Mot de passe actuel incorrect.');
  const pb = passwordProblem(String(body.next ?? ''));
  if (pb) throw new HttpError(422, pb);
  await db.$transaction([
    db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(String(body.next)) } }),
    db.session.deleteMany({ where: { userId: u.id, id: { not: u.sessionId } } }),
  ]);
  await audit(db, u.id, { action: 'security.password_change', entity: 'user', entityId: u.id, summary: 'Mot de passe modifié' });
  return json({ ok: true });
});
