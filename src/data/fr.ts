// Contenu FRANÇAIS du portail. Même structure que en.ts.
import type { Content, Entity } from './types.ts';
import type { RouteKey } from '../i18n.ts';
import { CONTACT_ENDPOINT, CONTACT_EMAIL, SOCIALS } from './config.ts';

const statusLabel = {
  live: 'Disponible',
  pilot: 'En pilote',
  dev: 'En développement',
  design: 'En conception',
  explore: 'En exploration',
  target: 'Architecture cible',
};

const site = {
  name: 'AULIA',
  signature: "Construire l'intelligence. Transformer les systèmes.",
  tagline: "Construire l'intelligence. Transformer les systèmes.",
  description:
    "AULIA conçoit et développe des entreprises technologiques spécialisées qui mettent la science, l'intelligence et l'innovation au service des organisations et des systèmes essentiels.",
  /**
   * Formulaire de contact : URL d'un service qui reçoit les demandes (POST).
   * Laisser vide tant qu'aucun backend n'est raccordé : le site l'indiquera
   * honnêtement au visiteur au lieu de simuler un envoi.
   */
  contactEndpoint: CONTACT_ENDPOINT,
  /** Adresse e-mail publique du groupe, si elle existe. Vide = non affichée. */
  contactEmail: CONTACT_EMAIL,
  /** Réseaux professionnels officiels : n'ajouter que des comptes réels. */
  socials: SOCIALS,
};

const nav: { key: RouteKey; label: string }[] = [
  { key: 'about', label: 'À propos' },
  { key: 'vision', label: 'Notre vision' },
  { key: 'ecosystem', label: 'Écosystème' },
  { key: 'anima', label: 'ANIMA' },
  { key: 'research', label: 'Recherche & Innovation' },
  { key: 'partnerships', label: 'Partenariats' },
];

const doctrine = [
  {
    word: 'Comprendre',
    en: 'Understand',
    short: 'Étudier les phénomènes avant de prétendre les maîtriser.',
    long: "Étudier les systèmes, les problèmes, les environnements et leurs mécanismes. Chaque projet AULIA commence par l'observation du terrain, pas par la technologie.",
  },
  {
    word: 'Anticiper',
    en: 'Anticipate',
    short: 'Identifier les risques, les besoins et les transformations à venir.',
    long: "Exploiter les données, les connaissances et l'intelligence pour prévoir les évolutions et les risques, plutôt que de seulement constater les événements.",
  },
  {
    word: 'Créer',
    en: 'Create',
    short: 'Transformer les connaissances en solutions concrètes.',
    long: 'Concevoir des solutions, des technologies et des organisations adaptées aux besoins réels, que nous pouvons construire, déployer, maintenir et améliorer.',
  },
  {
    word: 'Protéger',
    en: 'Protect',
    short: 'Préserver la vie, les données, les systèmes et les intérêts légitimes.',
    long: 'Préserver les personnes, les données, les infrastructures, les ressources et la continuité des systèmes. La sécurité est une exigence d\'architecture, pas une option.',
  },
  {
    word: 'Transformer',
    en: 'Transform',
    short: 'Faire en sorte que les innovations produisent des changements réels.',
    long: "Convertir la connaissance et l'innovation en changements concrets, mesurables et durables dans les organisations qui les adoptent.",
  },
];

const purpose = {
  raison:
    "Concevoir, développer et faire grandir des entreprises capables de mettre l'intelligence, la science et la technologie au service de l'humain, des organisations et des systèmes essentiels.",
  mission:
    'Créer, développer et accompagner des entreprises spécialisées qui transforment les connaissances scientifiques et technologiques en solutions intelligentes, fiables et utiles, tout en partageant une vision, des technologies, des ressources et une gouvernance cohérentes.',
  vision:
    'Devenir un groupe technologique de référence, reconnu pour sa capacité à concevoir et coordonner des entreprises spécialisées capables de comprendre, d\'anticiper, de protéger et de transformer des systèmes complexes.',
};

const name = [
  {
    letters: 'AU',
    latin: 'Aurum',
    title: "L'or",
    text: "Ce qui conserve sa valeur et résiste à la corruption. La noblesse, la permanence, l'incorruptibilité.",
  },
  {
    letters: 'LI',
    latin: 'Lux',
    title: 'La lumière',
    text: "La connaissance, la vérité, la compréhension et la capacité d'éclairer ce qui demeure obscur.",
  },
  {
    letters: 'A',
    latin: 'Anima quae agit',
    title: "L'âme qui agit",
    text: "L'intention transformée en mouvement, la pensée transformée en œuvre, la vision transformée en réalité.",
  },
];


const entities: Entity[] = [
  {
    slug: 'care',
    name: 'AULIA Care',
    short: 'CARE',
    sector: "Santé & systèmes d'information médicale",
    status: 'pilot',
    tagline: "La technologie au service de l'intelligence médicale.",
    summary:
      "Des infrastructures pour que les établissements de santé organisent, protègent et exploitent leurs informations médicales et administratives.",
    presentation: [
      "AULIA Care ne se définit pas comme un logiciel de gestion hospitalière. Sa vocation est de transformer l'information médicale en une connaissance organisée, accessible, fiable et exploitable au bon moment.",
      "L'information médicale doit accompagner le patient tout au long de son parcours de soins, et non rester prisonnière de services, de documents ou de systèmes isolés.",
    ],
    problems: [
      'Des dossiers conservés sur papier, difficiles à retrouver et exposés à la perte.',
      "Des antécédents et des résultats d'examens qui ne sont pas centralisés.",
      'Une information qui circule difficilement entre les services.',
      "Des professionnels qui reçoivent un patient sans disposer de l'ensemble de son historique.",
    ],
    mission:
      "Donner aux établissements de santé les moyens de maîtriser leurs informations, d'améliorer leur organisation et de faire progresser la qualité de la prise en charge, sans jamais se substituer au jugement des professionnels.",
    capabilities: [
      {
        title: 'AULIA Care Core',
        text: "Le socle opérationnel : patients, dossiers médicaux, consultations, hospitalisations, utilisateurs, services et administration. Priorités : fiabilité, sécurité, traçabilité, cohérence des données.",
        status: 'pilot',
      },
      {
        title: 'Diagnostic Agent',
        text: "Une couche d'assistance clinique : extraction et structuration d'informations, synthèses, repérage de facteurs de risque, pistes d'investigation justifiées et soumises au professionnel.",
        status: 'design',
      },
      {
        title: 'Connected Care',
        text: 'Interopérabilité sécurisée : continuité des dossiers entre établissements autorisés, partage contrôlé, intégration de systèmes et équipements compatibles.',
        status: 'design',
      },
    ],
    architecture: [
      {
        title: 'Le Core fonctionne seul',
        text: "Un établissement peut disposer d'une infrastructure opérationnelle sans être obligé d'utiliser l'intelligence artificielle. L'intelligence enrichit le socle ; la connectivité étend ses possibilités.",
      },
      {
        title: 'Souveraineté des données',
        text: "Déploiement dans l'infrastructure de l'établissement lorsque c'est approprié, contrôle des accès selon les responsabilités, journalisation des opérations sensibles, sauvegarde et restauration.",
      },
      {
        title: 'Prouver avant de grandir',
        text: "Consolider le Core, gagner la confiance du terrain, puis développer l'intelligence clinique avec validation, et enfin étendre la connectivité.",
      },
    ],
    demo: {
      label: 'Découvrir la plateforme AULIA Care',
      href: 'https://aulia-care.vercel.app',
      note: 'Site de présentation de la filiale.',
    },
    ecosystem:
      "AULIA Care est la filiale prioritaire de la première phase du groupe : elle doit démontrer la capacité d'AULIA à créer une solution utile, convaincre des établissements et bâtir sa crédibilité.",
    animaLink:
      "À terme, ANIMA pourrait aider à structurer des observations dictées par un professionnel — y compris en swahili — et à faire ressortir les éléments à valider. Cette intégration relève de l'architecture cible.",
  },
  {
    slug: 'vigil',
    name: 'AULIA Vigil',
    short: 'VIGIL',
    sector: 'Industrie, surveillance & intelligence opérationnelle',
    status: 'design',
    tagline: 'Voir, comprendre et anticiper ce qui affecte les installations.',
    summary:
      'Surveiller les équipements et les installations industrielles, détecter les anomalies et anticiper les défaillances.',
    presentation: [
      "AULIA Vigil est destinée à surveiller, comprendre et anticiper les événements qui peuvent affecter les équipements, les infrastructures et les environnements industriels.",
      "Dans des secteurs comme l'exploitation minière, une panne peut représenter des pertes considérables. Les capteurs, l'analyse des données et l'intelligence artificielle peuvent changer cette réalité.",
    ],
    problems: [
      'Des défaillances constatées trop tard, après l\'arrêt de la production.',
      'Des données machines produites mais rarement exploitées.',
      'Des installations étendues difficiles à surveiller en continu.',
      'Des alertes nombreuses et peu contextualisées.',
    ],
    mission:
      'Contribuer à la continuité des opérations industrielles en donnant aux équipes une vision fiable de l\'état de leurs équipements et de leurs installations.',
    capabilities: [
      { title: 'Acquisition de données industrielles', text: 'Connexion aux machines, automates et capteurs.', status: 'design' },
      { title: 'Détection d\'anomalies', text: 'Analyse des comportements inhabituels des équipements.', status: 'design' },
      { title: 'Maintenance prédictive', text: 'Anticipation des défaillances à partir des historiques.', status: 'design' },
      { title: 'Analyse d\'événements', text: 'Exploitation d\'événements issus de caméras et de capteurs, avec niveaux de confiance explicites.', status: 'design' },
    ],
    architecture: [
      { title: 'Du capteur à la décision', text: 'Acquisition, normalisation, détection, contextualisation, puis alerte qualifiée vers les équipes.' },
      { title: 'Robustesse terrain', text: 'Conçue pour des sites où la connectivité peut être limitée.' },
      { title: 'Prudence d\'interprétation', text: 'Une détection n\'est jamais présentée comme une preuve certaine ; elle est accompagnée de son contexte et de son niveau de confiance.' },
    ],
    ecosystem:
      'AULIA Vigil devra prouver sa valeur industrielle sur le terrain avant d\'étendre son périmètre.',
    animaLink:
      "ANIMA pourrait croiser un événement détecté avec des données logistiques autorisées pour réduire les fausses interprétations. Possibilité d'architecture cible.",
  },
  {
    slug: 'flow',
    name: 'AULIA Flow',
    short: 'FLOW',
    sector: 'Intelligence organisationnelle & opérationnelle',
    status: 'design',
    tagline: 'Maîtriser la circulation des informations, des ressources et des opérations.',
    summary:
      'Aider les organisations à maîtriser leurs opérations, leurs ressources, leurs finances, leur production et leurs flux d\'information.',
    presentation: [
      "AULIA Flow vise à améliorer la circulation des informations, des ressources et des opérations au sein des organisations.",
      'Elle doit permettre de comprendre comment les ressources et les informations se déplacent, où elles se bloquent et ce qu\'il faut anticiper.',
    ],
    problems: [
      'Des informations dispersées entre outils, fichiers et services.',
      'Des ruptures de stock et des retards découverts trop tard.',
      'Une visibilité limitée sur les opérations et les performances.',
      'Une coordination difficile entre équipes et sites.',
    ],
    mission:
      'Donner aux organisations une vision claire et à jour de leurs flux pour décider plus tôt et coordonner mieux.',
    capabilities: [
      { title: 'Ressources & approvisionnement', text: 'Suivi des stocks, de la logistique et des approvisionnements.', status: 'design' },
      { title: 'Opérations & production', text: 'Suivi des opérations et coordination des activités.', status: 'design' },
      { title: 'Finances & performance', text: 'Suivi financier et indicateurs de performance.', status: 'design' },
      { title: 'Prévisions opérationnelles', text: 'Analyse des flux et anticipation des tensions.', status: 'design' },
    ],
    architecture: [
      { title: 'Une vue unifiée', text: 'Relier les données opérationnelles qui vivent aujourd\'hui dans des systèmes séparés.' },
      { title: 'Des flux visibles', text: 'Visualiser les processus pour repérer les blocages.' },
      { title: 'Des décisions préparées', text: 'Proposer des actions, toujours soumises à validation.' },
    ],
    ecosystem: 'AULIA Flow porte la dimension organisationnelle de l\'écosystème.',
    animaLink:
      "ANIMA pourrait détecter un risque de rupture, en expliquer les facteurs et préparer une redistribution soumise à validation. Possibilité d'architecture cible.",
  },
  {
    slug: 'vr',
    name: 'AULIA VR',
    short: 'VR',
    sector: 'Réalité virtuelle, simulation & environnements immersifs',
    status: 'explore',
    tagline: 'Explorer ce que l\'immersion permet d\'apprendre, de simuler et de comprendre.',
    summary:
      'Explorer les possibilités de la réalité virtuelle pour la simulation, la formation, l\'apprentissage et les expériences interactives.',
    presentation: [
      'AULIA VR est une branche en exploration, consacrée aux technologies immersives.',
      'Ses premiers travaux visent à identifier les usages où l\'immersion apporte une valeur réelle : former sans risque, simuler avant d\'agir, rendre visibles des systèmes complexes.',
    ],
    problems: [
      'Des formations pratiques coûteuses ou risquées en conditions réelles.',
      'Des systèmes complexes difficiles à se représenter.',
      'Un accès limité à des environnements d\'apprentissage interactifs.',
    ],
    mission:
      'Concevoir des environnements immersifs utiles pour apprendre, simuler et comprendre.',
    capabilities: [
      { title: 'Formation immersive', text: 'Apprentissage de gestes et de procédures en environnement virtuel.', status: 'explore' },
      { title: 'Simulation', text: 'Reproduction de situations pour s\'entraîner et décider.', status: 'explore' },
      { title: 'Visualisation de systèmes', text: 'Représentation spatiale de systèmes complexes.', status: 'explore' },
      { title: 'Expériences interactives', text: 'Applications éducatives et de divertissement.', status: 'explore' },
    ],
    architecture: [
      { title: 'Partir des usages', text: 'Valider la valeur de l\'immersion avant d\'investir dans la production.' },
      { title: 'Profondeur et interaction', text: 'Des environnements spatialisés, pensés pour l\'action.' },
    ],
    ecosystem: 'AULIA VR est présentée comme une branche en développement : aucun produit n\'est commercialisé à ce jour.',
    animaLink: 'Les liens entre AULIA VR et ANIMA restent à définir.',
  },
];

const anima = {
  status: 'target' as const,
  motto: ['Percevoir', 'Comprendre', 'Anticiper', 'Coordonner', 'Agir'],
  mottoEn: ['Perceive', 'Understand', 'Anticipate', 'Coordinate', 'Act'],
  capabilities: [
    { name: 'Perception', text: 'Recevoir des informations issues de textes, de conversations, d\'images, de vidéos et de capteurs.' },
    { name: 'Compréhension', text: 'Interpréter les informations en fonction de leur contexte et des objectifs définis.' },
    { name: 'Mémoire', text: 'Exploiter des connaissances et des historiques autorisés, structurés et contrôlés.' },
    { name: 'Raisonnement', text: 'Analyser des situations, établir des relations, comparer des hypothèses et construire des plans.' },
    { name: 'Anticipation', text: 'Identifier des tendances, estimer des risques et prévoir des évolutions à partir des données disponibles.' },
    { name: 'Coordination', text: 'Orchestrer les interactions entre différents systèmes spécialisés.' },
    { name: 'Action', text: 'Exécuter des opérations autorisées, dans le respect des permissions, des validations et des règles de sécurité.' },
  ],
  modules: [
    { id: 'core', name: 'Noyau ANIMA', role: 'Noyau de coordination' },
    { id: 'perception', name: 'Perception', role: 'Réception et interprétation des informations' },
    { id: 'memory', name: 'Mémoire', role: 'Connaissances et mémoire' },
    { id: 'reasoning', name: 'Raisonnement', role: 'Analyse, raisonnement, planification' },
    { id: 'orchestrator', name: 'Orchestrateur', role: 'Coordination des systèmes et agents' },
    { id: 'action', name: "Moteur d'action", role: 'Exécution contrôlée des opérations' },
    { id: 'governance', name: 'Gouvernance', role: 'Sécurité, autorisations, traçabilité' },
  ],
  scenarios: [
    {
      id: 'A',
      title: 'Structurer une observation clinique',
      systems: ['CARE'],
      context: 'Un professionnel de santé dicte une observation en swahili.',
      steps: [
        'Reconnaissance de la langue',
        'Extraction des informations',
        'Structuration des données',
        'Mise en évidence des signes à surveiller',
        'Présentation au professionnel pour validation',
      ],
      guard: "ANIMA n'est pas un médecin : chaque élément reste soumis au jugement et à la responsabilité du professionnel.",
    },
    {
      id: 'B',
      title: 'Contextualiser un événement détecté',
      systems: ['VIGIL', 'FLOW'],
      context: 'Une caméra détecte un mouvement dans un entrepôt à une heure inhabituelle.',
      steps: [
        'Réception de l\'événement',
        'Recherche du contexte autorisé',
        'Une livraison est enregistrée à cette heure',
        'Interprétation révisée et niveau de confiance',
        'Information de l\'équipe',
      ],
      guard: "Une détection n'est jamais présentée comme une preuve de l'identité ou de l'intention d'une personne.",
    },
    {
      id: 'C',
      title: 'Anticiper une rupture de stock',
      systems: ['FLOW'],
      context: 'Les consommations augmentent sur certains sites.',
      steps: [
        'Identification du risque',
        'Explication des facteurs',
        'Comparaison des stocks disponibles',
        'Proposition de redistribution',
        'Opération préparée, en attente de validation',
      ],
      guard: "L'exécution réelle d'un transfert dépend des autorisations et des règles applicables.",
    },
  ],
  sovereignty: [
    { title: 'Maîtrise des données', text: 'Les données restent sous le contrôle de leurs détenteurs légitimes.' },
    { title: 'Déploiement local', text: 'Une architecture pensée pour fonctionner au plus près du terrain lorsque nécessaire.' },
    { title: 'Hors ligne, quand c\'est possible', text: 'Viser le fonctionnement hors connexion pour les fonctions compatibles.' },
    { title: 'Langues locales', text: 'Travailler la compréhension du swahili, du lingala et des langues de terrain.' },
    { title: 'Contrôle des accès', text: 'Des permissions explicites ; une validation humaine pour les actions importantes.' },
    { title: 'Traçabilité', text: 'Journalisation des opérations et gouvernance des modèles et des connaissances.' },
  ],
};

const research = [
  { title: 'Intelligence artificielle', text: 'Comprendre les modèles plutôt que seulement les utiliser : mathématiques, algèbre linéaire, probabilités et statistiques.' },
  { title: 'Systèmes cognitifs', text: 'Neurosciences et mécanismes cognitifs comme sources d\'inspiration pour la perception, la mémoire et le raisonnement.' },
  { title: 'Automatisation', text: 'Exécution contrôlée d\'opérations, avec permissions et validations explicites.' },
  { title: 'Informatique industrielle', text: 'Acquisition et exploitation des données issues des machines, automates et capteurs.' },
  { title: 'Données & systèmes distribués', text: 'Architectures autonomes et distribuées, capables de fonctionner avec une connectivité limitée.' },
  { title: 'Technologies immersives', text: 'Simulation, formation et visualisation de systèmes complexes.' },
  { title: 'Interconnexion des infrastructures', text: 'Interopérabilité sécurisée entre systèmes et établissements.' },
  { title: 'Interaction humain-machine', text: 'Des interfaces qui rendent l\'intelligence compréhensible et contrôlable.' },
];

export const fr: Content = { statusLabel, site, nav, doctrine, purpose, name, entities, anima, research };
