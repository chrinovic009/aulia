import { handle, json, readJson, str } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { verifyPassword } from '../../../lib/server/crypto.ts';
import { createSession, loginLocked, normEmail, recordLogin } from '../../../lib/server/auth.ts';
import { acceptPendingInvitations } from '../../../lib/server/people.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const body = await readJson(ctx);
  const email = normEmail(body.email);
  const password = str(body.password, 200);
  if (await loginLocked(db, email)) throw new HttpError(429, 'Trop d’essais. Réessayez dans 15 minutes ou réinitialisez votre mot de passe.');
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  await recordLogin(db, email, ok && !!user && !user.disabledAt);
  if (!user || !ok || user.disabledAt) throw new HttpError(401, 'Adresse ou mot de passe incorrect.');
  await acceptPendingInvitations(db, user.id, user.email);
  await createSession(db, ctx.cookies, user.id, 1, ctx.request);
  return json({ next: user.totpEnabledAt ? '/admin/verification' : '/admin' });
});
