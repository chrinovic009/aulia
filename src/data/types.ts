import type { RouteKey } from '../i18n.ts';

/**
 * Statuts de maturité :
 *  live    : disponible / opérationnel (uniquement avec preuve)
 *  pilot   : prêt, en phase pilote
 *  dev     : en développement actif
 *  design  : en conception
 *  explore : en exploration
 *  target  : architecture cible (non opérationnelle)
 */
export type Status = 'live' | 'pilot' | 'dev' | 'design' | 'explore' | 'target';

export type Entity = {
  slug: string;
  name: string;
  short: string;
  sector: string;
  status: Status;
  tagline: string;
  summary: string;
  presentation: string[];
  problems: string[];
  mission: string;
  capabilities: { title: string; text: string; status: Status }[];
  architecture: { title: string; text: string }[];
  demo?: { label: string; href: string; note: string };
  ecosystem: string;
  animaLink: string;
};

export type Content = {
  statusLabel: Record<Status, string>;
  site: {
    name: string;
    signature: string;
    tagline: string;
    description: string;
    contactEndpoint: string;
    contactEmail: string;
    socials: { label: string; href: string }[];
  };
  nav: { key: RouteKey; label: string }[];
  doctrine: { word: string; en: string; short: string; long: string }[];
  purpose: { raison: string; mission: string; vision: string };
  name: { letters: string; latin: string; title: string; text: string }[];
  entities: Entity[];
  anima: {
    status: Status;
    motto: string[];
    mottoEn: string[];
    capabilities: { name: string; text: string }[];
    modules: { id: string; name: string; role: string }[];
    scenarios: { id: string; title: string; systems: string[]; context: string; steps: string[]; guard: string }[];
    sovereignty: { title: string; text: string }[];
  };
  research: { title: string; text: string }[];
};
