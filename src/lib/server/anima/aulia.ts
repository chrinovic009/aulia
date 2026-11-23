/**
 * ANIMA — agent « Aulia » : la voix d'AULIA sur son site officiel.
 *
 * Accueille et comprend le visiteur, l'oriente vers la ou les filiales qui le concernent,
 * qualifie les prospects, fixe les rendez-vous dans les disponibilités du fondateur,
 * transmet les demandes et rapporte les suites données, se souvient de chaque personne,
 * crée la page « Ce qu'AULIA ferait pour vous » et enregistre tout dans la Mémoire du Royaume.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { FILIALES, STATUTS, catalogueText, KNOWLEDGE, resolveFiliale, type Lang } from './catalogue.ts';
import { cleanText, contactLine, scoreLead, type Contacts, type LeadData } from './governance.ts';
import type { ToolSpec } from './llm.ts';
import { checkSlot, fmtSlot, freeSlots, getDispo } from './agenda.ts';
import { ensureContact, mailVisitor } from './memoire.ts';
import { sendMail } from '../mail.ts';
import { env } from '../env.ts';
import { founderEmail } from '../auth.ts';
import { orgForTopic } from '../visitors.ts';

export const LEAD_ALERT_THRESHOLD = Number(env('ANIMA_LEAD_ALERT_THRESHOLD') ?? 60);

export function systemPrompt(lang: Lang, memory: string): string {
  const langue = lang === 'fr' ? 'français' : 'anglais (English)';
  const today = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'full', timeZone: 'Africa/Lubumbashi' }).format(new Date());
  return `Tu es ANIMA, l'intelligence d'AULIA, sur le site aulia-holding.com.
LANGUE : réponds dans la langue du DERNIER message du visiteur (pour ce message : ${langue}). S'il change de
langue, change avec lui.
Ton : chaleureux, sobre, professionnel, digne. 2 à 4 phrases. Pas de listes longues.
QUESTIONS : réponds d'abord à ce qu'on te demande. Ne termine PAS chaque réponse par une question.
Ne demande l'organisation ou la fonction du visiteur qu'une seule fois dans la conversation, et seulement
s'il montre un intérêt concret (présentation, pilote, partenariat, investissement). S'il pose simplement des
questions d'information, contente-toi d'y répondre clairement.
Nous sommes le ${today}.

MISSION : comprendre le visiteur (fonction, organisation, secteur, taille, besoin), l'orienter vers
la ou les filiales qui répondent à SON besoin, proposer une présentation et la fixer dans l'agenda,
transmettre ses demandes à l'équipe et lui rapporter les réponses.

FILIALES (statuts réels) :
${catalogueText(lang)}

RÈGLES :
- AULIA Care : sa couche Core est prête à fonctionner dans une clinique et en phase pilote ; les autres
  filiales ne sont pas encore disponibles. Ne dis jamais qu'un produit est installé chez des clients et ne
  cite aucun client ; propose une présentation, un projet pilote ou un partenariat.
- Le fondateur est une information publique : présente-le volontiers (voir FONDATEUR ci-dessous).
- N'invente ni prix, ni délais, ni clients, ni chiffres. Prix, devis, conditions : utilise transmettre_demande.
- Tu es une intelligence artificielle ; ne prétends jamais être humain.
- Ne demande aucune donnée sensible (dossiers de patients, mots de passe, informations bancaires).
- Les emails et téléphones du visiteur te sont masqués (« [email transmis à l'équipe] ») : ils sont bien
  enregistrés, ne les redemande pas.

AGENDA :
- Pour fixer une présentation : appelle proposer_creneaux, propose 2 ou 3 créneaux en clair, puis, quand le
  visiteur en choisit un, appelle reserver_rendez_vous avec la valeur exacte « creneau » renvoyée.
- Il faut un email ou un téléphone avant de réserver : demande-le poliment si besoin.
- N'annonce jamais un rendez-vous que l'outil n'a pas confirmé. Pour l'annuler ou le déplacer : modifier_rendez_vous.

MÉMOIRE :
- Réponse du fondateur « À REFORMULER ET TRANSMETTRE » : c'est une note interne, jamais un texte à recopier.
  Ne la cite pas mot pour mot et ne dis pas « voici la réponse de l'administrateur ». Fais-la tienne :
  pars de ce que la personne t'a dit (sa situation, sa question, ses craintes, ses mots), montre en quoi
  la réponse répond à SON besoin, puis propose la suite logique (rendez-vous, document, étape suivante).
  Garde exactement les faits : montants, dates, durées, conditions, engagements. N'ajoute aucune promesse
  que le fondateur n'a pas faite ; si un point reste flou, propose de le faire préciser (transmettre_demande).
- Rendez-vous « NOUVEAU : à annoncer » : annonce-le clairement (jour, heure, forme), dès ta réponse.
- Appelle-le par son nom s'il est connu. Ne redemande pas ce que tu sais déjà.
- noter_memoire : retiens un fait durable et utile (projet, contrainte, préférence), en une phrase.

OUTILS :
- enregistrer_prospect : dès que tu connais l'organisation ou la fonction, et le besoin.
- transmettre_demande : question que toi seul ne peux pas régler (prix, partenariat précis, document, rappel).
- creer_page_personnalisee : quand le besoin est clair ; 1 à 3 filiales pertinentes.
N'invente jamais les valeurs. Ne parle jamais du fonctionnement interne des outils.

${memory ? `MÉMOIRE DE CETTE PERSONNE :\n${memory}\n` : 'MÉMOIRE : première visite de cette personne.\n'}
AULIA : ${KNOWLEDGE}`;
}

const str = (description: string) => ({ type: 'string', description });
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): ToolSpec =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });

export const TOOLS: ToolSpec[] = [
  fn('enregistrer_prospect', 'Enregistre ou complète le profil du visiteur dans la Mémoire du Royaume.', {
    nom: str('nom du visiteur'), fonction: str('son poste, ex. directeur de clinique'), organisation: str("nom de l'organisation"),
    secteur: str('secteur, ex. santé, mine, logistique'), taille: str('taille, ex. 120 lits, 3 sites, 500 employés'),
    besoin: str('besoin exprimé, en une phrase'),
    interets: { type: 'array', items: { type: 'string', enum: ['CARE', 'VIGIL', 'FLOW', 'VR', 'ANIMA'] }, description: 'filiales qui intéressent le visiteur' },
  }, ['besoin']),
  fn('proposer_creneaux', "Donne les prochains créneaux libres de l'agenda d'AULIA pour une présentation.", {
    apres: str('facultatif : date AAAA-MM-JJ à partir de laquelle chercher, si le visiteur a une préférence'),
  }),
  fn('reserver_rendez_vous', 'Réserve un créneau libre pour le visiteur (après son accord explicite).', {
    creneau: str('valeur exacte « creneau » renvoyée par proposer_creneaux'),
    sujet: str('sujet de la présentation, ex. AULIA Care pour la clinique X'),
    mode: { type: 'string', enum: ['visio', 'appel', 'presentiel'], description: 'forme du rendez-vous souhaitée' },
  }, ['creneau', 'sujet']),
  fn('modifier_rendez_vous', 'Annule ou déplace le prochain rendez-vous du visiteur.', {
    action: { type: 'string', enum: ['annuler', 'deplacer'] },
    nouveau_creneau: str('pour déplacer : valeur exacte « creneau » renvoyée par proposer_creneaux'),
  }, ['action']),
  fn('transmettre_demande', "Transmet au fondateur une demande que l'équipe doit traiter ; sa réponse sera rapportée au visiteur.", {
    sujet: str('objet court de la demande'), details: str('ce que le visiteur demande, en 1 à 3 phrases'),
  }, ['sujet', 'details']),
  fn('noter_memoire', 'Retient un fait durable et utile sur cette personne, pour les prochaines visites.', {
    fait: str('une phrase, ex. prépare un pilote dans sa clinique de Kolwezi pour 2027'),
  }, ['fait']),
  fn('creer_page_personnalisee', "Crée la page « Ce qu'AULIA ferait pour vous » et renvoie son lien.", {
    titre: str('titre court de la page'), profil: str('une phrase décrivant le visiteur et son organisation'),
    besoins: { type: 'array', items: { type: 'string' }, description: '2 à 4 besoins du visiteur' },
    propositions: {
      type: 'array', description: '1 à 3 filiales pertinentes',
      items: { type: 'object', properties: { filiale: { type: 'string', enum: ['CARE', 'VIGIL', 'FLOW', 'VR'] }, apport: str('ce que la filiale apporterait concrètement') }, required: ['filiale', 'apport'] },
    },
    prochaine_etape: str('prochaine étape proposée, ex. une présentation'),
  }, ['propositions']),
];

export type ToolCtx = {
  db: PrismaClient;
  conversationId: string;
  visitorId: string;
  lang: Lang;
  contacts: Contacts;
  origin: string;
  contactId: string | null;
};

async function alertKing(ctx: ToolCtx, subject: string, text: string) {
  const to = env('ANIMA_ALERT_EMAIL') ?? founderEmail();
  if (!to) return;
  const r = await sendMail({ to, subject: `[ANIMA] ${subject}`, text: `${text}\n\nTraiter dans l'espace interne : ${ctx.origin}/admin/anima` });
  if (!r.ok) console.error('[ANIMA alerte]', r.error);
}

async function transcript(db: PrismaClient, conversationId: string): Promise<string> {
  const msgs = await db.animaMessage.findMany({ where: { conversationId }, orderBy: { id: 'asc' }, take: 40 });
  return msgs.map((m) => `${m.role === 'user' ? 'Visiteur' : 'ANIMA'} : ${m.content}`).join('\n');
}

async function contactOf(ctx: ToolCtx, data?: Partial<Record<'nom' | 'organisation' | 'fonction' | 'secteur', string>>) {
  const c = await ensureContact(ctx.db, { conversationId: ctx.conversationId, visitorId: ctx.visitorId, contacts: ctx.contacts, lang: ctx.lang, data });
  ctx.contactId = c.id;
  return c;
}

/** Dépose aussi le prospect dans « Messages » de l'espace d'administration. */
async function toAdminInbox(ctx: ToolCtx, topic: string, name: string, organization: string, message: string) {
  const orgId = await orgForTopic(ctx.db, topic);
  if (!orgId) return;
  await ctx.db.contactMessage.create({
    data: {
      orgId, topic, lang: ctx.lang,
      name: name || (ctx.lang === 'fr' ? 'Visiteur (ANIMA)' : 'Visitor (ANIMA)'),
      email: ctx.contacts.emails[0] ?? '', phone: ctx.contacts.phones[0] ?? null,
      organization: organization || null, message,
    },
  });
}

async function enregistrerProspect(a: Record<string, unknown>, ctx: ToolCtx) {
  const interets = (Array.isArray(a.interets) ? a.interets : [a.interets]).map((x) => resolveFiliale(String(x ?? ''))).filter(Boolean) as string[];
  const lead: LeadData = {
    nom: cleanText(a.nom, 120), organisation: cleanText(a.organisation, 160), fonction: cleanText(a.fonction, 120),
    secteur: cleanText(a.secteur, 120), besoin: cleanText(a.besoin, 600), taille: cleanText(a.taille, 120),
    interets: [...new Set(interets)].join(', '),
    contact: contactLine(ctx.contacts), // vient du serveur, jamais du modèle
  };
  if (!lead.besoin) return { ok: false, erreur: 'argument manquant : besoin' };
  await contactOf(ctx, { nom: lead.nom, organisation: lead.organisation, fonction: lead.fonction, secteur: lead.secteur });
  const prev = await ctx.db.animaLead.findUnique({ where: { conversationId: ctx.conversationId } });
  const merged: LeadData = prev
    ? (Object.fromEntries(Object.entries(lead).map(([k, v]) => [k, v || ((prev as unknown as Record<string, unknown>)[k] as string) || ''])) as LeadData)
    : lead;
  const { score, priorite, raisons } = scoreLead(merged);
  const saved = await ctx.db.animaLead.upsert({
    where: { conversationId: ctx.conversationId },
    create: { conversationId: ctx.conversationId, agent: 'aulia', ...merged, score, priorite, raisons },
    update: { ...merged, score, priorite, raisons },
  });
  let alerted = false;
  if (score >= LEAD_ALERT_THRESHOLD && !saved.alerted) {
    const body =
      'Un prospect prioritaire vient d’arriver sur le site AULIA.\n\n' +
      (['nom', 'fonction', 'organisation', 'secteur', 'taille', 'besoin', 'interets', 'contact'] as const)
        .map((k) => `${k[0].toUpperCase()}${k.slice(1)} : ${merged[k] || '—'}`).join('\n') +
      `\n\nScore : ${score}/100 (${priorite}) — ${raisons.join(', ')}\n\n--- Échange ---\n${await transcript(ctx.db, ctx.conversationId)}`;
    await alertKing(ctx, `Prospect prioritaire (${score}/100) — ${merged.organisation || merged.nom || 'inconnu'}`, body);
    const topic = interets[0] ? FILIALES[interets[0]].slug : 'anima';
    await toAdminInbox(ctx, topic, merged.nom, merged.organisation, `[ANIMA — prospect prioritaire ${score}/100]\n${body}`);
    await ctx.db.animaLead.update({ where: { id: saved.id }, data: { alerted: true } });
    alerted = true;
  }
  return { ok: true, priorite, equipe_prevenue: alerted };
}

async function proposerCreneaux(a: Record<string, unknown>, ctx: ToolCtx) {
  const apres = typeof a.apres === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.apres) ? new Date(`${a.apres}T00:00:00+02:00`) : undefined;
  const slots = await freeSlots(ctx.db, { max: 6, parJour: 2, apres });
  if (!slots.length) return { ok: false, erreur: "aucun créneau libre prochainement : propose de transmettre une demande de rendez-vous à l'équipe" };
  return { ok: true, creneaux: slots.map((d) => ({ creneau: d.toISOString(), libelle: fmtSlot(d, ctx.lang) })) };
}

async function reserverRendezVous(a: Record<string, unknown>, ctx: ToolCtx) {
  if (!ctx.contacts.emails.length && !ctx.contacts.phones.length) {
    return { ok: false, erreur: "le visiteur n'a pas encore laissé d'email ni de téléphone : demande-le-lui avant de réserver" };
  }
  const when = new Date(String(a.creneau ?? ''));
  const check = await checkSlot(ctx.db, when);
  if (!check.ok) return { ok: false, erreur: `créneau impossible (${check.raison}) : rappelle proposer_creneaux` };
  const c = await contactOf(ctx);
  const dispo = await getDispo(ctx.db);
  const mode = ['visio', 'appel', 'presentiel'].includes(String(a.mode)) ? String(a.mode) : dispo.modeParDefaut;
  const sujet = cleanText(a.sujet, 200) || 'Présentation AULIA';
  const status = dispo.autoConfirmer ? 'confirme' : 'propose';
  const req = await ctx.db.animaRequest.create({
    data: { contactId: c.id, conversationId: ctx.conversationId, kind: 'rendez_vous', sujet, details: `Réservé par ANIMA pour le ${fmtSlot(when, 'fr')}`, status: dispo.autoConfirmer ? 'acceptee' : 'nouvelle' },
  });
  const appt = await ctx.db.animaAppointment.create({
    data: { contactId: c.id, requestId: req.id, startsAt: when, durationMin: check.duree, mode, lieu: mode === 'visio' ? dispo.lieu : '', sujet, status, createdBy: 'anima', newsDelivered: true },
  });
  const libelle = fmtSlot(when, 'fr');
  const qui = [c.nom, c.fonction, c.organisation].filter(Boolean).join(' · ') || 'visiteur';
  await alertKing(ctx, `Rendez-vous ${status === 'confirme' ? 'fixé' : 'à confirmer'} — ${libelle}`,
    `ANIMA a ${status === 'confirme' ? 'fixé' : 'réservé (à confirmer)'} un rendez-vous.\n\nAvec : ${qui}\nContact : ${contactLine(ctx.contacts)}\nQuand : ${libelle} (${check.duree} min)\nForme : ${mode}\nSujet : ${sujet}\n\n--- Échange ---\n${await transcript(ctx.db, ctx.conversationId)}`);
  await mailVisitor(ctx.db, c.id, status === 'confirme' ? 'votre rendez-vous est confirmé' : 'votre demande de rendez-vous',
    `${status === 'confirme' ? 'Votre rendez-vous avec AULIA est confirmé' : 'Votre demande de rendez-vous avec AULIA est enregistrée ; nous la confirmons très vite'} :\n\n${libelle} (${check.duree} minutes)\nSujet : ${sujet}\nForme : ${mode}${appt.lieu ? `\n${appt.lieu}` : ''}`);
  return { ok: true, statut: status === 'confirme' ? 'confirmé' : 'en attente de confirmation par AULIA', quand: fmtSlot(when, ctx.lang), duree_min: check.duree, mode, email_envoye: c.emails.length > 0 };
}

async function modifierRendezVous(a: Record<string, unknown>, ctx: ToolCtx) {
  const c = await contactOf(ctx);
  const appt = await ctx.db.animaAppointment.findFirst({ where: { contactId: c.id, status: { in: ['propose', 'confirme'] }, startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } });
  if (!appt) return { ok: false, erreur: 'aucun rendez-vous à venir pour cette personne' };
  if (a.action === 'annuler') {
    await ctx.db.animaAppointment.update({ where: { id: appt.id }, data: { status: 'annule', newsDelivered: true } });
    await alertKing(ctx, `Rendez-vous annulé par le visiteur — ${fmtSlot(appt.startsAt, 'fr')}`, `${c.nom || 'Le visiteur'} a annulé le rendez-vous « ${appt.sujet} » du ${fmtSlot(appt.startsAt, 'fr')}.`);
    return { ok: true, statut: 'annulé' };
  }
  const when = new Date(String(a.nouveau_creneau ?? ''));
  const check = await checkSlot(ctx.db, when, appt.id);
  if (!check.ok) return { ok: false, erreur: `créneau impossible (${check.raison}) : rappelle proposer_creneaux` };
  await ctx.db.animaAppointment.update({ where: { id: appt.id }, data: { startsAt: when, durationMin: check.duree, newsDelivered: true } });
  await alertKing(ctx, `Rendez-vous déplacé — ${fmtSlot(when, 'fr')}`, `${c.nom || 'Le visiteur'} a déplacé « ${appt.sujet} » du ${fmtSlot(appt.startsAt, 'fr')} au ${fmtSlot(when, 'fr')}.`);
  await mailVisitor(ctx.db, c.id, 'votre rendez-vous est déplacé', `Votre rendez-vous « ${appt.sujet} » est déplacé au ${fmtSlot(when, 'fr')}.`);
  return { ok: true, statut: appt.status === 'confirme' ? 'déplacé et confirmé' : 'déplacé, en attente de confirmation', quand: fmtSlot(when, ctx.lang) };
}

async function transmettreDemande(a: Record<string, unknown>, ctx: ToolCtx) {
  const c = await contactOf(ctx);
  const sujet = cleanText(a.sujet, 160), details = cleanText(a.details, 1200);
  if (!sujet) return { ok: false, erreur: 'argument manquant : sujet' };
  await ctx.db.animaRequest.create({ data: { contactId: c.id, conversationId: ctx.conversationId, kind: 'question', sujet, details } });
  await alertKing(ctx, `Demande à traiter — ${sujet}`, `${[c.nom, c.organisation].filter(Boolean).join(' · ') || 'Un visiteur'} demande :\n\n${details}\n\nContact : ${contactLine(ctx.contacts) || 'non communiqué'}\n\nVotre réponse sera transmise par ANIMA à sa prochaine visite${c.emails.length ? ' et par e-mail' : ''}.`);
  return { ok: true, statut: "demande transmise : la réponse de l'équipe vous sera rapportée", contact_connu: c.emails.length + c.phones.length > 0 };
}

async function noterMemoire(a: Record<string, unknown>, ctx: ToolCtx) {
  const fait = cleanText(a.fait, 240);
  if (!fait) return { ok: false, erreur: 'fait vide' };
  const c = await contactOf(ctx);
  const memo = (c.memo ? `${c.memo} · ${fait}` : fait).slice(-1500);
  await ctx.db.animaContact.update({ where: { id: c.id }, data: { memo } });
  return { ok: true };
}

async function creerPage(a: Record<string, unknown>, ctx: ToolCtx) {
  const props: { cle: string; nom: string; domaine: string; statut: string; apport: string }[] = [];
  for (const item of Array.isArray(a.propositions) ? a.propositions : []) {
    const obj = (item && typeof item === 'object' ? item : { filiale: item }) as Record<string, unknown>;
    const key = resolveFiliale(String(obj.filiale ?? ''));
    if (!key || key === 'ANIMA' || props.some((p) => p.cle === key)) continue;
    const f = FILIALES[key];
    props.push({ cle: key, nom: f.nom, domaine: f.domaine[ctx.lang], statut: STATUTS[f.statut][ctx.lang], apport: cleanText(obj.apport, 400) });
  }
  if (!props.length) return { ok: false, erreur: 'aucune filiale valide (CARE, VIGIL, FLOW, VR)' };
  const data = {
    titre: cleanText(a.titre, 120) || (ctx.lang === 'fr' ? "Ce qu'AULIA ferait pour vous" : 'What AULIA would do for you'),
    profil: cleanText(a.profil, 300),
    besoins: (Array.isArray(a.besoins) ? a.besoins : []).map((b) => cleanText(b, 200)).filter(Boolean).slice(0, 4),
    propositions: props.slice(0, 3),
    prochaine_etape: cleanText(a.prochaine_etape, 300),
  };
  const page = await ctx.db.animaPage.create({ data: { conversationId: ctx.conversationId, lang: ctx.lang, data: data as Prisma.InputJsonValue } });
  return { ok: true, url: `${ctx.origin}/api/anima/page/${page.id}` };
}

const HANDLERS: Record<string, (a: Record<string, unknown>, ctx: ToolCtx) => Promise<Record<string, unknown>>> = {
  enregistrer_prospect: enregistrerProspect,
  proposer_creneaux: proposerCreneaux,
  reserver_rendez_vous: reserverRendezVous,
  modifier_rendez_vous: modifierRendezVous,
  transmettre_demande: transmettreDemande,
  noter_memoire: noterMemoire,
  creer_page_personnalisee: creerPage,
};

export async function runTool(name: string, rawArgs: string, ctx: ToolCtx): Promise<Record<string, unknown>> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { ok: false, erreur: 'arguments illisibles' };
  }
  const h = HANDLERS[name];
  if (!h) return { ok: false, erreur: `outil inconnu : ${name}` };
  try {
    return await h(args, ctx);
  } catch (err) {
    console.error('[ANIMA outil]', name, err);
    return { ok: false, erreur: "l'action n'a pas abouti" };
  }
}
