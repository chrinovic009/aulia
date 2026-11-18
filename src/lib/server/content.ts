/**
 * Contenu du site public : chargement de la version en ligne, brouillons, soumission,
 * validation par le fondateur, mise en ligne.
 *
 * Circuit : brouillon → soumis → (validé = publié) ou refusé (avec commentaire).
 * Le fondateur (ou un validateur délégué) peut aussi publier directement ses propres modifications.
 */
import type { Locale, Prisma, PrismaClient } from '@prisma/client';
import type { LiveContent } from '../../data/site.ts';
import { blockCatalog } from '../../data/blocks.ts';
import { db } from './db.ts';
import { HttpError } from './db.ts';
import { audit } from './audit.ts';
import { can, canPublish, type UserCtx } from './authz.ts';
import { shapeProblem } from './shape.ts';
import { applySiteUpdates } from './site-updates.ts';

// ───────────────────────── lecture publique ─────────────────────────

type LiveCache = { at: number; live: LiveContent; since: number };
let cache: LiveCache | null = null;
const TTL = 4000;

/** Contenu en ligne (mis en cache quelques secondes par instance). Ne lève jamais d'erreur. */
export async function loadLive(minSince = 0): Promise<{ live?: LiveContent; since: number }> {
  if (!db) return { since: 0 };
  // corrections de contenu livrées avec le code : appliquées une fois, au premier chargement
  if (await applySiteUpdates().catch(() => false)) cache = null;
  // une page redemandée après un événement doit refléter au moins cet événement
  if (cache && Date.now() - cache.at < TTL && cache.since >= minSince) return cache;
  try {
    const [rows, max] = await Promise.all([
      db.contentLive.findMany({ select: { locale: true, data: true, block: { select: { key: true } } } }),
      db.changeEvent.aggregate({ _max: { id: true }, where: { scope: 'public' } }),
    ]);
    const live: LiveContent = {};
    for (const r of rows) (live[r.block.key] ??= {})[r.locale] = r.data;
    cache = { at: Date.now(), live, since: Number(max._max.id ?? 0) };
    return cache;
  } catch (err) {
    console.error('[AULIA] contenu en ligne indisponible, repli sur la version du code', err);
    return cache ?? { since: 0 };
  }
}

export const invalidateLive = () => {
  cache = null;
};

// ───────────────────────── import initial ─────────────────────────

/** Importe (une seule fois) les blocs du code dans la base, publiés au nom du fondateur. */
export async function importCatalog(tx: Prisma.TransactionClient, founderId: string) {
  const orgs = await tx.organization.findMany({ select: { id: true, slug: true } });
  const orgId = (slug: string) => orgs.find((o) => o.slug === slug)?.id ?? orgs.find((o) => o.slug === 'aulia')!.id;
  let created = 0;
  for (const def of blockCatalog()) {
    const exists = await tx.contentBlock.findUnique({ where: { key: def.key } });
    if (exists) continue;
    const block = await tx.contentBlock.create({
      data: { key: def.key, label: def.label, orgId: orgId(def.org), pages: def.pages, sort: def.sort },
    });
    for (const locale of ['en', 'fr'] as const) {
      const data = def.data[locale] as Prisma.InputJsonValue;
      const v = await tx.contentVersion.create({
        data: {
          blockId: block.id, orgId: block.orgId, locale, data, status: 'PUBLISHED',
          note: 'Import initial depuis le site', authorId: founderId, reviewerId: founderId,
          submittedAt: new Date(), reviewedAt: new Date(), publishedAt: new Date(),
        },
      });
      await tx.contentLive.create({
        data: { blockId: block.id, locale, orgId: block.orgId, versionId: v.id, data, publishedById: founderId },
      });
    }
    created++;
  }
  return created;
}

// ───────────────────────── édition ─────────────────────────

function asLocale(l: unknown): Locale {
  if (l === 'en' || l === 'fr') return l;
  throw new HttpError(400, 'Langue invalide.');
}

async function blockFor(dbc: PrismaClient, blockId: string) {
  const block = await dbc.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new HttpError(404, 'Bloc introuvable.');
  return block;
}

/** Enregistre un brouillon (crée ou met à jour le brouillon en cours de la personne). */
export async function saveDraft(dbc: PrismaClient, u: UserCtx, blockId: string, localeIn: unknown, data: unknown, note?: string) {
  const locale = asLocale(localeIn);
  const block = await blockFor(dbc, blockId);
  if (!can(u, 'content.edit', block.orgId)) throw new HttpError(403, 'Vous ne pouvez pas modifier ce contenu.');
  const live = await dbc.contentLive.findUnique({ where: { blockId_locale: { blockId, locale } } });
  const problem = shapeProblem(live?.data, data);
  if (problem) throw new HttpError(422, problem);
  if (JSON.stringify(data).length > 250_000) throw new HttpError(413, 'Contenu trop volumineux.');

  const existing = await dbc.contentVersion.findFirst({
    where: { blockId, locale, authorId: u.id, status: { in: ['DRAFT', 'REJECTED', 'SUBMITTED'] } },
    orderBy: { updatedAt: 'desc' },
  });
  const json = data as Prisma.InputJsonValue;
  const v = existing
    ? await dbc.contentVersion.update({
        where: { id: existing.id },
        // modifier une proposition déjà soumise la repasse en brouillon (à soumettre de nouveau)
        data: { data: json, note: note ?? existing.note, status: 'DRAFT', submittedAt: null, reviewComment: existing.status === 'REJECTED' ? existing.reviewComment : null },
      })
    : await dbc.contentVersion.create({
        data: { blockId, orgId: block.orgId, locale, data: json, note, authorId: u.id, baseVersionId: live?.versionId ?? null },
      });
  await audit(dbc, u.id, { orgId: block.orgId, action: 'content.draft', entity: 'content_version', entityId: v.id, summary: `Brouillon « ${block.label} » (${locale})` });
  return v;
}

export async function submitVersion(dbc: PrismaClient, u: UserCtx, versionId: string) {
  const v = await dbc.contentVersion.findUnique({ where: { id: versionId }, include: { block: true } });
  if (!v) throw new HttpError(404, 'Version introuvable.');
  if (!can(u, 'content.submit', v.orgId)) throw new HttpError(403, 'Vous ne pouvez pas soumettre ce contenu.');
  if (!['DRAFT', 'REJECTED'].includes(v.status)) throw new HttpError(409, 'Cette version a déjà été soumise.');
  const out = await dbc.contentVersion.update({ where: { id: v.id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
  await audit(dbc, u.id, { orgId: v.orgId, action: 'content.submit', entity: 'content_version', entityId: v.id, summary: `Soumis pour validation : « ${v.block.label} » (${v.locale})` });
  return out;
}

/** Validation par le fondateur : la version devient la version en ligne. */
export async function publishVersion(dbc: PrismaClient, u: UserCtx, versionId: string, comment?: string) {
  if (!canPublish(u)) throw new HttpError(403, 'Seul le fondateur valide les publications.');
  const out = await dbc.$transaction(async (tx) => {
    const v = await tx.contentVersion.findUnique({ where: { id: versionId }, include: { block: true } });
    if (!v) throw new HttpError(404, 'Version introuvable.');
    if (!['SUBMITTED', 'DRAFT', 'REJECTED'].includes(v.status)) throw new HttpError(409, 'Cette version n’est pas en attente.');
    // une version préparée par quelqu'un d'autre doit avoir été soumise
    if (v.authorId !== u.id && v.status !== 'SUBMITTED') throw new HttpError(409, 'Cette version n’a pas été soumise.');
    const previous = await tx.contentLive.findUnique({ where: { blockId_locale: { blockId: v.blockId, locale: v.locale } } });
    await tx.contentVersion.updateMany({
      where: { blockId: v.blockId, locale: v.locale, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    });
    const now = new Date();
    const pub = await tx.contentVersion.update({
      where: { id: v.id },
      data: { status: 'PUBLISHED', reviewerId: u.id, reviewComment: comment || null, reviewedAt: now, publishedAt: now, submittedAt: v.submittedAt ?? now },
    });
    await tx.contentLive.upsert({
      where: { blockId_locale: { blockId: v.blockId, locale: v.locale } },
      create: { blockId: v.blockId, locale: v.locale, orgId: v.orgId, versionId: v.id, data: v.data as Prisma.InputJsonValue, publishedById: u.id },
      update: { versionId: v.id, data: v.data as Prisma.InputJsonValue, publishedById: u.id, publishedAt: now, orgId: v.orgId },
    });
    await audit(tx, u.id, {
      orgId: v.orgId, action: 'content.publish', entity: 'content_version', entityId: v.id,
      summary: `Publié sur le site : « ${v.block.label} » (${v.locale})`, before: previous?.data, after: v.data,
    });
    return pub;
  });
  invalidateLive();
  return out;
}

export async function rejectVersion(dbc: PrismaClient, u: UserCtx, versionId: string, comment: string) {
  if (!canPublish(u)) throw new HttpError(403, 'Seul le fondateur valide les publications.');
  if (!comment?.trim()) throw new HttpError(422, 'Indiquez la raison du refus, pour que l’auteur puisse corriger.');
  const v = await dbc.contentVersion.findUnique({ where: { id: versionId }, include: { block: true } });
  if (!v || v.status !== 'SUBMITTED') throw new HttpError(409, 'Cette version n’est pas en attente.');
  const out = await dbc.contentVersion.update({
    where: { id: v.id },
    data: { status: 'REJECTED', reviewerId: u.id, reviewComment: comment.trim().slice(0, 2000), reviewedAt: new Date() },
  });
  await audit(dbc, u.id, { orgId: v.orgId, action: 'content.reject', entity: 'content_version', entityId: v.id, summary: `Refusé : « ${v.block.label} » (${v.locale}) — ${comment.trim().slice(0, 200)}` });
  return out;
}

/** Rétablir une ancienne version publiée (fondateur) : crée une nouvelle version identique et la publie. */
export async function restoreVersion(dbc: PrismaClient, u: UserCtx, versionId: string) {
  if (!canPublish(u)) throw new HttpError(403, 'Seul le fondateur valide les publications.');
  const old = await dbc.contentVersion.findUnique({ where: { id: versionId } });
  if (!old || !['ARCHIVED', 'PUBLISHED'].includes(old.status)) throw new HttpError(409, 'Version non rétablissable.');
  const copy = await dbc.contentVersion.create({
    data: { blockId: old.blockId, orgId: old.orgId, locale: old.locale, data: old.data as Prisma.InputJsonValue, note: 'Rétablissement d’une version précédente', authorId: u.id, baseVersionId: old.id },
  });
  return publishVersion(dbc, u, copy.id, 'Rétablissement');
}

export async function discardDraft(dbc: PrismaClient, u: UserCtx, versionId: string) {
  const v = await dbc.contentVersion.findUnique({ where: { id: versionId } });
  if (!v || v.authorId !== u.id || !['DRAFT', 'REJECTED', 'SUBMITTED'].includes(v.status)) throw new HttpError(409, 'Brouillon introuvable.');
  await dbc.contentVersion.update({ where: { id: v.id }, data: { status: 'ARCHIVED', note: `${v.note ?? ''} (abandonné)`.trim() } });
  await audit(dbc, u.id, { orgId: v.orgId, action: 'content.discard', entity: 'content_version', entityId: v.id, summary: 'Brouillon abandonné' });
}
