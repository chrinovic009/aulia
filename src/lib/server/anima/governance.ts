/**
 * ANIMA — gouvernance : règles déterministes que le modèle ne peut pas contourner.
 * Le modèle propose, le code décide : score des prospects, validation des actions,
 * et confidentialité (emails et téléphones ne sont jamais transmis au modèle externe).
 */

export function cleanText(value: unknown, max = 500): string {
  if (value == null) return '';
  const v = Array.isArray(value) ? value.join(', ') : String(value);
  return v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
}

// ---------------------------------------------------------------- confidentialité
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// numéros d'au moins 8 chiffres, avec indicatif éventuel (+243 …)
const PHONE_RE = /(?:\+|00)?\d[\d\s().-]{7,}\d/g;

export type Contacts = { emails: string[]; phones: string[] };

/** Repère les emails et téléphones laissés par le visiteur. */
export function extractContacts(text: string): Contacts {
  const emails = [...new Set(text.match(EMAIL_RE) ?? [])].slice(0, 3);
  const phones = [...new Set((text.replace(EMAIL_RE, ' ').match(PHONE_RE) ?? []).map((p) => p.trim()))]
    .filter((p) => p.replace(/\D/g, '').length >= 8)
    .slice(0, 3);
  return { emails, phones };
}

/** Remplace emails et téléphones par une mention neutre avant l'envoi au modèle externe. */
export function redact(text: string, lang: 'fr' | 'en'): string {
  const e = lang === 'fr' ? '[email transmis à l’équipe]' : '[email shared with the team]';
  const p = lang === 'fr' ? '[téléphone transmis à l’équipe]' : '[phone shared with the team]';
  return text.replace(EMAIL_RE, e).replace(PHONE_RE, (m) => (m.replace(/\D/g, '').length >= 8 ? p : m));
}

export function mergeContacts(a: Contacts, b: Contacts): Contacts {
  return {
    emails: [...new Set([...(a.emails ?? []), ...(b.emails ?? [])])].slice(0, 3),
    phones: [...new Set([...(a.phones ?? []), ...(b.phones ?? [])])].slice(0, 3),
  };
}

export const contactLine = (c: Contacts) => [...(c.emails ?? []), ...(c.phones ?? [])].join(' · ');

// ---------------------------------------------------------------- score des prospects
const ROLE = ['directeur', 'directrice', 'director', 'dg', 'ceo', 'pdg', 'président', 'president', 'fondateur', 'founder',
  'gérant', 'gerant', 'owner', 'propriétaire', 'administrateur', 'médecin chef', 'medecin chef', 'chief', 'ministre',
  'minister', 'gouverneur', 'governor', 'manager', 'responsable', 'head of'];
const SECTORS: [string[], number, string][] = [
  [['hôpital', 'hopital', 'hospital', 'clinique', 'clinic', 'centre de santé', 'health', 'santé', 'sante', 'laboratoire',
    'pharmacie', 'dialyse', 'maternité'], 25, 'secteur santé (AULIA Care)'],
  [['mine', 'minier', 'mining', 'industrie', 'industrial', 'usine', 'factory', 'énergie', 'energy', 'cimenterie'], 25, 'secteur industriel (AULIA Vigil)'],
  [['logistique', 'logistics', 'dépôt', 'depot', 'entrepôt', 'warehouse', 'transport', 'distribution', 'supply'], 20, 'secteur logistique (AULIA Flow)'],
  [['gouvernement', 'government', 'ministère', 'ministry', 'province', 'ong', 'ngo', 'onu', 'banque', 'bank', 'université', 'university'], 20, 'institution'],
];
const INTENT = ['investir', 'investisseur', 'investor', 'invest', 'partenariat', 'partnership', 'partenaire', 'partner',
  'acheter', 'buy', 'contrat', 'contract', 'déployer', 'deploy'];

export type LeadData = Record<'nom' | 'organisation' | 'fonction' | 'secteur' | 'besoin' | 'taille' | 'interets' | 'contact', string>;

export function scoreLead(lead: LeadData): { score: number; priorite: 'haute' | 'moyenne' | 'basse'; raisons: string[] } {
  const blob = [lead.fonction, lead.organisation, lead.secteur, lead.besoin, lead.taille, lead.interets].join(' ').toLowerCase();
  let score = 0;
  const raisons: string[] = [];
  if (ROLE.some((k) => blob.includes(k))) { score += 30; raisons.push('décideur'); }
  for (const [keys, w, label] of SECTORS) if (keys.some((k) => blob.includes(k))) { score += w; raisons.push(label); break; }
  const nums = (lead.taille.match(/\d+/g) ?? []).map(Number);
  const max = nums.length ? Math.max(...nums) : 0;
  if (max >= 50) { score += 20; raisons.push('grande taille'); }
  else if (max >= 10) { score += 10; raisons.push('taille moyenne'); }
  else if (['groupe', 'group', 'réseau', 'network', 'plusieurs sites', 'multi'].some((k) => blob.includes(k))) { score += 15; raisons.push('plusieurs sites / groupe'); }
  if (INTENT.some((k) => blob.includes(k))) { score += 25; raisons.push('intention forte (achat, partenariat, investissement)'); }
  if (lead.contact) { score += 10; raisons.push('contact laissé'); }
  score = Math.min(score, 100);
  return { score, priorite: score >= 60 ? 'haute' : score >= 35 ? 'moyenne' : 'basse', raisons };
}

export function detectLanguage(text: string): 'fr' | 'en' {
  const words = new Set(text.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿœ']+/g) ?? []);
  const en = ['the', 'and', 'is', 'are', 'you', 'what', 'how', 'we', 'our', 'hello', 'hi', 'please', 'want', 'need', 'can', 'my', 'with', 'for', 'your', "i'm", 'would'];
  const fr = ['le', 'la', 'les', 'et', 'est', 'vous', 'nous', 'bonjour', 'je', 'un', 'une', 'des', 'pour', 'avec', 'mon', 'votre', 'quoi', 'comment', 'besoin', 'veux'];
  const ce = en.filter((w) => words.has(w)).length;
  const cf = fr.filter((w) => words.has(w)).length;
  return ce > cf ? 'en' : 'fr';
}
