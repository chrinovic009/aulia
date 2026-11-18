/**
 * ANIMA — agenda : disponibilités du fondateur, créneaux libres, réservation sûre.
 * Les heures sont celles de Lubumbashi/Kolwezi (UTC+2, sans heure d'été).
 * La règle est dans le code : ANIMA ne peut réserver qu'un créneau réellement libre.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { env } from '../env.ts';

export const TZ = env('ANIMA_TZ') ?? 'Africa/Lubumbashi';
export const TZ_OFFSET = env('ANIMA_TZ_OFFSET') ?? '+02:00';
const OFFSET_MIN = (() => {
  const m = TZ_OFFSET.match(/^([+-])(\d{2}):(\d{2})$/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 120;
})();

export type Plage = [string, string]; // ["09:00", "12:00"]
export type Disponibilites = {
  /** 0 = dimanche … 6 = samedi */
  jours: Record<string, Plage[]>;
  dureeMin: number;
  delaiHeures: number;
  horizonJours: number;
  autoConfirmer: boolean;
  modeParDefaut: 'visio' | 'appel' | 'presentiel';
  lieu: string;
};
export type Indispo = { debut: string; fin: string; motif?: string };

export const DISPO_DEFAUT: Disponibilites = {
  jours: { '1': [['09:00', '12:00'], ['14:00', '17:00']], '2': [['09:00', '12:00'], ['14:00', '17:00']], '3': [['09:00', '12:00'], ['14:00', '17:00']], '4': [['09:00', '12:00'], ['14:00', '17:00']], '5': [['09:00', '12:00'], ['14:00', '16:00']] },
  dureeMin: 45,
  delaiHeures: 12,
  horizonJours: 21,
  autoConfirmer: true,
  modeParDefaut: 'visio',
  lieu: 'Visioconférence — le lien vous est envoyé par e-mail',
};

export async function getSetting<T>(db: PrismaClient, key: string, fallback: T): Promise<T> {
  const row = await db.animaSetting.findUnique({ where: { key } });
  return row ? ({ ...(fallback as object), ...(row.value as object) } as T) : fallback;
}
export async function setSetting(db: PrismaClient, key: string, value: unknown) {
  await db.animaSetting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: { value: value as Prisma.InputJsonValue } });
}
export const getDispo = (db: PrismaClient) => getSetting<Disponibilites>(db, 'disponibilites', DISPO_DEFAUT);
export async function getIndispos(db: PrismaClient): Promise<Indispo[]> {
  const row = await db.animaSetting.findUnique({ where: { key: 'indisponibilites' } });
  return Array.isArray(row?.value) ? (row!.value as Indispo[]) : [];
}

/** Date locale (AAAA-MM-JJ + HH:MM, heure de Lubumbashi) → instant UTC. */
export function localToDate(day: string, hhmm: string): Date {
  return new Date(`${day}T${hhmm}:00${TZ_OFFSET}`);
}
/** Instant → jour local AAAA-MM-JJ et jour de la semaine. */
function localDay(d: Date): { day: string; weekday: number } {
  const local = new Date(d.getTime() + OFFSET_MIN * 60_000);
  return { day: local.toISOString().slice(0, 10), weekday: local.getUTCDay() };
}

export function fmtSlot(d: Date, lang: 'fr' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(d) + (lang === 'fr' ? ' (heure de Lubumbashi)' : ' (Lubumbashi time)');
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

async function busy(db: PrismaClient, from: Date, to: Date, exceptId?: string) {
  const appts = await db.animaAppointment.findMany({
    where: { status: { in: ['propose', 'confirme'] }, startsAt: { gte: new Date(from.getTime() - 4 * 3600_000), lte: to }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { startsAt: true, durationMin: true },
  });
  const blocks = (await getIndispos(db)).map((b) => [new Date(b.debut).getTime(), new Date(b.fin).getTime()] as [number, number]);
  return [...appts.map((a) => [a.startsAt.getTime(), a.startsAt.getTime() + a.durationMin * 60_000] as [number, number]), ...blocks];
}

/** Créneaux libres à venir, répartis sur plusieurs jours (au plus `parJour` par jour). */
export async function freeSlots(db: PrismaClient, opts: { max?: number; parJour?: number; apres?: Date } = {}): Promise<Date[]> {
  const dispo = await getDispo(db);
  const now = Date.now();
  const start = Math.max(now + dispo.delaiHeures * 3600_000, opts.apres?.getTime() ?? 0);
  const end = now + dispo.horizonJours * 86_400_000;
  const taken = await busy(db, new Date(start), new Date(end));
  const out: Date[] = [];
  const perDay = new Map<string, number>();
  for (let t = start; t < end && out.length < (opts.max ?? 6); t += 86_400_000) {
    const { day, weekday } = localDay(new Date(t));
    for (const [a, b] of dispo.jours[String(weekday)] ?? []) {
      const s0 = localToDate(day, a).getTime(), s1 = localToDate(day, b).getTime();
      for (let s = s0; s + dispo.dureeMin * 60_000 <= s1; s += dispo.dureeMin * 60_000) {
        if (s < start) continue;
        if ((perDay.get(day) ?? 0) >= (opts.parJour ?? 2)) break;
        if (taken.some(([x, y]) => overlaps(s, s + dispo.dureeMin * 60_000, x, y))) continue;
        out.push(new Date(s));
        perDay.set(day, (perDay.get(day) ?? 0) + 1);
        if (out.length >= (opts.max ?? 6)) break;
      }
    }
  }
  return out;
}

/** Vérifie qu'un créneau respecte les disponibilités et n'est pas déjà pris. */
export async function checkSlot(db: PrismaClient, when: Date, exceptId?: string): Promise<{ ok: boolean; raison?: string; duree: number }> {
  const dispo = await getDispo(db);
  const d = dispo.dureeMin;
  if (Number.isNaN(when.getTime())) return { ok: false, raison: 'date illisible', duree: d };
  if (when.getTime() < Date.now() + dispo.delaiHeures * 3600_000) return { ok: false, raison: `trop proche : prévoir au moins ${dispo.delaiHeures} h à l'avance`, duree: d };
  if (when.getTime() > Date.now() + dispo.horizonJours * 86_400_000) return { ok: false, raison: 'trop lointain', duree: d };
  const { day, weekday } = localDay(when);
  const inRange = (dispo.jours[String(weekday)] ?? []).some(([a, b]) => when >= localToDate(day, a) && when.getTime() + d * 60_000 <= localToDate(day, b).getTime());
  if (!inRange) return { ok: false, raison: 'en dehors des disponibilités', duree: d };
  const taken = await busy(db, when, new Date(when.getTime() + d * 60_000), exceptId);
  if (taken.some(([x, y]) => overlaps(when.getTime(), when.getTime() + d * 60_000, x, y))) return { ok: false, raison: 'créneau déjà pris', duree: d };
  return { ok: true, duree: d };
}

/** Fichier agenda (.ics) pour l'e-mail de confirmation. */
export function icsFor(a: { id: string; startsAt: Date; durationMin: number; sujet: string; lieu: string }): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(a.startsAt.getTime() + a.durationMin * 60_000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AULIA//ANIMA//FR', 'BEGIN:VEVENT', `UID:${a.id}@aulia-holding.com`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(a.startsAt)}`, `DTEND:${f(end)}`, `SUMMARY:AULIA — ${a.sujet || 'Présentation'}`.slice(0, 120), `LOCATION:${a.lieu}`.slice(0, 200), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
