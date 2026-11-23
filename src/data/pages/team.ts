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

const page = {
  en: {
    eyebrow: 'The team',
    title: 'The people <em>building AULIA.</em>',
    lead: 'From the DRC, a team that grows with the group — each person in their place, at the service of essential systems.',
    aboutLink: 'Why AULIA, why the DRC',
    contactLabel: 'Contact',
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
    ],
  },
  fr: {
    eyebrow: 'L’équipe',
    title: 'Les personnes <em>qui construisent AULIA.</em>',
    lead: 'Depuis la RDC, une équipe qui grandit avec le groupe — chacun à sa place, au service des systèmes essentiels.',
    aboutLink: 'Pourquoi AULIA, pourquoi la RDC',
    contactLabel: 'Contacter',
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
    ],
  },
};

export default page;
