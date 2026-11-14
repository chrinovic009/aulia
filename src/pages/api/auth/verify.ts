// Deuxième étape : code de l'application d'authentification, ou code de secours.
import { handle, json, readJson, str } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { decrypt, verifyTotp, normalizeRecoveryCode, sha256 } from '../../../lib/server/crypto.ts';
import { appSecret, elevateSession, loginLocked, recordLogin } from '../../../lib/server/auth.ts';
import { audit } from '../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u) throw new HttpError(401, 'Session expirée : reconnectez-vous.');
  const key = `2fa:${u.id}`;
  if (await loginLocked(db, key)) throw new HttpError(429, 'Trop d’essais. Réessayez dans 15 minutes.');
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  const body = await readJson(ctx);
  if (!body.recoveryCode && !user.totpSecret) throw new HttpError(409, 'Aucune application de codes n’est activée : utilisez GitHub ou un code de secours.');
  let ok = false;
  let usedRecovery = false;
  if (body.recoveryCode) {
    const hash = sha256(normalizeRecoveryCode(str(body.recoveryCode, 40)));
    const rc = await db.recoveryCode.findFirst({ where: { userId: u.id, codeHash: hash, usedAt: null } });
    if (rc) {
      await db.recoveryCode.update({ where: { id: rc.id }, data: { usedAt: new Date() } });
      ok = usedRecovery = true;
    }
  } else {
    ok = verifyTotp(decrypt(user.totpSecret!, appSecret()), str(body.code, 12));
  }
  await recordLogin(db, key, ok);
  if (!ok) throw new HttpError(401, 'Code incorrect.');
  await elevateSession(db, u.sessionId);
  if (usedRecovery) {
    const left = await db.recoveryCode.count({ where: { userId: u.id, usedAt: null } });
    await audit(db, u.id, { action: 'security.recovery_code', entity: 'user', entityId: u.id, summary: `Code de secours utilisé (${left} restants)` });
  }
  return json({ next: '/admin' });
});
