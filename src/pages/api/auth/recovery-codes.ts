// Nouveaux codes de secours (les anciens cessent de fonctionner).
import { handle, json } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { newRecoveryCodes, normalizeRecoveryCode, sha256 } from '../../../lib/server/crypto.ts';
import { audit } from '../../../lib/server/audit.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u || !u.totpEnabled || u.aal < 2) throw new HttpError(403, 'Deuxième étape requise.');
  const codes = newRecoveryCodes();
  await db.$transaction([
    db.recoveryCode.deleteMany({ where: { userId: u.id } }),
    db.recoveryCode.createMany({ data: codes.map((c) => ({ userId: u.id, codeHash: sha256(normalizeRecoveryCode(c)) })) }),
  ]);
  await audit(db, u.id, { action: 'security.recovery_codes', entity: 'user', entityId: u.id, summary: 'Nouveaux codes de secours générés' });
  return json({ recoveryCodes: codes });
});
