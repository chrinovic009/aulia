/**
 * Paramètres communs aux deux langues.
 *
 * CONTACT_ENDPOINT : URL d'un service qui reçoit les demandes du formulaire (POST).
 *   Laisser vide tant qu'aucun backend n'est raccordé : le site l'indique honnêtement.
 * CONTACT_EMAIL : adresse publique du groupe, si elle existe (vide = non affichée).
 * SOCIALS : réseaux professionnels officiels — n'ajouter que des comptes réels.
 */
export const CONTACT_ENDPOINT = '';
export const CONTACT_EMAIL = '';
export const SOCIALS: { label: string; href: string }[] = [];
