// Formulaire de contact du site : enregistré dans la base, transmis à la filiale concernée.
import { handle, json, readJson, str, publicOrigin } from '../../lib/server/http.ts';
import { requireDb, HttpError } from '../../lib/server/db.ts';
import { normEmail, validEmail, loginLocked, recordLogin } from '../../lib/server/auth.ts';
import { orgForTopic, visitorHash } from '../../lib/server/visitors.ts';
import { contactAlertMail, sendMail } from '../../lib/server/mail.ts';
import { env } from '../../lib/server/env.ts';

const TOPICS = ['presentation', 'care', 'vigil', 'flow', 'vr', 'anima', 'partnership', 'research', 'investment', 'other'];

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const b = await readJson(ctx, 20_000);
  // champ piège invisible : les robots le remplissent, les humains non
  if (b.website) return json({ ok: true });
  const name = str(b.name, 120);
  const email = normEmail(b.email);
  const message = str(b.message, 5000);
  const topic = TOPICS.includes(String(b.topic)) ? String(b.topic) : 'other';
  const lang = b.lang === 'fr' ? 'fr' : 'en';
  if (name.length < 2 || !validEmail(email) || message.length < 5 || b.consent !== true) {
    throw new HttpError(422, lang === 'fr' ? 'Complétez les champs obligatoires et acceptez la politique de confidentialité.' : 'Please complete the required fields and accept the privacy policy.');
  }
  const key = `contact:${visitorHash(ctx.request)}`;
  if (await loginLocked(db, key)) throw new HttpError(429, lang === 'fr' ? 'Trop de messages envoyés. Réessayez plus tard.' : 'Too many messages. Please try again later.');
  await recordLogin(db, key, false);

  const orgId = await orgForTopic(db, topic);
  if (!orgId) throw new HttpError(503, 'Organisation indisponible.');
  const msg = await db.contactMessage.create({
    data: { orgId, topic, name, email, message, lang, organization: str(b.organization, 160) || null, phone: str(b.phone, 40) || null },
    include: { org: true },
  });

  // alertes : boîte de contact du groupe + direction de la filiale concernée
  const url = `${publicOrigin(ctx)}/admin/messages?org=${orgId}`;
  const to = new Set<string>();
  const inbox = env('CONTACT_INBOX');
  if (inbox) to.add(inbox);
  const leads = await db.membership.findMany({
    where: { orgId, status: 'ACTIVE', role: { permissions: { has: 'messages.handle' } } },
    select: { user: { select: { email: true } } },
  });
  leads.forEach((l) => to.add(l.user.email));
  await Promise.all([...to].map((addr) => sendMail(contactAlertMail(addr, msg.org.name, { name, email, topic, message }, url))));
  return json({ ok: true });
});
