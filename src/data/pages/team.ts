// Section « L'équipe » (accueil et page À propos), en anglais et en français.
// Version de départ et de repli : la version en ligne est gérée dans l'espace d'administration
// (bloc « team ») et validée par le fondateur. Pour ajouter une personne : « + Ajouter un élément »
// dans la liste des membres, puis « Choisir une photo ».
//
// Réseaux : indiquer l'identifiant (ex. chrinovic009) ou l'adresse complète ; WhatsApp : le numéro
// au format international (+243…). Un champ laissé vide n'affiche pas l'icône.
const founder = {
  photo: '/images/team/tumba-nyembo-chrinovic.webp',
  github: 'chrinovic009',
  linkedin: 'chrinovic009',
  instagram: 'chrinovic_nyembo',
  whatsapp: '+243848621712',
  email: '',
};

const regal = {
  photo: '/images/team/kasompe-kakese-regal.webp',
  github: 'regal06',
  linkedin: '', // à compléter dans l'administration dès qu'il sera connu
  instagram: 'regal_kk6',
  whatsapp: '+243857221542',
  email: '',
};

const page = {
  en: {
    eyebrow: 'The team',
    title: 'The people <em>building AULIA.</em>',
    lead: 'From the DRC, a team that grows with the group — each person in their place, at the service of essential systems.',
    aboutLink: 'Why AULIA, why the DRC',
    contactLabel: 'Contact',
    soonLabel: 'coming soon',
    members: [
      {
        name: 'Tumba Nyembo Chrinovic',
        role: 'Founder of AULIA',
        expertise: 'Software engineer · full-stack developer',
        bio: 'Congolese, born in 2003. He founded AULIA to build, from the DRC, solutions the world can also benefit from.',
        quote: 'I don’t want the DRC to be only a market for foreign innovations.',
        featured: true,
        ...founder,
      },
      {
        name: 'Kasompe Kakese Régal',
        role: 'Supervisor of AULIA Flow',
        expertise: 'Instrumentation engineer',
        bio: 'He helps build AULIA Vigil and supervises AULIA Flow.',
        quote: '',
        featured: false,
        ...regal,
      },
    ],
  },
  fr: {
    eyebrow: 'L’équipe',
    title: 'Les personnes <em>qui construisent AULIA.</em>',
    lead: 'Depuis la RDC, une équipe qui grandit avec le groupe — chacun à sa place, au service des systèmes essentiels.',
    aboutLink: 'Pourquoi AULIA, pourquoi la RDC',
    contactLabel: 'Contacter',
    soonLabel: 'bientôt',
    members: [
      {
        name: 'Tumba Nyembo Chrinovic',
        role: 'Fondateur d’AULIA',
        expertise: 'Ingénieur en génie logiciel · développeur full-stack',
        bio: 'Congolais, né en 2003. Il a fondé AULIA pour construire, depuis la RDC, des solutions dont le monde pourra aussi bénéficier.',
        quote: 'Je ne veux pas que la RDC soit uniquement un marché pour les innovations étrangères.',
        featured: true,
        ...founder,
      },
      {
        name: 'Kasompe Kakese Régal',
        role: 'Superviseur d’AULIA Flow',
        expertise: 'Ingénieur en instrumentation',
        bio: 'Il contribue à la construction d’AULIA Vigil et supervise AULIA Flow.',
        quote: '',
        featured: false,
        ...regal,
      },
    ],
  },
};

export default page;
