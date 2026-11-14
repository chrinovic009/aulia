// Adresse de secours : vérifiée par un code à 6 chiffres envoyé à cette adresse.
import { handle, json, readJson, str } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { issueOtp, normEmail, validEmail, verifyOtp } from '../../../lib/server/auth.ts';
import { audit } from '../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u || (u.totpEnabled && u.aal < 2)) throw new HttpError(403, 'Deuxième étape requise.');
  const body = await readJson(ctx);
  if (body.remove) {
    await db.user.update({ where: { id: u.id }, data: { recoveryEmail: null } });
    return json({ ok: true });
  }
  const email = normEmail(body.email);
  if (!validEmail(email) || email === u.email) throw new HttpError(422, 'Indiquez une autre adresse valide.');
  const taken = await db.user.findFirst({ where: { OR: [{ email }, { recoveryEmail: email }], id: { not: u.id } } });
  if (taken) throw new HttpError(409, 'Cette adresse est déjà utilisée par un autre compte.');
  const key = `secours:${u.id}:${email}`;
  if (!body.code) {
    const r = await issueOtp(db, key, 'RECOVERY', email);
    if (!r.ok) throw new HttpError(429, r.error);
    return json({ sent: true });
  }
  if (!(await verifyOtp(db, key, 'RECOVERY', str(body.code, 12)))) throw new HttpError(401, 'Code incorrect ou expiré.');
  await db.user.update({ where: { id: u.id }, data: { recoveryEmail: email } });
  await audit(db, u.id, { action: 'security.recovery_email', entity: 'user', entityId: u.id, summary: 'Adresse de secours vérifiée' });
  return json({ ok: true });
});
