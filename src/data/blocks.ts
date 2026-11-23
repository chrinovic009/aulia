/**
 * Catalogue des blocs de contenu du site public.
 * Chaque bloc est importé une fois dans la base (création du compte fondateur), puis géré
 * dans l'espace d'administration. `org` désigne l'organisation responsable du bloc :
 * le DG d'une filiale prépare les blocs de sa filiale, le fondateur valide.
 */
import { ui, type Lang } from '../i18n.ts';
import { baseContent } from './site.ts';
import type { Content } from './types.ts';
import home from './pages/home.ts';
import vision from './pages/vision.ts';
import ecosystem from './pages/ecosystem.ts';
import entity from './pages/entity.ts';
import anima from './pages/anima.ts';
import research from './pages/research.ts';
import partnerships from './pages/partnerships.ts';
import contact from './pages/contact.ts';
import legal from './pages/legal.ts';
import privacy from './pages/privacy.ts';
import about from './pages/about.ts';
import team from './pages/team.ts';

export type BlockDef = {
  key: string;
  label: string;
  /** slug de l'organisation responsable */
  org: string;
  pages: string[];
  sort: number;
  data: Record<Lang, unknown>;
};

const both = <K extends keyof Content>(k: K) => ({ en: baseContent('en')[k], fr: baseContent('fr')[k] });

export function blockCatalog(): BlockDef[] {
  const list: BlockDef[] = [
    { key: 'site', label: 'Identité du site (nom, signature, description)', org: 'aulia', pages: ['*'], sort: 0, data: both('site') },
    { key: 'ui', label: 'Libellés communs (menu, pied de page, boutons)', org: 'aulia', pages: ['*'], sort: 1, data: { en: ui.en, fr: ui.fr } },
    { key: 'nav', label: 'Menu principal', org: 'aulia', pages: ['*'], sort: 2, data: both('nav') },
    { key: 'statusLabel', label: 'Libellés des statuts', org: 'aulia', pages: ['*'], sort: 3, data: both('statusLabel') },
    { key: 'page:home', label: 'Accueil — textes de la page', org: 'aulia', pages: ['/'], sort: 10, data: home },
    { key: 'doctrine', label: 'Doctrine (les cinq verbes)', org: 'aulia', pages: ['/', '/vision'], sort: 11, data: both('doctrine') },
    { key: 'team', label: 'L’équipe (membres, photos, réseaux)', org: 'aulia', pages: ['/', '/about'], sort: 14, data: team },
    { key: 'page:about', label: 'À propos — fondateur, pourquoi la RDC', org: 'aulia', pages: ['/about'], sort: 15, data: about },
    { key: 'page:vision', label: 'Notre vision — textes de la page', org: 'aulia', pages: ['/vision'], sort: 20, data: vision },
    { key: 'purpose', label: 'Raison d’être, mission, vision', org: 'aulia', pages: ['/vision'], sort: 21, data: both('purpose') },
    { key: 'name', label: 'Le nom AULIA', org: 'aulia', pages: ['/vision'], sort: 22, data: both('name') },
    { key: 'page:ecosystem', label: 'Écosystème — textes de la page', org: 'aulia', pages: ['/ecosystem'], sort: 30, data: ecosystem },
    { key: 'page:entity', label: 'Pages filiales — textes communs', org: 'aulia', pages: ['/ecosystem/*'], sort: 31, data: entity },
    { key: 'page:anima', label: 'ANIMA — textes de la page', org: 'aulia', pages: ['/anima'], sort: 40, data: anima },
    { key: 'anima', label: 'ANIMA — capacités, modules, scénarios', org: 'aulia', pages: ['/', '/anima'], sort: 41, data: both('anima') },
    { key: 'page:research', label: 'Recherche — textes de la page', org: 'aulia', pages: ['/research'], sort: 50, data: research },
    { key: 'research', label: 'Domaines de recherche', org: 'aulia', pages: ['/', '/research'], sort: 51, data: both('research') },
    { key: 'page:partnerships', label: 'Partenariats', org: 'aulia', pages: ['/partnerships'], sort: 60, data: partnerships },
    { key: 'page:contact', label: 'Contact', org: 'aulia', pages: ['/contact'], sort: 70, data: contact },
    { key: 'page:legal', label: 'Mentions légales', org: 'aulia', pages: ['/legal-notice'], sort: 80, data: legal },
    { key: 'page:privacy', label: 'Confidentialité', org: 'aulia', pages: ['/privacy'], sort: 81, data: privacy },
  ];
  const en = baseContent('en').entities;
  const fr = baseContent('fr').entities;
  en.forEach((e, i) => {
    list.push({
      key: `entity:${e.slug}`,
      label: `Filiale — ${e.name}`,
      // rattachée à la filiale si elle existe déjà dans la base (sinon à la holding)
      org: e.slug,
      pages: [`/ecosystem/${e.slug}`, '/ecosystem', '/'],
      sort: 100 + i,
      data: { en: e, fr: fr.find((f) => f.slug === e.slug) ?? e },
    });
  });
  return list;
}
