/**
 * AULIA — accès au contenu du site.
 *
 * Le contenu en ligne vient de la base de données (versions validées par le fondateur).
 * Les fichiers en.ts, fr.ts, pages/*.ts et le dictionnaire `ui` de i18n.ts servent :
 *  - de version de départ (importée dans la base à la création du compte fondateur) ;
 *  - de repli : si la base est indisponible, le site affiche ces textes et ne tombe jamais.
 */
import { ui, type Lang } from '../i18n.ts';
import type { Content, Entity } from './types.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';

export type { Status, Entity, Content } from './types.ts';

const all: Record<Lang, Content> = { en, fr };

/** Contenu en ligne chargé par le middleware : clé du bloc → langue → données. */
export type LiveContent = Record<string, Partial<Record<Lang, unknown>>>;
type WithLive = { live?: LiveContent } | undefined;

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Fusion prudente : la version en ligne l'emporte, mais une clé ajoutée plus tard dans le
 * code (et absente de la base) garde sa valeur de repli au lieu de casser la page.
 */
export function merge<T>(fallback: T, live: unknown): T {
  if (live === undefined || live === null) return fallback;
  if (isObj(fallback) && isObj(live)) {
    const out: Record<string, unknown> = { ...fallback };
    for (const k of Object.keys(live)) out[k] = merge((fallback as Record<string, unknown>)[k], live[k]);
    return out as T;
  }
  if (Array.isArray(fallback) && Array.isArray(live)) {
    return live.map((item, i) => (i < fallback.length ? merge(fallback[i], item) : item)) as T;
  }
  if (fallback !== undefined && typeof live !== typeof fallback) return fallback;
  return live as T;
}

function liveFor(locals: WithLive, key: string, lang: Lang): unknown {
  return locals?.live?.[key]?.[lang];
}

/** Textes d'une page (bloc « page:… »), dans la langue demandée. */
export function block<T extends { en: unknown; fr: unknown }>(
  locals: WithLive,
  key: string,
  lang: Lang,
  fallback: T,
): T['en'] | T['fr'] {
  return merge(fallback[lang], liveFor(locals, key, lang)) as T['en'] | T['fr'];
}

/** Libellés communs de l'interface (en-tête, pied de page, boutons…). */
export function uiText(lang: Lang, locals?: WithLive): (typeof ui)[Lang] {
  return merge(ui[lang], liveFor(locals, 'ui', lang)) as (typeof ui)[Lang];
}

/** Menu : version en ligne, complétée par les pages ajoutées au site depuis (à leur place). */
function mergeNav(base: Content['nav'], live: unknown): Content['nav'] {
  if (!Array.isArray(live)) return base;
  const out = (live as Content['nav']).filter((l) => l && l.key && l.label);
  base.forEach((b, i) => {
    if (!out.some((l) => l.key === b.key)) out.splice(Math.min(i, out.length), 0, b);
  });
  return out;
}

/** Contenu institutionnel complet (filiales, doctrine, ANIMA…). */
export function getContent(lang: Lang, locals?: WithLive): Content {
  const base = all[lang];
  if (!locals?.live) return base;
  const pick = <K extends keyof Content>(k: K): Content[K] => merge(base[k], liveFor(locals, k, lang));

  const known = new Set(base.entities.map((e) => e.slug));
  const entities: Entity[] = base.entities.map((e) => merge(e, liveFor(locals, `entity:${e.slug}`, lang)));
  // Filiales ajoutées depuis l'espace d'administration (sans équivalent dans le code).
  for (const key of Object.keys(locals.live)) {
    if (!key.startsWith('entity:')) continue;
    const slug = key.slice('entity:'.length);
    const data = liveFor(locals, key, lang) as Entity | undefined;
    if (!known.has(slug) && data && data.name) entities.push({ ...data, slug });
  }

  return {
    statusLabel: pick('statusLabel'),
    site: pick('site'),
    nav: mergeNav(base.nav, liveFor(locals, 'nav', lang)),
    doctrine: pick('doctrine'),
    purpose: pick('purpose'),
    name: pick('name'),
    entities,
    anima: pick('anima'),
    research: pick('research'),
  };
}

/** Version de départ (code) — utilisée pour l'import initial dans la base. */
export function baseContent(lang: Lang): Content {
  return all[lang];
}
