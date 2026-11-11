/**
 * AULIA — contenu institutionnel.
 * Les textes vivent dans en.ts (anglais, langue par défaut) et fr.ts (français),
 * avec exactement la même structure. Modifier les deux fichiers ensemble.
 * Règle : ne rien publier qui ne soit validé (pas de clients, chiffres ou capacités inventés).
 */
import type { Lang } from '../i18n.ts';
import type { Content } from './types.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';

export type { Status, Entity, Content } from './types.ts';

const all: Record<Lang, Content> = { en, fr };

export function getContent(lang: Lang): Content {
  return all[lang];
}
