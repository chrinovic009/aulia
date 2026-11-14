// Préparation de l'application d'authentification : nouvelle clé (pas encore active).
import { handle, json } from '../../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../../lib/server/db.ts';
import { encrypt, newTotpSecret, otpauthUri } from '../../../../lib/server/crypto.ts';
import { appSecret } from '../../../../lib/server/auth.ts';
import { qrSvg } from '../../../../lib/server/qr.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u) throw new HttpError(401, 'Connectez-vous.');
  // remplacer une clé déjà active exige la deuxième étape
  if (u.totpEnabled && u.aal < 2) throw new HttpError(403, 'Validez d’abord votre code actuel.');
  const secret = newTotpSecret();
  await db.user.update({ where: { id: u.id }, data: { totpPending: encrypt(secret, appSecret()) } });
  const uri = otpauthUri(secret, u.email);
  return json({ secret: secret.replace(/(.{4})/g, '$1 ').trim(), uri, qr: qrSvg(uri, 6) });
});
