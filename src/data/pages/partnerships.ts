// Textes de la page « partnerships » (anglais et français).
// Ils servent de version de départ et de repli : la version en ligne est gérée dans
// l'espace d'administration (bloc « page:partnerships ») et validée par le fondateur.
const page = {
  en: {
    title: 'Partnerships',
    meta: 'Building with AULIA: healthcare facilities, industry, organisations, researchers, technology partners and investors.',
    hero: "Let's build <em>what matters.</em>",
    lead: 'Collaborations that turn knowledge, resources and technology into useful, lasting solutions.',
    kEyebrow: 'With whom', kTitle: 'Who we <em>build with.</em>',
    kinds: [
      { icon: 'hospital', title: 'Healthcare facilities', text: 'with AULIA Care', topic: 'care' },
      { icon: 'factory', title: 'Industry & mining', text: 'with AULIA Vigil', topic: 'vigil' },
      { icon: 'building', title: 'Organisations', text: 'with AULIA Flow', topic: 'flow' },
      { icon: 'graduation', title: 'Research & education', text: 'AI, systems, immersion', topic: 'research' },
      { icon: 'plug', title: 'Technology partners', text: 'Strengthen the ecosystem', topic: 'partnership' },
      { icon: 'trend', title: 'Investors', text: 'A long-term build', topic: 'investment' },
    ],
    sEyebrow: 'Approach', sTitle: 'Start small. <em>Prove. Grow.</em>',
    steps: [
      { icon: 'message', title: 'First contact', text: 'Your organisation and goals' },
      { icon: 'search', title: 'Discussion', text: 'Context and constraints' },
      { icon: 'target', title: 'Scoping', text: 'A realistic scope' },
      { icon: 'play', title: 'Pilot', text: 'A first measurable result' },
    ],
    cEyebrow: 'Our commitments', cTitle: 'What you can <em>expect.</em>',
    commit: [
      { icon: 'sun', title: 'Clarity', text: 'Available vs. in development' },
      { icon: 'badge', title: 'No empty promises', text: 'Only validated commitments' },
      { icon: 'lock', title: 'Your data, your control', text: 'Protected and governed' },
      { icon: 'users', title: 'Long-term', text: 'Solutions that evolve with you' },
    ],
    ctaEyebrow: 'Build with AULIA', ctaTitle: 'Let’s talk about what we could <em>build together.</em>', ctaLabel: 'Start a partnership',
  },
  fr: {
    title: 'Partenariats',
    meta: 'Construire avec AULIA : établissements de santé, industries, organisations, chercheurs, partenaires technologiques et investisseurs.',
    hero: 'Construisons <em>ce qui compte.</em>',
    lead: 'Des collaborations qui transforment connaissances, ressources et technologies en solutions utiles et durables.',
    kEyebrow: 'Avec qui', kTitle: 'Avec qui <em>nous construisons.</em>',
    kinds: [
      { icon: 'hospital', title: 'Établissements de santé', text: 'avec AULIA Care', topic: 'care' },
      { icon: 'factory', title: 'Industries & mines', text: 'avec AULIA Vigil', topic: 'vigil' },
      { icon: 'building', title: 'Organisations', text: 'avec AULIA Flow', topic: 'flow' },
      { icon: 'graduation', title: 'Recherche & enseignement', text: 'IA, systèmes, immersion', topic: 'research' },
      { icon: 'plug', title: 'Partenaires technologiques', text: "Renforcer l'écosystème", topic: 'partnership' },
      { icon: 'trend', title: 'Investisseurs', text: 'Une construction de long terme', topic: 'investment' },
    ],
    sEyebrow: 'Démarche', sTitle: 'Commencer petit. <em>Prouver. Grandir.</em>',
    steps: [
      { icon: 'message', title: 'Prise de contact', text: 'Votre organisation et vos objectifs' },
      { icon: 'search', title: 'Échange', text: 'Contexte et contraintes' },
      { icon: 'target', title: 'Cadrage', text: 'Un périmètre réaliste' },
      { icon: 'play', title: 'Pilote', text: 'Un premier résultat mesurable' },
    ],
    cEyebrow: 'Nos engagements', cTitle: 'Ce que vous pouvez <em>attendre.</em>',
    commit: [
      { icon: 'sun', title: 'Clarté', text: 'Disponible ou en développement' },
      { icon: 'badge', title: 'Pas de promesses vides', text: 'Seulement des engagements validés' },
      { icon: 'lock', title: 'Vos données, votre contrôle', text: 'Protégées et gouvernées' },
      { icon: 'users', title: 'Long terme', text: 'Des solutions qui évoluent avec vous' },
    ],
    ctaEyebrow: 'Construire avec AULIA', ctaTitle: 'Parlons de ce que nous pourrions <em>construire ensemble.</em>', ctaLabel: 'Initier un partenariat',
  },
};

export default page;
