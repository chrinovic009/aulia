// Textes de la page « legal » (anglais et français).
// Ils servent de version de départ et de repli : la version en ligne est gérée dans
// l'espace d'administration (bloc « page:legal ») et validée par le fondateur.
const page = {
  en: {
    title: 'Legal notice',
    lead: 'Information about the publisher and hosting of this website.',
    sections: [
      { title: 'Publisher', text: 'Information to be published.', pending: true },
      { title: 'Legal form and registration', text: 'Information to be published.', pending: true },
      { title: 'Registered office', text: 'Information to be published.', pending: true },
      { title: 'Publication director', text: 'Information to be published.', pending: true },
      { title: 'Hosting', text: 'Information to be published.', pending: true },
      { title: 'Intellectual property', text: 'The AULIA name, its logos, content and graphic elements are the property of AULIA. Any reproduction without prior authorisation is prohibited.' },
    ],
  },
  fr: {
    title: 'Mentions légales',
    lead: "Informations relatives à l'éditeur et à l'hébergement du site.",
    sections: [
      { title: 'Éditeur du site', text: 'Information en cours de publication.', pending: true },
      { title: 'Forme juridique et immatriculation', text: 'Information en cours de publication.', pending: true },
      { title: 'Siège', text: 'Information en cours de publication.', pending: true },
      { title: 'Directeur de la publication', text: 'Information en cours de publication.', pending: true },
      { title: 'Hébergement', text: 'Information en cours de publication.', pending: true },
      { title: 'Propriété intellectuelle', text: "Le nom AULIA, ses logos, ses contenus et ses éléments graphiques sont la propriété d'AULIA. Toute reproduction sans autorisation préalable est interdite." },
    ],
  },
};

export default page;
