/**
 * ANIMA — agent « Aulia » : la voix d'AULIA sur son site officiel.
 *
 * Accueille et comprend le visiteur, l'oriente vers la ou les filiales qui le concernent
 * (en disant honnêtement ce qui est prêt et ce qui est en développement), qualifie les
 * prospects, reçoit les demandes de présentation, crée la page « Ce qu'AULIA ferait pour vous »
 * et enregistre tout dans la Mémoire du Royaume.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { FILIALES, STATUTS, catalogueText, KNOWLEDGE, resolveFiliale, type Lang } from './catalogue.ts';
import { cleanText, contactLine, scoreLead, type Contacts, type LeadData } from './governance.ts';
import type { ToolSpec } from './llm.ts';
import { sendMail } from '../mail.ts';
import { env } from '../env.ts';
import { founderEmail } from '../auth.ts';
import { orgForTopic } from '../visitors.ts';

export const LEAD_ALERT_THRESHOLD = Number(env('ANIMA_LEAD_ALERT_THRESHOLD') ?? 60);

export function systemPrompt(lang: Lang): string {
  const langue = lang === 'fr' ? 'français' : 'anglais (English)';
  return `Tu es ANIMA, l'intelligence d'AULIA, sur le site aulia-holding.com. Réponds TOUJOURS en ${langue}.
Ton : chaleureux, sobre, professionnel, digne. 2 à 4 phrases, une seule question à la fois. Pas de listes longues.

MISSION : comprendre le visiteur (fonction, organisation, secteur, taille, besoin), l'orienter vers
la ou les filiales qui répondent à SON besoin, proposer une présentation, enregistrer le prospect.

FILIALES (statuts réels) :
${catalogueText(lang)}

RÈGLES :
- Aucune filiale n'est encore disponible : ne dis jamais qu'un produit est prêt ou installé chez des
  clients ; propose une présentation, un projet pilote ou un partenariat.
- N'invente ni prix, ni délais, ni clients, ni chiffres. Prix : « l'équipe AULIA vous fera une proposition adaptée ».
- Tu es une intelligence artificielle ; ne prétends jamais être humain. Aucun engagement au nom d'AULIA :
  un rendez-vous est une demande, confirmée ensuite par l'équipe.
- Ne demande aucune donnée sensible (dossiers de patients, mots de passe, informations bancaires).
- Pour des raisons de confidentialité, les emails et téléphones du visiteur te sont masqués
  (« [email transmis à l'équipe] ») : ils sont bien enregistrés, ne les redemande pas.

OUTILS :
- enregistrer_prospect : dès que tu connais l'organisation ou la fonction, et le besoin (rappelle-le pour compléter).
- demander_rendez_vous : quand le visiteur accepte une présentation ; s'il n'a pas laissé d'email ou de
  téléphone, demande-le-lui d'abord.
- creer_page_personnalisee : quand le besoin est clair ; 1 à 3 filiales pertinentes.
N'invente jamais les valeurs. Ne parle jamais du fonctionnement interne des outils.

AULIA : ${KNOWLEDGE}`;
}

const str = (description: string) => ({ type: 'string', description });

export const TOOLS: ToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'enregistrer_prospect',
      description: 'Enregistre ou complète le profil du visiteur dans la Mémoire du Royaume.',
      parameters: {
        type: 'object',
        properties: {
          nom: str('nom du visiteur'),
          fonction: str('son poste, ex. directeur de clinique'),
          organisation: str("nom de l'organisation"),
          secteur: str('secteur, ex. santé, mine, logistique'),
          taille: str('taille, ex. 120 lits, 3 sites, 500 employés'),
          besoin: str('besoin exprimé, en une phrase'),
          interets: { type: 'array', items: { type: 'string', enum: ['CARE', 'VIGIL', 'FLOW', 'VR', 'ANIMA'] }, description: 'filiales qui intéressent le visiteur' },
        },
        required: ['besoin'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'demander_rendez_vous',
      description: "Transmet à l'équipe AULIA une demande de présentation (démo), à confirmer par l'équipe.",
      parameters: {
        type: 'object',
        properties: {
          nom: str('nom du visiteur'),
          date_souhaitee: str('date ou créneau souhaité, ou « à convenir »'),
          sujet: str('sujet de la présentation'),
        },
        required: ['sujet'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'creer_page_personnalisee',
      description: "Crée la page « Ce qu'AULIA ferait pour vous » et renvoie son lien.",
      parameters: {
        type: 'object',
        properties: {
          titre: str('titre court de la page'),
          profil: str('une phrase décrivant le visiteur et son organisation'),
          besoins: { type: 'array', items: { type: 'string' }, description: '2 à 4 besoins du visiteur' },
          propositions: {
            type: 'array',
            description: '1 à 3 filiales pertinentes',
            items: {
              type: 'object',
              properties: {
                filiale: { type: 'string', enum: ['CARE', 'VIGIL', 'FLOW', 'VR'] },
                apport: str('ce que la filiale apporterait concrètement à ce visiteur'),
              },
              required: ['filiale', 'apport'],
            },
          },
          prochaine_etape: str('prochaine étape proposée, ex. une présentation'),
        },
        required: ['propositions'],
      },
    },
  },
];

export type ToolCtx = {
  db: PrismaClient;
  conversationId: string;
  lang: Lang;
  contacts: Contacts;
  origin: string;
};

async function alertKing(subject: string, text: string) {
  const to = env('ANIMA_ALERT_EMAIL') ?? founderEmail();
  if (!to) return;
  const r = await sendMail({ to, subject: `[ANIMA] ${subject}`, text });
  if (!r.ok) console.error('[ANIMA alerte]', r.error);
}

async function transcript(db: PrismaClient, conversationId: string): Promise<string> {
  const msgs = await db.animaMessage.findMany({ where: { conversationId }, orderBy: { id: 'asc' }, take: 40 });
  return msgs.map((m) => `${m.role === 'user' ? 'Visiteur' : 'ANIMA'} : ${m.content}`).join('\n');
}

/** Dépose aussi le prospect dans « Messages » de l'espace d'administration. */
async function toAdminInbox(ctx: ToolCtx, topic: string, name: string, organization: string, message: string) {
  const orgId = await orgForTopic(ctx.db, topic);
  if (!orgId) return;
  await ctx.db.contactMessage.create({
    data: {
      orgId, topic, lang: ctx.lang,
      name: name || (ctx.lang === 'fr' ? 'Visiteur (ANIMA)' : 'Visitor (ANIMA)'),
      email: ctx.contacts.emails[0] ?? '',
      phone: ctx.contacts.phones[0] ?? null,
      organization: organization || null,
      message,
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
    await alertKing(`Prospect prioritaire (${score}/100) — ${merged.organisation || merged.nom || 'inconnu'}`, body);
    const topic = interets[0] ? FILIALES[interets[0]].slug : 'anima';
    await toAdminInbox(ctx, topic, merged.nom, merged.organisation, `[ANIMA — prospect prioritaire ${score}/100]\n${body}`);
    await ctx.db.animaLead.update({ where: { id: saved.id }, data: { alerted: true } });
    alerted = true;
  }
  return { ok: true, priorite, equipe_prevenue: alerted };
}

async function demanderRendezVous(a: Record<string, unknown>, ctx: ToolCtx) {
  if (!ctx.contacts.emails.length && !ctx.contacts.phones.length) {
    return { ok: false, erreur: "le visiteur n'a pas encore laissé d'email ni de téléphone : demande-le-lui poliment" };
  }
  const lead = await ctx.db.animaLead.findUnique({ where: { conversationId: ctx.conversationId } });
  const nom = cleanText(a.nom, 120) || lead?.nom || '';
  const text =
    `Demande de présentation reçue par ANIMA.\n\nNom : ${nom || '—'}\nOrganisation : ${lead?.organisation || '—'}\n` +
    `Contact : ${contactLine(ctx.contacts)}\nDate souhaitée : ${cleanText(a.date_souhaitee, 120) || 'à convenir'}\n` +
    `Sujet : ${cleanText(a.sujet, 300) || '—'}\nPriorité du prospect : ${lead?.priorite ?? 'non évaluée'}\n\n` +
    `À confirmer auprès du visiteur.\n\n--- Échange ---\n${await transcript(ctx.db, ctx.conversationId)}`;
  await alertKing(`Demande de présentation — ${nom || lead?.organisation || 'visiteur'}`, text);
  await toAdminInbox(ctx, 'presentation', nom, lead?.organisation ?? '', `[ANIMA — demande de présentation]\n${text}`);
  return { ok: true, statut: "demande transmise ; l'équipe AULIA confirmera la date avec le visiteur" };
}

async function creerPage(a: Record<string, unknown>, ctx: ToolCtx) {
  const props: { cle: string; nom: string; domaine: string; statut: string; apport: string }[] = [];
  for (const item of Array.isArray(a.propositions) ? a.propositions : []) {
    const obj = (item && typeof item === 'object' ? item : { filiale: item }) as Record<string, unknown>;
    const key = resolveFiliale(String(obj.filiale ?? ''));
    if (!key || key === 'ANIMA' || props.some((p) => p.cle === key)) continue;
    const f = FILIALES[key];
    // le statut vient du catalogue, jamais du modèle
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

export async function runTool(name: string, rawArgs: string, ctx: ToolCtx): Promise<Record<string, unknown>> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { ok: false, erreur: 'arguments illisibles' };
  }
  try {
    if (name === 'enregistrer_prospect') return await enregistrerProspect(args, ctx);
    if (name === 'demander_rendez_vous') return await demanderRendezVous(args, ctx);
    if (name === 'creer_page_personnalisee') return await creerPage(args, ctx);
    return { ok: false, erreur: `outil inconnu : ${name}` };
  } catch (err) {
    console.error('[ANIMA outil]', name, err);
    return { ok: false, erreur: "l'action n'a pas abouti" };
  }
}
