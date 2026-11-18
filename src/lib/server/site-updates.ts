/**
 * Mises à jour du site livrées avec le code.
 *
 * Le contenu en ligne vient de la base : quand le code corrige un texte déjà publié
 * (statut, formulation), la base garderait l'ancienne version. Chaque mise à jour listée ici
 * est appliquée UNE SEULE FOIS, au premier chargement après le déploiement :
 *  - seuls les champs dont la valeur en ligne est encore l'ancienne valeur (`from`) changent :
 *    un texte modifié entre-temps dans l'administration n'est jamais écrasé ;
 *  - la nouvelle valeur est celle du code (blocs du catalogue) ;
 *  - la version est publiée au nom du fondateur, avec une note, inscrite au journal,
 *    et reste rétablissable depuis l'historique du bloc.
 */
import type { Prisma } from '@prisma/client';
import { blockCatalog } from '../../data/blocks.ts';
import { db } from './db.ts';
import { audit } from './audit.ts';

type Lang = 'en' | 'fr';
type Path = (string | number)[];
type Change = { block: string; path: Path; from: Record<Lang, unknown> };
type Update = { id: string; label: string; changes: Change[] };

export const UPDATES: Update[] = [
  {
    id: '2026-11-18-anima-care',
    label: 'ANIMA en service (premier agent), AULIA Care en pilote',
    changes: [
      { block: 'anima', path: ['status'], from: { en: 'target', fr: 'target' } },
      {
        block: 'page:anima', path: ['meta'],
        from: {
          en: 'ANIMA, the transversal intelligence architecture envisioned by AULIA to perceive, understand, anticipate, coordinate and act across specialised systems.',
          fr: "ANIMA, l'architecture d'intelligence transversale imaginée par AULIA pour percevoir, comprendre, anticiper, coordonner et agir à travers des systèmes spécialisés.",
        },
      },
      { block: 'page:anima', path: ['state'], from: { en: 'Long-term research programme', fr: 'Programme de recherche de long terme' } },
      {
        block: 'page:anima', path: ['archNote'],
        from: { en: 'Target architecture — no module is presented as implemented.', fr: "Architecture cible — aucun module n'est présenté comme implémenté." },
      },
      {
        block: 'page:ecosystem', path: ['lead'],
        from: {
          en: 'AULIA at the centre. Specialised companies around it. ANIMA, in time, between them.',
          fr: 'AULIA au centre. Des entreprises spécialisées autour. ANIMA, à terme, entre elles.',
        },
      },
      {
        block: 'page:ecosystem', path: ['roles', 2, 'text'],
        from: { en: 'Transversal intelligence layer — target architecture', fr: "Couche d'intelligence transversale — architecture cible" },
      },
      { block: 'entity:care', path: ['status'], from: { en: 'dev', fr: 'dev' } },
      { block: 'entity:care', path: ['capabilities', 0, 'status'], from: { en: 'dev', fr: 'dev' } },
    ],
  },
];

const getAt = (o: unknown, path: Path): unknown =>
  path.reduce<unknown>((cur, k) => (cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[k] : undefined), o);

function setAt(o: unknown, path: Path, value: unknown) {
  let cur = o as Record<string | number, unknown>;
  for (const k of path.slice(0, -1)) cur = cur[k] as Record<string | number, unknown>;
  cur[path[path.length - 1]] = value;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Calcule la nouvelle version d'un bloc (ou null si rien ne change). Exporté pour les tests. */
export function patchBlock(data: unknown, changes: Change[], codeData: unknown, locale: Lang): unknown | null {
  const next = JSON.parse(JSON.stringify(data));
  let changed = false;
  for (const c of changes) {
    const current = getAt(next, c.path);
    const target = getAt(codeData, c.path);
    if (target === undefined || !same(current, c.from[locale]) || same(current, target)) continue;
    setAt(next, c.path, JSON.parse(JSON.stringify(target)));
    changed = true;
  }
  return changed ? next : null;
}

async function applyOne(u: Update) {
  const catalog = blockCatalog();
  await db!.$transaction(async (tx) => {
    // réservation : si une autre instance l'a déjà appliquée, la création échoue et tout est annulé
    await tx.animaSetting.create({ data: { key: `site:update:${u.id}`, value: { label: u.label, at: new Date().toISOString() } } });
    const founder = await tx.membership.findFirst({ where: { roleCode: 'founder', status: 'ACTIVE' }, select: { userId: true } });
    if (!founder) throw new Error('aucun fondateur');
    const byBlock = new Map<string, Change[]>();
    for (const c of u.changes) byBlock.set(c.block, [...(byBlock.get(c.block) ?? []), c]);

    for (const [key, changes] of byBlock) {
      const def = catalog.find((b) => b.key === key);
      const block = await tx.contentBlock.findUnique({ where: { key } });
      if (!def || !block) continue;
      for (const locale of ['en', 'fr'] as const) {
        const live = await tx.contentLive.findUnique({ where: { blockId_locale: { blockId: block.id, locale } } });
        if (!live) continue; // pas de version en ligne : le site affiche déjà le texte du code
        const next = patchBlock(live.data, changes, def.data[locale], locale);
        if (!next) continue;
        const now = new Date();
        const note = `Mise à jour livrée avec le code : ${u.label}`;
        await tx.contentVersion.updateMany({ where: { blockId: block.id, locale, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
        const v = await tx.contentVersion.create({
          data: {
            blockId: block.id, orgId: block.orgId, locale, data: next as Prisma.InputJsonValue, note, status: 'PUBLISHED',
            authorId: founder.userId, reviewerId: founder.userId, reviewComment: 'Mise à jour livrée avec le code',
            baseVersionId: live.versionId, submittedAt: now, reviewedAt: now, publishedAt: now,
          },
        });
        await tx.contentLive.update({
          where: { blockId_locale: { blockId: block.id, locale } },
          data: { versionId: v.id, data: next as Prisma.InputJsonValue, publishedById: founder.userId, publishedAt: now },
        });
        await audit(tx, founder.userId, {
          orgId: block.orgId, action: 'content.publish', entity: 'content_version', entityId: v.id,
          summary: `${note} — « ${block.label} » (${locale})`, before: live.data, after: next,
        });
      }
    }
  });
}

let done: Promise<boolean> | null = null;
let retryAt = 0;

/** Applique les mises à jour en attente (une fois par instance ; sans effet si déjà faites). */
export function applySiteUpdates(): Promise<boolean> {
  if (!db || (!done && Date.now() < retryAt)) return Promise.resolve(false);
  done ??= (async () => {
    let applied = false;
    try {
      const keys = UPDATES.map((u) => `site:update:${u.id}`);
      const already = new Set((await db!.animaSetting.findMany({ where: { key: { in: keys } }, select: { key: true } })).map((r) => r.key));
      for (const u of UPDATES) {
        if (already.has(`site:update:${u.id}`)) continue;
        try {
          await applyOne(u);
          applied = true;
          console.info(`[AULIA] mise à jour du contenu appliquée : ${u.label}`);
        } catch (err) {
          // déjà appliquée par une autre instance (clé en double) : rien à faire
          if ((err as { code?: string })?.code !== 'P2002') console.error(`[AULIA] mise à jour « ${u.label} » non appliquée`, err);
        }
      }
    } catch (err) {
      console.error('[AULIA] mises à jour du contenu indisponibles', err);
      done = null; // nouvel essai dans 5 minutes
      retryAt = Date.now() + 5 * 60_000;
    }
    return applied;
  })();
  return done;
}
