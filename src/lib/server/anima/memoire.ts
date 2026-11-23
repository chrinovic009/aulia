/**
 * ANIMA — mémoire des personnes : reconnaître un visiteur d'une visite à l'autre,
 * lui transmettre les suites données par le fondateur, et rappeler ses rendez-vous.
 */
import type { PrismaClient } from '@prisma/client';
import { redact, type Contacts } from './governance.ts';
import { fmtSlot } from './agenda.ts';
import { sendMail } from '../mail.ts';

type Lang = 'fr' | 'en';

/** Retrouve la personne : par l'appareil (visitorId), sinon par l'e-mail ou le téléphone laissés. */
export async function findContact(db: PrismaClient, visitorId: string, contacts: Contacts) {
  let c = await db.animaContact.findFirst({ where: { visitorIds: { has: visitorId } } });
  if (!c && contacts.emails.length) c = await db.animaContact.findFirst({ where: { emails: { hasSome: contacts.emails.map((e) => e.toLowerCase()) } } });
  if (!c && contacts.phones.length) {
    const digits = contacts.phones.map((p) => p.replace(/\D/g, '').slice(-9));
    const all = await db.animaContact.findMany({ where: { phones: { isEmpty: false } }, select: { id: true, phones: true }, take: 500 });
    const hit = all.find((x) => x.phones.some((p) => digits.includes(p.replace(/\D/g, '').slice(-9))));
    if (hit) c = await db.animaContact.findUnique({ where: { id: hit.id } });
  }
  return c;
}

/** Crée ou complète la fiche de la personne et la relie à la conversation. */
export async function ensureContact(db: PrismaClient, p: { conversationId: string; visitorId: string; contacts: Contacts; lang: Lang; data?: Partial<Record<'nom' | 'organisation' | 'fonction' | 'secteur', string>> }) {
  const existing = await findContact(db, p.visitorId, p.contacts);
  const clean = Object.fromEntries(Object.entries(p.data ?? {}).filter(([, v]) => v));
  const merge = (a: string[], b: string[]) => [...new Set([...a, ...b])].slice(-5);
  const emails = p.contacts.emails.map((e) => e.toLowerCase());
  const c = existing
    ? await db.animaContact.update({
        where: { id: existing.id },
        data: { ...clean, lang: p.lang, lastSeenAt: new Date(), visitorIds: merge(existing.visitorIds, [p.visitorId]), emails: merge(existing.emails, emails), phones: merge(existing.phones, p.contacts.phones) },
      })
    : await db.animaContact.create({ data: { ...clean, lang: p.lang, visitorIds: [p.visitorId], emails, phones: p.contacts.phones } });
  await db.animaConversation.update({ where: { id: p.conversationId }, data: { contactId: c.id } });
  return c;
}

const STATUT_DEMANDE: Record<string, string> = { nouvelle: 'reçue, pas encore traitée', en_cours: 'en cours de traitement', acceptee: 'acceptée', refusee: 'déclinée', traitee: 'traitée' };
const STATUT_RDV: Record<string, string> = { propose: 'en attente de confirmation par AULIA', confirme: 'confirmé', annule: 'annulé', effectue: 'effectué' };

/** Ce qu'ANIMA sait de la personne : injecté dans ses consignes. */
export async function memoryContext(db: PrismaClient, contactId: string, currentConversationId: string, lang: Lang): Promise<{ text: string; requestIds: string[]; appointmentIds: string[] }> {
  const c = await db.animaContact.findUnique({ where: { id: contactId } });
  if (!c) return { text: '', requestIds: [], appointmentIds: [] };
  const [requests, appts, past] = await Promise.all([
    db.animaRequest.findMany({ where: { contactId }, orderBy: { createdAt: 'desc' }, take: 6 }),
    db.animaAppointment.findMany({ where: { contactId, OR: [{ startsAt: { gte: new Date(Date.now() - 86_400_000) } }, { newsDelivered: false }] }, orderBy: { startsAt: 'asc' }, take: 5 }),
    db.animaMessage.findMany({ where: { conversation: { contactId, id: { not: currentConversationId } } }, orderBy: { id: 'desc' }, take: 8 }),
  ]);
  const lines: string[] = [];
  const who = [c.nom, c.fonction, c.organisation, c.secteur].filter(Boolean).join(' · ');
  lines.push(`Personne déjà connue : ${who || 'nom non communiqué'}. Contact enregistré : ${c.emails.length || c.phones.length ? 'oui' : 'non'}.`);
  if (c.memo) lines.push(`Ce que tu as retenu : ${c.memo}`);
  if (c.notes) lines.push(`Consignes internes du fondateur à son sujet (ne pas citer mot pour mot) : ${c.notes}`);
  if (past.length) lines.push('Fin de votre dernier échange :\n' + past.reverse().map((m) => `${m.role === 'user' ? 'Visiteur' : 'ANIMA'} : ${m.content.slice(0, 220)}`).join('\n'));
  const newsReq = requests.filter((r) => r.reply && !r.replyDelivered);
  for (const r of requests) {
    lines.push(`Demande « ${r.sujet} » : ${STATUT_DEMANDE[r.status] ?? r.status}.${r.details ? ` Ce que la personne demandait : ${r.details.slice(0, 400)}` : ''}${r.reply ? `\n  Note du fondateur${r.replyDelivered ? ' (déjà transmise, ne la répète pas sauf si on te le demande)' : ' — À REFORMULER ET TRANSMETTRE MAINTENANT'} : ${r.reply}` : ''}`);
  }
  // contexte d'origine des réponses à transmettre : la conversation où la demande a été faite
  for (const r of newsReq) {
    if (!r.conversationId || r.conversationId === currentConversationId) continue;
    const orig = await db.animaMessage.findMany({ where: { conversationId: r.conversationId }, orderBy: { id: 'desc' }, take: 10 });
    if (orig.length) lines.push(`Échange où « ${r.sujet} » a été demandé :\n` + orig.reverse().map((m) => `${m.role === 'user' ? 'Visiteur' : 'ANIMA'} : ${m.content.slice(0, 300)}`).join('\n'));
  }
  for (const a of appts) {
    lines.push(`Rendez-vous « ${a.sujet || 'présentation'} » : ${fmtSlot(a.startsAt, lang)}, ${a.mode}${a.lieu ? `, ${a.lieu}` : ''} — ${STATUT_RDV[a.status] ?? a.status}${a.newsDelivered ? '' : ' — NOUVEAU : à annoncer'}.`);
  }
  return {
    // aucune coordonnée ne part vers le moteur de langage
    text: redact(lines.join('\n'), lang),
    requestIds: newsReq.map((r) => r.id),
    appointmentIds: appts.filter((a) => !a.newsDelivered).map((a) => a.id),
  };
}

export async function markDelivered(db: PrismaClient, requestIds: string[], appointmentIds: string[]) {
  if (requestIds.length) await db.animaRequest.updateMany({ where: { id: { in: requestIds } }, data: { replyDelivered: true } });
  if (appointmentIds.length) await db.animaAppointment.updateMany({ where: { id: { in: appointmentIds } }, data: { newsDelivered: true } });
}

/** Accueil personnalisé à l'ouverture de l'orbe (sans appel au modèle : rapide et sûr). */
export async function greetingFor(db: PrismaClient, visitorId: string, lang: Lang): Promise<string | null> {
  const c = await db.animaContact.findFirst({ where: { visitorIds: { has: visitorId } } });
  if (!c) return null;
  const name = c.nom ? ` ${c.nom.split(' ').slice(0, 2).join(' ')}` : '';
  const parts: string[] = [lang === 'fr' ? `Bon retour${name}. Ravi de vous retrouver.` : `Welcome back${name}. Good to see you again.`];
  const reqs = await db.animaRequest.findMany({ where: { contactId: c.id, reply: { not: '' }, replyDelivered: false }, orderBy: { updatedAt: 'desc' }, take: 2 });
  // sans le moteur, on n'affiche jamais la note brute du fondateur : ANIMA la reformulera au prochain message
  for (const r of reqs) parts.push(lang === 'fr' ? `J'ai du nouveau au sujet de « ${r.sujet} ». Voulez-vous que je vous explique ce que cela change pour vous ?` : `I have news about “${r.sujet}”. Shall I explain what it means for you?`);
  const appts = await db.animaAppointment.findMany({ where: { contactId: c.id, newsDelivered: false }, orderBy: { startsAt: 'asc' }, take: 2 });
  for (const a of appts) {
    const when = fmtSlot(a.startsAt, lang);
    parts.push(
      a.status === 'annule' ? (lang === 'fr' ? `Votre rendez-vous du ${when} a été annulé. Je peux vous proposer un autre créneau.` : `Your appointment on ${when} was cancelled. I can offer another slot.`)
        : a.status === 'confirme' ? (lang === 'fr' ? `Votre rendez-vous est confirmé : ${when}${a.lieu ? `, ${a.lieu}` : ''}.` : `Your appointment is confirmed: ${when}${a.lieu ? `, ${a.lieu}` : ''}.`)
          : (lang === 'fr' ? `Votre demande de rendez-vous pour le ${when} est en attente de confirmation.` : `Your appointment request for ${when} is awaiting confirmation.`),
    );
  }
  if (!reqs.length && !appts.length) {
    const next = await db.animaAppointment.findFirst({ where: { contactId: c.id, status: 'confirme', startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } });
    parts.push(next ? (lang === 'fr' ? `Pour rappel, nous avons rendez-vous ${fmtSlot(next.startsAt, lang)}. Que puis-je faire pour vous ?` : `As a reminder, we meet ${fmtSlot(next.startsAt, lang)}. How can I help?`)
      : (lang === 'fr' ? 'Que puis-je faire pour vous aujourd\'hui ?' : 'How can I help you today?'));
  }
  await markDelivered(db, [], appts.map((a) => a.id));
  return parts.join('\n\n');
}

/** Informe le visiteur par e-mail (réponse du fondateur, rendez-vous fixé ou modifié). */
export async function mailVisitor(db: PrismaClient, contactId: string, subject: string, text: string) {
  const c = await db.animaContact.findUnique({ where: { id: contactId } });
  const to = c?.emails[0];
  if (!to) return { ok: false, error: 'aucun e-mail connu pour cette personne' };
  return sendMail({ to, subject: `AULIA — ${subject}`, text: `${c!.nom ? `Bonjour ${c!.nom},` : 'Bonjour,'}\n\n${text}\n\nVous pouvez aussi en parler à ANIMA sur https://www.aulia-holding.com\n\nL'équipe AULIA` });
}
