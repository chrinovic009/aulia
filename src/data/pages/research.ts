// Textes de la page « research » (anglais et français).
// Ils servent de version de départ et de repli : la version en ligne est gérée dans
// l'espace d'administration (bloc « page:research ») et validée par le fondateur.
const page = {
  en: {
    title: 'Research & Innovation',
    meta: 'AULIA’s research directions: artificial intelligence, cognitive systems, industrial computing, distributed systems and immersive technologies.',
    hero: 'Mastering technology, <em>not just using it.</em>',
    lead: 'Building, over time, a genuine scientific capability — rather than depending on technologies designed elsewhere.',
    fEyebrow: 'Foundations', fTitle: 'What we want <em>to master.</em>',
    foundations: ['Mathematics of models', 'Linear algebra', 'Probability & statistics', 'Neuroscience', 'Computer architectures', 'Distributed systems', 'Human-machine interaction'],
    honest: 'An ambition that takes time and rigour. We do not claim to be there yet.',
    aEyebrow: 'Lines of exploration', aTitle: 'Where science <em>can transform systems.</em>',
    mEyebrow: 'Method', mTitle: 'Rigour <em>before visibility.</em>',
    method: [
      { icon: 'pin', title: 'Start from the field', text: 'Real needs first' },
      { icon: 'badge', title: 'Validate, then announce', text: 'Tested and documented' },
      { icon: 'eye', title: 'Explainable', text: 'Visible uncertainty' },
      { icon: 'steps', title: 'Progressive mastery', text: 'Adapt, then build our own' },
    ],
    pEyebrow: 'Publications', empty: 'No publications yet — validated results will be shared here.',
    ctaEyebrow: 'Collaborate', ctaTitle: 'Researchers, engineers, institutions: <em>let’s build together.</em>', ctaLabel: 'Propose a collaboration', ctaSecondary: 'Discover ANIMA',
  },
  fr: {
    title: 'Recherche & Innovation',
    meta: "Les axes de recherche d'AULIA : intelligence artificielle, systèmes cognitifs, informatique industrielle, systèmes distribués et technologies immersives.",
    hero: "Maîtriser la technologie, <em>pas seulement l'utiliser.</em>",
    lead: "Construire, avec le temps, une véritable capacité scientifique — plutôt que dépendre de technologies conçues ailleurs.",
    fEyebrow: 'Fondations', fTitle: 'Ce que nous voulons <em>maîtriser.</em>',
    foundations: ['Mathématiques des modèles', 'Algèbre linéaire', 'Probabilités & statistiques', 'Neurosciences', 'Architectures informatiques', 'Systèmes distribués', 'Interaction humain-machine'],
    honest: "Une ambition qui demande du temps et de la rigueur. Nous ne prétendons pas y être déjà.",
    aEyebrow: "Axes d'exploration", aTitle: 'Là où la science <em>peut transformer les systèmes.</em>',
    mEyebrow: 'Méthode', mTitle: 'La rigueur <em>avant la visibilité.</em>',
    method: [
      { icon: 'pin', title: 'Partir du terrain', text: "Les besoins réels d'abord" },
      { icon: 'badge', title: 'Valider, puis annoncer', text: 'Testé et documenté' },
      { icon: 'eye', title: 'Explicable', text: 'Incertitudes visibles' },
      { icon: 'steps', title: 'Maîtrise progressive', text: 'Adapter, puis construire les nôtres' },
    ],
    pEyebrow: 'Publications', empty: 'Aucune publication pour le moment — les résultats validés seront partagés ici.',
    ctaEyebrow: 'Collaborer', ctaTitle: 'Chercheurs, ingénieurs, institutions : <em>construisons ensemble.</em>', ctaLabel: 'Proposer une collaboration', ctaSecondary: 'Découvrir ANIMA',
  },
};

export default page;
