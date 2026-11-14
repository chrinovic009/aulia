// Textes de la page « privacy » (anglais et français).
// Ils servent de version de départ et de repli : la version en ligne est gérée dans
// l'espace d'administration (bloc « page:privacy ») et validée par le fondateur.
const page = {
  en: {
    title: 'Privacy policy',
    lead: 'How AULIA handles the information sent by visitors to this portal.',
    sections: [
      { title: 'Data collected', text: 'The portal only collects the information you voluntarily enter in the contact form: name, organisation, email, phone, subject and message.' },
      { title: 'Purpose', text: 'This information is used solely to respond to your request and to follow up on the relationship you initiate with AULIA.' },
      { title: 'Data separation', text: 'Commercial information from the portal is strictly separated from the operational data of the group’s companies (health data, industrial data). The public portal has no access to any of that data.' },
      { title: 'Analytics and cookies', text: 'The portal uses no cookies for visitors. To count visits, it records the page viewed, the language, the approximate country and the type of device, together with an anonymous daily fingerprint that cannot identify you and is never kept as an IP address. Your browser may store locally your language preference and the fact that the opening animation has already been shown.' },
      { title: 'Retention period', text: 'Information to be published.', pending: true },
      { title: 'Your rights', text: 'You may request access to, correction or deletion of your information by writing to us via the Contact page.' },
      { title: 'Data controller', text: 'Information to be published.', pending: true },
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    lead: 'Comment AULIA traite les informations transmises par les visiteurs du portail.',
    sections: [
      { title: 'Données collectées', text: 'Le portail ne collecte que les informations que vous saisissez volontairement dans le formulaire de contact : nom, organisation, e-mail, téléphone, objet et message.' },
      { title: 'Finalité', text: 'Ces informations servent uniquement à répondre à votre demande et à assurer le suivi de la relation que vous initiez avec AULIA.' },
      { title: 'Séparation des données', text: "Les informations commerciales du portail sont strictement séparées des données opérationnelles des entreprises du groupe (données de santé, données industrielles). Le portail public n'a accès à aucune de ces données." },
      { title: "Mesure d'audience et cookies", text: "Le portail n'utilise aucun cookie pour les visiteurs. Pour compter les visites, il enregistre la page consultée, la langue, le pays approximatif et le type d'appareil, avec une empreinte quotidienne anonyme qui ne permet pas de vous identifier (aucune adresse IP n'est conservée). Votre navigateur peut mémoriser localement votre préférence de langue et le fait que l'animation d'accueil a déjà été vue." },
      { title: 'Durée de conservation', text: 'Information en cours de publication.', pending: true },
      { title: 'Vos droits', text: "Vous pouvez demander l'accès, la rectification ou la suppression de vos informations en nous écrivant via la page Contact." },
      { title: 'Responsable du traitement', text: 'Information en cours de publication.', pending: true },
    ],
  },
};

export default page;
