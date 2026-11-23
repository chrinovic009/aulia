/**
 * ANIMA — catalogue réel d'AULIA : seule source de vérité sur le statut des filiales.
 * Le statut affiché aux visiteurs vient TOUJOURS d'ici, jamais du modèle de langage.
 * À mettre à jour dès qu'une filiale change de statut.
 */
export type Lang = 'fr' | 'en';
export type Statut = 'disponible' | 'pilote' | 'premier_agent' | 'en_developpement' | 'en_conception' | 'en_exploration' | 'conceptuel';

export const STATUTS: Record<Statut, Record<Lang, string>> = {
  disponible: { fr: 'Disponible', en: 'Available' },
  pilote: { fr: 'En fonctionnement, phase pilote', en: 'Operational, pilot phase' },
  premier_agent: { fr: 'En service (premier agent), architecture complète en développement', en: 'In service (first agent), full architecture in development' },
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
    nom: 'AULIA Care', slug: 'care', statut: 'pilote',
    domaine: { fr: "Systèmes d'information de santé et médicaux", en: 'Health and medical information systems' },
    pourQui: 'hôpitaux, cliniques, centres de santé, laboratoires, pharmacies',
    note: "Première preuve terrain du groupe : la couche Core est prête à fonctionner dans une clinique et en phase pilote ; les autres composantes (Diagnostic Agent, Connected Care) sont en développement. Démonstration : demo-aulia-care.vercel.app.",
  },
  VIGIL: {
    nom: 'AULIA Vigil', slug: 'vigil', statut: 'en_conception',
    domaine: { fr: 'Intelligence industrielle, surveillance et opérations', en: 'Industrial intelligence, monitoring and operations' },
    pourQui: 'mines, usines, sites industriels, énergie',
    note: 'Valeur industrielle, après Care.',
  },
  FLOW: {
    nom: 'AULIA Flow', slug: 'flow', statut: 'pilote',
    domaine: { fr: 'Gestion, coordination et pilotage des opérations (production, finances, logistique, stocks, ventes, marketing)', en: 'Management, coordination and steering of operations (production, finance, logistics, stock, sales, marketing)' },
    pourQui: 'PME, grandes entreprises, industries, entreprises minières, commerciales et logistiques',
    note: "En fonctionnement : AULIA Flow fonctionne déjà dans une usine de production (phase pilote).",
  },
  VR: {
    nom: 'AULIA VR', slug: 'vr', statut: 'en_exploration',
    domaine: { fr: 'Réalité virtuelle, simulation et environnements immersifs', en: 'Virtual reality, simulation and immersive environments' },
    pourQui: 'formation, simulation, éducation, industrie',
    note: '',
  },
  ANIMA: {
    nom: 'ANIMA', slug: 'anima', statut: 'premier_agent',
    domaine: { fr: 'Intelligence transversale du groupe, sous contrôle humain', en: "The group's cross-cutting intelligence, under human control" },
    pourQui: 'toutes les filiales',
    note: "Fonctionnelle : le présent assistant en est le premier agent, en service sur le site (conversation écrite et vocale, mémoire, prise de rendez-vous, gouvernance). La perception multimodale, l'anticipation et la coordination entre filiales sont en développement.",
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
protéger, transformer. Déjà en fonctionnement : AULIA Care (couche Core, phase pilote) et AULIA Flow (fonctionne dans une usine de production). \
Vigil et VR suivent. ANIMA = intelligence transversale sous contrôle humain ; tu en es le premier agent, en service. \
Pour avancer : demander une présentation, lancer un partenariat (établissement pilote, partenaire \
technique, institution, investisseur) ou écrire à l'équipe. Adresse et téléphone ne sont pas publiés. \
FONDATEUR (information publique, à donner volontiers) : Tumba Nyembo Chrinovic, fondateur d'AULIA, né en 2003, \
congolais. Humanités en biochimie ; génie logiciel à l'ESIS (École Supérieure d'Informatique Salama, \
aujourd'hui Université Don Bosco de Lubumbashi, UDBL) ; développeur full-stack chez ConnectMe ; puis \
consultant en IT et programmation interne chez D7 Services. Il construit AULIA pour associer l'intelligence \
humaine, la science et la technologie afin de transformer la manière de résoudre les problèmes, et il a \
choisi la RDC pour que le pays ne soit pas seulement un marché pour les innovations étrangères, mais un \
lieu de conception et de production de solutions. Page : aulia-holding.com/fr/a-propos. \
PARTENAIRES RÉELS : ConnectMe, l'association Mwinue Asimame, G20 — Journée Volley Ball.`;
