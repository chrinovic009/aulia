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
  {
    id: '2026-11-20-flow',
    label: 'Nouvelle fiche AULIA Flow (en pilote dans une usine)',
    changes: [
      { block: 'entity:flow', path: ["sector"], from: { en: "Organisational & operational intelligence", fr: "Intelligence organisationnelle & opérationnelle" } },
      { block: 'entity:flow', path: ["status"], from: { en: "design", fr: "design" } },
      { block: 'entity:flow', path: ["tagline"], from: { en: "Master the flow of information, resources and operations.", fr: "Maîtriser la circulation des informations, des ressources et des opérations." } },
      { block: 'entity:flow', path: ["summary"], from: { en: "Helping organisations master their operations, resources, finances, production and information flows.", fr: "Aider les organisations à maîtriser leurs opérations, leurs ressources, leurs finances, leur production et leurs flux d'information." } },
      { block: 'entity:flow', path: ["presentation"], from: { en: ["AULIA Flow aims to improve how information, resources and operations move within organisations.","It should make it possible to understand how resources and information circulate, where they get stuck and what needs to be anticipated."], fr: ["AULIA Flow vise à améliorer la circulation des informations, des ressources et des opérations au sein des organisations.","Elle doit permettre de comprendre comment les ressources et les informations se déplacent, où elles se bloquent et ce qu'il faut anticiper."] } },
      { block: 'entity:flow', path: ["problems"], from: { en: ["Information scattered across tools, files and departments.","Stock-outs and delays discovered too late.","Limited visibility over operations and performance.","Difficult coordination between teams and sites."], fr: ["Des informations dispersées entre outils, fichiers et services.","Des ruptures de stock et des retards découverts trop tard.","Une visibilité limitée sur les opérations et les performances.","Une coordination difficile entre équipes et sites."] } },
      { block: 'entity:flow', path: ["mission"], from: { en: "To give organisations a clear, up-to-date view of their flows so they can decide earlier and coordinate better.", fr: "Donner aux organisations une vision claire et à jour de leurs flux pour décider plus tôt et coordonner mieux." } },
      { block: 'entity:flow', path: ["capabilities"], from: { en: [{"title":"Resources & procurement","text":"Tracking stock, logistics and supply.","status":"design"},{"title":"Operations & production","text":"Tracking operations and coordinating activities.","status":"design"},{"title":"Finance & performance","text":"Financial tracking and performance indicators.","status":"design"},{"title":"Operational forecasting","text":"Analysing flows and anticipating pressure points.","status":"design"}], fr: [{"title":"Ressources & approvisionnement","text":"Suivi des stocks, de la logistique et des approvisionnements.","status":"design"},{"title":"Opérations & production","text":"Suivi des opérations et coordination des activités.","status":"design"},{"title":"Finances & performance","text":"Suivi financier et indicateurs de performance.","status":"design"},{"title":"Prévisions opérationnelles","text":"Analyse des flux et anticipation des tensions.","status":"design"}] } },
      { block: 'entity:flow', path: ["architecture"], from: { en: [{"title":"A unified view","text":"Connecting operational data that today lives in separate systems."},{"title":"Visible flows","text":"Visualising processes to spot bottlenecks."},{"title":"Prepared decisions","text":"Proposing actions, always subject to validation."}], fr: [{"title":"Une vue unifiée","text":"Relier les données opérationnelles qui vivent aujourd'hui dans des systèmes séparés."},{"title":"Des flux visibles","text":"Visualiser les processus pour repérer les blocages."},{"title":"Des décisions préparées","text":"Proposer des actions, toujours soumises à validation."}] } },
      { block: 'entity:flow', path: ["ecosystem"], from: { en: "AULIA Flow carries the organisational dimension of the ecosystem.", fr: "AULIA Flow porte la dimension organisationnelle de l'écosystème." } },
    ],
  },
  {
    id: '2026-11-23-flow-anima',
    label: 'Légendes ANIMA : premier agent en service',
    changes: [
      { block: 'ui', path: ['animaLayer'], from: { en: 'ANIMA — transversal layer, target architecture', fr: 'ANIMA — couche transversale, architecture cible' } },
      {
        block: 'ui', path: ['coreCaption'],
        from: { en: 'Target architecture — conceptual representation, not operational.', fr: 'Architecture cible — représentation conceptuelle, non opérationnelle.' },
      },
    ],
  },
  {
    id: '2026-11-23-equipe-regal',
    label: 'Équipe : Kasompe Kakese Régal',
    // ajouté seulement si la 2e place de la liste est encore libre (jamais par-dessus un membre ajouté à la main)
    changes: [{ block: 'team', path: ['members', 1], from: { en: undefined, fr: undefined } }],
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

/**
 * Blocs ajoutés au site après la création du compte fondateur (ex. « L'équipe », « À propos ») :
 * ils sont créés dans la base, publiés tels que dans le code, pour devenir modifiables dans
 * l'administration. Un bloc déjà présent n'est jamais touché.
 */
async function importNewBlocks(): Promise<boolean> {
  const catalog = blockCatalog();
  const existing = new Set((await db!.contentBlock.findMany({ select: { key: true } })).map((b) => b.key));
  const missing = catalog.filter((d) => !existing.has(d.key));
  if (!missing.length) return false;
  await db!.$transaction(async (tx) => {
    const founder = await tx.membership.findFirst({ where: { roleCode: 'founder', status: 'ACTIVE' }, select: { userId: true } });
    if (!founder) return; // compte fondateur pas encore créé : l'import initial s'en chargera
    const orgs = await tx.organization.findMany({ select: { id: true, slug: true } });
    const orgId = (slug: string) => orgs.find((o) => o.slug === slug)?.id ?? orgs.find((o) => o.slug === 'aulia')!.id;
    for (const def of missing) {
      if (await tx.contentBlock.findUnique({ where: { key: def.key } })) continue;
      const block = await tx.contentBlock.create({ data: { key: def.key, label: def.label, orgId: orgId(def.org), pages: def.pages, sort: def.sort } });
      for (const locale of ['en', 'fr'] as const) {
        const data = def.data[locale] as Prisma.InputJsonValue;
        const now = new Date();
        const v = await tx.contentVersion.create({
          data: {
            blockId: block.id, orgId: block.orgId, locale, data, status: 'PUBLISHED', note: 'Nouveau bloc ajouté au site',
            authorId: founder.userId, reviewerId: founder.userId, submittedAt: now, reviewedAt: now, publishedAt: now,
          },
        });
        await tx.contentLive.create({ data: { blockId: block.id, locale, orgId: block.orgId, versionId: v.id, data, publishedById: founder.userId } });
      }
      await audit(tx, founder.userId, { orgId: block.orgId, action: 'content.publish', entity: 'content_block', entityId: block.id, summary: `Nouveau bloc ajouté au site : « ${def.label} »` });
    }
  });
  console.info(`[AULIA] nouveaux blocs de contenu : ${missing.map((d) => d.key).join(', ')}`);
  return true;
}

let done: Promise<boolean> | null = null;
let retryAt = 0;

/** Applique les mises à jour en attente (une fois par instance ; sans effet si déjà faites). */
export function applySiteUpdates(): Promise<boolean> {
  if (!db || (!done && Date.now() < retryAt)) return Promise.resolve(false);
  done ??= (async () => {
    let applied = false;
    try {
      try {
        applied = (await importNewBlocks()) || applied;
      } catch (err) {
        // deux instances en même temps : la seconde échoue sur la clé unique, sans conséquence
        if ((err as { code?: string })?.code !== 'P2002') console.error('[AULIA] import des nouveaux blocs', err);
      }
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
