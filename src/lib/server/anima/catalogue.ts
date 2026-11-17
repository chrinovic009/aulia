/**
 * ANIMA — catalogue réel d'AULIA : seule source de vérité sur le statut des filiales.
 * Le statut affiché aux visiteurs vient TOUJOURS d'ici, jamais du modèle de langage.
 * À mettre à jour dès qu'une filiale change de statut.
 */
export type Lang = 'fr' | 'en';
export type Statut = 'disponible' | 'en_developpement' | 'en_conception' | 'en_exploration' | 'conceptuel';

export const STATUTS: Record<Statut, Record<Lang, string>> = {
  disponible: { fr: 'Disponible', en: 'Available' },
  en_developpement: { fr: 'En développement', en: 'In development' },
  en_conception: { fr: 'En conception', en: 'In design' },
  en_exploration: { fr: 'En exploration', en: 'Exploratory' },
  conceptuel: { fr: 'Architecture cible (non opérationnelle)', en: 'Target architecture (not operational)' },
};

export type Filiale = {
  nom: string;
  slug: string; // identifiant de l'organisation dans la base du site
  statut: Statut;
  domaine: Record<Lang, string>;
  pourQui: string;
  note: string;
};

export const FILIALES: Record<string, Filiale> = {
  CARE: {
    nom: 'AULIA Care', slug: 'care', statut: 'en_developpement',
    domaine: { fr: "Systèmes d'information de santé et médicaux", en: 'Health and medical information systems' },
    pourQui: 'hôpitaux, cliniques, centres de santé, laboratoires, pharmacies',
    note: 'Première preuve terrain du groupe.',
  },
  VIGIL: {
    nom: 'AULIA Vigil', slug: 'vigil', statut: 'en_conception',
    domaine: { fr: 'Intelligence industrielle, surveillance et opérations', en: 'Industrial intelligence, monitoring and operations' },
    pourQui: 'mines, usines, sites industriels, énergie',
    note: 'Valeur industrielle, après Care.',
  },
  FLOW: {
    nom: 'AULIA Flow', slug: 'flow', statut: 'en_conception',
    domaine: { fr: 'Intelligence organisationnelle et opérationnelle', en: 'Organisational and operational intelligence' },
    pourQui: 'logistique, dépôts, distribution, organisations multi-sites',
    note: 'Valeur industrielle, après Care.',
  },
  VR: {
    nom: 'AULIA VR', slug: 'vr', statut: 'en_exploration',
    domaine: { fr: 'Réalité virtuelle, simulation et environnements immersifs', en: 'Virtual reality, simulation and immersive environments' },
    pourQui: 'formation, simulation, éducation, industrie',
    note: '',
  },
  ANIMA: {
    nom: 'ANIMA', slug: 'anima', statut: 'conceptuel',
    domaine: { fr: 'Intelligence transversale du groupe, sous contrôle humain', en: "The group's cross-cutting intelligence, under human control" },
    pourQui: 'toutes les filiales',
    note: 'Le présent assistant en est le premier agent.',
  },
};

/** Retrouve une filiale à partir d'un nom approximatif (« Aulia care », « vigil »…). */
export function resolveFiliale(name: string): string | null {
  const n = String(name ?? '').toUpperCase().replace('AULIA', '').replace(/[\s\-_·]+/g, ' ').trim();
  for (const [key, f] of Object.entries(FILIALES)) if (n === key || n === f.nom.toUpperCase()) return key;
  for (const key of Object.keys(FILIALES)) if (n.includes(key)) return key;
  return null;
}

export function catalogueText(lang: Lang): string {
  return Object.values(FILIALES)
    .map((f) => `- ${f.nom} [${STATUTS[f.statut][lang]}] : ${f.domaine[lang]} — pour : ${f.pourQui}. ${f.note}`.trim())
    .join('\n');
}

export const KNOWLEDGE = `Groupe technologique en construction, ancré en RDC : une société mère qui crée des entreprises \
spécialisées mettant la science, l'IA et la technologie au service des systèmes essentiels. \
Accroche : « Building Intelligence. Transforming Systems. » Doctrine : comprendre, anticiper, créer, \
protéger, transformer. Parcours : Care d'abord (preuve terrain), puis Vigil et Flow, puis ANIMA. \
ANIMA = intelligence transversale sous contrôle humain ; tu en es le premier agent. \
Pour avancer : demander une présentation, lancer un partenariat (établissement pilote, partenaire \
technique, institution, investisseur) ou écrire à l'équipe. Adresse et téléphone ne sont pas publiés.`;
