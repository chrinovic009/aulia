/**
 * ANIMA — actions de l'espace interne : traiter les demandes, tenir l'agenda,
 * régler les disponibilités, compléter la mémoire des personnes.
 * Toute suite donnée ici est ensuite rapportée par ANIMA au visiteur (et par e-mail si demandé).
 */
import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../db.ts';
import { DISPO_DEFAUT, fmtSlot, getDispo, getIndispos, localToDate, setSetting, type Disponibilites, type Plage } from './agenda.ts';
import { mailVisitor } from './memoire.ts';
import { mailReformule } from './suivi.ts';

const s = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max);
export const REQUEST_STATUS = ['nouvelle', 'en_cours', 'acceptee', 'refusee', 'traitee'];
export const APPT_STATUS = ['propose', 'confirme', 'annule', 'effectue'];
export const MODES = ['visio', 'appel', 'presentiel'];

/** « 2026-11-20T10:30 » (heure de Lubumbashi, champ datetime-local) → instant. */
function fromLocal(v: unknown): Date | null {
  const m = s(v, 20).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? localToDate(m[1], m[2]) : null;
}

export async function updateRequest(db: PrismaClient, b: Record<string, unknown>) {
  const r = await db.animaRequest.findUnique({ where: { id: s(b.id, 40) }, include: { contact: true } });
  if (!r) throw new HttpError(404, 'Demande introuvable.');
  const status = REQUEST_STATUS.includes(String(b.status)) ? String(b.status) : r.status;
  const reply = b.reply === undefined ? r.reply : s(b.reply, 3000);
  await db.animaRequest.update({
    where: { id: r.id },
    data: { status, reply, ...(reply !== r.reply ? { replyDelivered: false } : {}), handledAt: new Date() },
  });
  let appt = null;
  const when = fromLocal(b.rdv);
  if (when) {
    if (when.getTime() < Date.now()) throw new HttpError(422, 'La date du rendez-vous est déjà passée.');
    const dispo = await getDispo(db);
    const mode = MODES.includes(String(b.mode)) ? String(b.mode) : dispo.modeParDefaut;
    appt = await db.animaAppointment.create({
      data: {
        contactId: r.contactId, requestId: r.id, startsAt: when, durationMin: Number(b.duree) > 0 ? Math.min(480, Number(b.duree)) : dispo.dureeMin,
        mode, lieu: s(b.lieu, 300) || (mode === 'visio' ? dispo.lieu : ''), sujet: r.sujet, status: 'confirme', createdBy: 'fondateur', newsDelivered: false,
      },
    });
    if (status === 'nouvelle' || status === 'en_cours') await db.animaRequest.update({ where: { id: r.id }, data: { status: 'acceptee' } });
  }
  let mail: { ok: boolean; error?: string } | null = null;
  if (b.mail === true && (reply || appt)) {
    const corps = reply ? await mailReformule(db, r.contactId, r.sujet, reply) : '';
    const parts = [corps, appt ? `Rendez-vous fixé : ${fmtSlot(appt.startsAt, 'fr')} (${appt.durationMin} min)${appt.lieu ? `\n${appt.lieu}` : ''}` : ''].filter(Boolean);
    mail = await mailVisitor(db, r.contactId, `réponse à votre demande « ${r.sujet} »`, parts.join('\n\n'));
  }
  return { ok: true, mailError: mail && !mail.ok ? `E-mail non envoyé : ${mail.error}` : undefined };
}

export async function updateAppointment(db: PrismaClient, b: Record<string, unknown>) {
  const a = await db.animaAppointment.findUnique({ where: { id: s(b.id, 40) } });
  if (!a) throw new HttpError(404, 'Rendez-vous introuvable.');
  const status = APPT_STATUS.includes(String(b.status)) ? String(b.status) : a.status;
  const when = fromLocal(b.quand);
  if (when && when.getTime() < Date.now()) throw new HttpError(422, 'La nouvelle date est déjà passée.');
  const changed = status !== a.status || (when && when.getTime() !== a.startsAt.getTime());
  const out = await db.animaAppointment.update({
    where: { id: a.id },
    data: {
      status, ...(when ? { startsAt: when } : {}), ...(b.notes !== undefined ? { notes: s(b.notes, 2000) } : {}),
      ...(b.lieu !== undefined ? { lieu: s(b.lieu, 300) } : {}), ...(changed ? { newsDelivered: false } : {}),
    },
  });
  let mail: { ok: boolean; error?: string } | null = null;
  if (b.mail === true && changed) {
    const txt = status === 'annule' ? `Votre rendez-vous « ${out.sujet} » du ${fmtSlot(a.startsAt, 'fr')} est annulé. ANIMA peut vous proposer un autre créneau.`
      : `Votre rendez-vous « ${out.sujet} » : ${fmtSlot(out.startsAt, 'fr')} (${out.durationMin} min) — ${status === 'confirme' ? 'confirmé' : status}.${out.lieu ? `\n${out.lieu}` : ''}`;
    mail = await mailVisitor(db, a.contactId, 'votre rendez-vous', txt);
  }
  return { ok: true, mailError: mail && !mail.ok ? `E-mail non envoyé : ${mail.error}` : undefined };
}

export async function createAppointment(db: PrismaClient, b: Record<string, unknown>) {
  const when = fromLocal(b.quand);
  if (!when) throw new HttpError(422, 'Indiquez la date et l’heure.');
  let contactId = s(b.contactId, 40);
  if (!contactId) {
    const nom = s(b.nom, 120), email = s(b.email, 200).toLowerCase(), phone = s(b.phone, 40);
    if (!nom) throw new HttpError(422, 'Choisissez une personne ou indiquez un nom.');
    contactId = (await db.animaContact.create({ data: { nom, emails: email ? [email] : [], phones: phone ? [phone] : [] } })).id;
  }
  const dispo = await getDispo(db);
  const mode = MODES.includes(String(b.mode)) ? String(b.mode) : dispo.modeParDefaut;
  await db.animaAppointment.create({
    data: {
      contactId, startsAt: when, durationMin: Number(b.duree) > 0 ? Math.min(480, Number(b.duree)) : dispo.dureeMin, mode,
      lieu: s(b.lieu, 300) || (mode === 'visio' ? dispo.lieu : ''), sujet: s(b.sujet, 200) || 'Rendez-vous AULIA', status: 'confirme', createdBy: 'fondateur', newsDelivered: false,
    },
  });
  return { ok: true };
}

function parsePlages(v: unknown): Plage[] {
  return s(v, 200).split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((x) => {
    const m = x.match(/^(\d{1,2})[:h](\d{2})\s*[-–à]\s*(\d{1,2})[:h](\d{2})$/);
    if (!m) throw new HttpError(422, `Plage illisible : « ${x} ». Exemple : 09:00-12:00, 14:00-17:00`);
    const p = (h: string, mi: string) => `${h.padStart(2, '0')}:${mi}`;
    return [p(m[1], m[2]), p(m[3], m[4])] as Plage;
  });
}

export async function saveDispo(db: PrismaClient, b: Record<string, unknown>) {
  const jours: Record<string, Plage[]> = {};
  for (let d = 0; d < 7; d++) {
    const plages = parsePlages(b[`jour${d}`]);
    if (plages.length) jours[String(d)] = plages;
  }
  const n = (v: unknown, def: number, min: number, max: number) => (Number.isFinite(Number(v)) && String(v) !== '' ? Math.min(max, Math.max(min, Number(v))) : def);
  const value: Disponibilites = {
    jours,
    dureeMin: n(b.dureeMin, DISPO_DEFAUT.dureeMin, 15, 240),
    delaiHeures: n(b.delaiHeures, DISPO_DEFAUT.delaiHeures, 0, 168),
    horizonJours: n(b.horizonJours, DISPO_DEFAUT.horizonJours, 1, 90),
    autoConfirmer: b.autoConfirmer === true,
    modeParDefaut: (MODES.includes(String(b.modeParDefaut)) ? String(b.modeParDefaut) : 'visio') as Disponibilites['modeParDefaut'],
    lieu: s(b.lieu, 300) || DISPO_DEFAUT.lieu,
  };
  await setSetting(db, 'disponibilites', value);
  return { ok: true };
}

export async function addIndispo(db: PrismaClient, b: Record<string, unknown>) {
  const debut = fromLocal(b.debut), fin = fromLocal(b.fin);
  if (!debut || !fin || fin <= debut) throw new HttpError(422, 'Indiquez un début et une fin valides.');
  const list = await getIndispos(db);
  list.push({ debut: debut.toISOString(), fin: fin.toISOString(), motif: s(b.motif, 120) });
  await setSetting(db, 'indisponibilites', list.filter((x) => new Date(x.fin).getTime() > Date.now()).slice(-50));
  return { ok: true };
}

export async function removeIndispo(db: PrismaClient, b: Record<string, unknown>) {
  const list = await getIndispos(db);
  list.splice(Number(b.index), 1);
  await setSetting(db, 'indisponibilites', list);
  return { ok: true };
}

export async function updateContact(db: PrismaClient, b: Record<string, unknown>) {
  const c = await db.animaContact.findUnique({ where: { id: s(b.id, 40) } });
  if (!c) throw new HttpError(404, 'Personne introuvable.');
  await db.animaContact.update({
    where: { id: c.id },
    data: {
      ...(b.nom !== undefined ? { nom: s(b.nom, 120) } : {}), ...(b.organisation !== undefined ? { organisation: s(b.organisation, 160) } : {}),
      ...(b.memo !== undefined ? { memo: s(b.memo, 1500) } : {}), ...(b.notes !== undefined ? { notes: s(b.notes, 1500) } : {}),
    },
  });
  return { ok: true };
}
