import { handle, json } from '../../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../../lib/server/db.ts';
import { audit } from '../../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u || (u.totpEnabled && u.aal < 2)) throw new HttpError(403, 'Deuxième étape requise.');
  await db.user.update({ where: { id: u.id }, data: { githubId: null, githubLogin: null } });
  await audit(db, u.id, { action: 'security.github_unlink', entity: 'user', entityId: u.id, summary: 'Compte GitHub délié' });
  return json({ ok: true });
});
