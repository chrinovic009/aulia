/**
 * Internationalisation du portail.
 * Anglais par défaut (racine du site), français sous /fr.
 * Le choix du visiteur est mémorisé dans son navigateur (clé « aulia-lang »).
 */

export type Lang = 'en' | 'fr';
export const langs: Lang[] = ['en', 'fr'];
export const defaultLang: Lang = 'en';

/** Clé de page → chemin par langue. */
export const routes = {
  home: { en: '/', fr: '/fr' },
  vision: { en: '/vision', fr: '/fr/vision' },
  ecosystem: { en: '/ecosystem', fr: '/fr/ecosysteme' },
  anima: { en: '/anima', fr: '/fr/anima' },
  research: { en: '/research', fr: '/fr/recherche' },
  partnerships: { en: '/partnerships', fr: '/fr/partenariats' },
  contact: { en: '/contact', fr: '/fr/contact' },
  legal: { en: '/legal-notice', fr: '/fr/mentions-legales' },
  privacy: { en: '/privacy', fr: '/fr/confidentialite' },
} as const;

export type RouteKey = keyof typeof routes;

/** Construit un lien : path('fr', 'ecosystem', 'care') → /fr/ecosysteme/care */
export function path(lang: Lang, key: RouteKey, sub?: string): string {
  const base = routes[key][lang];
  if (!sub) return base;
  return (base === '/' ? '' : base) + '/' + sub;
}

/** Lien vers le formulaire de contact avec un objet pré-sélectionné. */
export function contactPath(lang: Lang, topic: string): string {
  return `${path(lang, 'contact')}?topic=${topic}`;
}

export const ui = {
  en: {
    locale: 'en_US',
    skip: 'Skip to content',
    home: 'Home',
    menu: 'Menu',
    contact: 'Contact',
    mainNav: 'Main navigation',
    mobileNav: 'Mobile navigation',
    switchTo: 'Français',
    switchLabel: 'Lire en français',
    footerIntro:
      'A technology group in the making, AULIA designs and builds specialised companies that put science, intelligence and technology at the service of essential systems.',
    footerGroup: 'Group',
    footerEcosystem: 'Ecosystem',
    footerContact: 'Contact',
    writeUs: 'Write to us',
    requestPresentation: 'Request a presentation',
    startPartnership: 'Start a partnership',
    rights: 'All rights reserved.',
    legal: 'Legal notice',
    privacy: 'Privacy',
    doctrine: 'Understand · Anticipate · Create · Protect · Transform',
    emblem: 'AULIA emblem',
    skipAnimation: 'Skip animation',
    belonging: 'Group membership',
    animaLayer: 'ANIMA — transversal layer, target architecture',
    status: 'Status',
    systems: 'Systems',
    relation: 'Relationship with AULIA',
    withAnima: 'With ANIMA',
    see: 'View',
    discoverAnima: 'Discover ANIMA',
    groupStructure: 'Group structure',
    mapDefaultTitle: 'AULIA at the centre, autonomous companies around it.',
    mapDefaultText:
      'Select an entity to see its field, its role, its systems and its relationship with the group and with ANIMA.',
    transversal: 'Transversal layer',
    animaNotSubsidiary: 'ANIMA is not a subsidiary.',
    animaNotSubsidiaryText:
      'It is the intelligence architecture imagined to progressively connect the group’s systems. None of these connections is operational today: they describe a target architecture.',
    animaRingLabel: 'ANIMA, transversal intelligence layer',
    coreTitle: 'ANIMA conceptual architecture',
    coreDesc:
      'Multimodal information enters the ANIMA core, which coordinates the specialised systems CARE, VIGIL, FLOW and VR. Connections shown as target architecture.',
    coreInputs: ['Text', 'Voice', 'Images', 'Video', 'Sensors'],
    coreCaption: 'Target architecture — conceptual representation, not operational.',
    doctrineLabel: 'AULIA doctrine',
    legalEyebrow: 'Legal information',
  },
  fr: {
    locale: 'fr_FR',
    skip: 'Aller au contenu',
    home: 'Accueil',
    menu: 'Menu',
    contact: 'Contact',
    mainNav: 'Navigation principale',
    mobileNav: 'Navigation mobile',
    switchTo: 'English',
    switchLabel: 'Read in English',
    footerIntro:
      "Groupe technologique en construction, AULIA conçoit et développe des entreprises spécialisées qui mettent la science, l'intelligence et la technologie au service des systèmes essentiels.",
    footerGroup: 'Groupe',
    footerEcosystem: 'Écosystème',
    footerContact: 'Contact',
    writeUs: 'Nous écrire',
    requestPresentation: 'Demander une présentation',
    startPartnership: 'Initier un partenariat',
    rights: 'Tous droits réservés.',
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
    doctrine: 'Comprendre · Anticiper · Créer · Protéger · Transformer',
    emblem: 'Emblème AULIA',
    skipAnimation: "Passer l'animation",
    belonging: 'Appartenance au groupe',
    animaLayer: 'ANIMA — couche transversale, architecture cible',
    status: 'Statut',
    systems: 'Systèmes',
    relation: 'Relation avec AULIA',
    withAnima: 'Avec ANIMA',
    see: 'Voir',
    discoverAnima: 'Découvrir ANIMA',
    groupStructure: 'Structure du groupe',
    mapDefaultTitle: 'AULIA au centre, des entreprises autonomes autour.',
    mapDefaultText:
      'Sélectionnez une entité pour voir son domaine, sa fonction, ses systèmes et sa relation avec le groupe et avec ANIMA.',
    transversal: 'Couche transversale',
    animaNotSubsidiary: "ANIMA n'est pas une filiale.",
    animaNotSubsidiaryText:
      "C'est l'architecture d'intelligence imaginée pour relier progressivement les systèmes du groupe. Aucune de ces connexions n'est opérationnelle aujourd'hui : elles décrivent une architecture cible.",
    animaRingLabel: "ANIMA, couche d'intelligence transversale",
    coreTitle: "Architecture conceptuelle d'ANIMA",
    coreDesc:
      'Des informations multimodales entrent dans le noyau ANIMA, qui coordonne les systèmes spécialisés CARE, VIGIL, FLOW et VR. Connexions représentées en architecture cible.',
    coreInputs: ['Texte', 'Voix', 'Images', 'Vidéo', 'Capteurs'],
    coreCaption: 'Architecture cible — représentation conceptuelle, non opérationnelle.',
    doctrineLabel: 'Doctrine AULIA',
    legalEyebrow: 'Informations légales',
  },
} as const;
