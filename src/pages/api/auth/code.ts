// Envoi d'un code à 6 chiffres : création d'accès (invitation / fondateur) ou récupération.
// La réponse est la même que l'adresse soit connue ou non (aucune information divulguée).
import { handle, json, readJson } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { founderEmail, founderExists, issueOtp, normEmail, validEmail } from '../../../lib/server/auth.ts';

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const body = await readJson(ctx);
  const email = normEmail(body.email);
  if (!validEmail(email)) throw new HttpError(422, 'Adresse e-mail invalide.');
  const generic = json({ ok: true, message: 'Si cette adresse est concernée, un code à 6 chiffres vient d’y être envoyé. Il est valable 10 minutes.' });

  if (body.purpose === 'recovery') {
    const user = await db.user.findFirst({ where: { OR: [{ email }, { recoveryEmail: email }], disabledAt: null } });
    if (!user) return generic;
    const r = await issueOtp(db, email, 'RECOVERY');
    if (!r.ok) throw new HttpError(429, r.error);
    return generic;
  }

  // création d'accès
  const already = await db.user.findUnique({ where: { email } });
  if (already) throw new HttpError(409, 'Un compte existe déjà avec cette adresse : connectez-vous (ou utilisez « mot de passe oublié »).');
  const bootstrap = !(await founderExists(db)) && email === founderEmail();
  const invited = await db.invitation.count({ where: { email, status: 'PENDING', expiresAt: { gt: new Date() } } });
  if (!bootstrap && !invited) return generic;
  const r = await issueOtp(db, email, bootstrap ? 'BOOTSTRAP' : 'JOIN');
  if (!r.ok) throw new HttpError(429, r.error);
  return generic;
});
