// Activation : la personne saisit le premier code affiché par son application.
import { handle, json, readJson, str } from '../../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../../lib/server/db.ts';
import { decrypt, newRecoveryCodes, normalizeRecoveryCode, sha256, verifyTotp } from '../../../../lib/server/crypto.ts';
import { appSecret, elevateSession } from '../../../../lib/server/auth.ts';
import { audit } from '../../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u) throw new HttpError(401, 'Connectez-vous.');
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!user.totpPending) throw new HttpError(409, 'Aucune clé en préparation : recommencez.');
  const secret = decrypt(user.totpPending, appSecret());
  const body = await readJson(ctx);
  if (!verifyTotp(secret, str(body.code, 12))) throw new HttpError(401, 'Code incorrect : vérifiez l’heure de votre téléphone et réessayez.');
  const codes = newRecoveryCodes();
  await db.$transaction([
    db.user.update({ where: { id: u.id }, data: { totpSecret: user.totpPending, totpPending: null, totpEnabledAt: new Date() } }),
    db.recoveryCode.deleteMany({ where: { userId: u.id } }),
    db.recoveryCode.createMany({ data: codes.map((c) => ({ userId: u.id, codeHash: sha256(normalizeRecoveryCode(c)) })) }),
    db.session.deleteMany({ where: { userId: u.id, id: { not: u.sessionId } } }),
  ]);
  await elevateSession(db, u.sessionId);
  await audit(db, u.id, { action: 'security.2fa_enabled', entity: 'user', entityId: u.id, summary: 'Double vérification activée' });
  return json({ recoveryCodes: codes });
});
