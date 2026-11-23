/**
 * ANIMA — suivi des demandes : la note du fondateur devient un e-mail personnel.
 *
 * Le fondateur écrit une note brève dans l'espace interne ; ANIMA la reformule pour la personne,
 * à partir de ce qu'elle avait demandé (sa demande et l'échange d'origine). Les faits sont gardés
 * à l'identique (montants, dates, durées, conditions, engagements) et rien n'est ajouté.
 * Si le moteur de langage est indisponible, la note est envoyée telle quelle : l'e-mail part toujours.
 */
import type { PrismaClient } from '@prisma/client';
import { chat } from './llm.ts';

export async function mailReformule(db: PrismaClient, contactId: string, sujet: string, note: string): Promise<string> {
  const brut = note.trim();
  if (!brut) return '';
  try {
    const [contact, demande] = await Promise.all([
      db.animaContact.findUnique({ where: { id: contactId } }),
      db.animaRequest.findFirst({ where: { contactId, sujet }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const lang = contact?.lang === 'en' ? 'en' : 'fr';
    const echange = demande?.conversationId
      ? await db.animaMessage.findMany({ where: { conversationId: demande.conversationId }, orderBy: { id: 'desc' }, take: 10 })
      : [];
    const contexte = [
      `Sujet de la demande : ${sujet}`,
      demande?.details ? `Ce que la personne demandait : ${demande.details.slice(0, 800)}` : '',
      contact?.organisation ? `Organisation : ${contact.organisation}${contact.fonction ? ` (${contact.fonction})` : ''}` : '',
      echange.length
        ? 'Échange d’origine :\n' + echange.reverse().map((m) => `${m.role === 'user' ? 'Personne' : 'ANIMA'} : ${m.content.slice(0, 300)}`).join('\n')
        : '',
      `Note interne du fondateur (à reformuler, jamais à recopier) : ${brut}`,
    ].filter(Boolean).join('\n\n');

    const res = await chat(
      [
        {
          role: 'system',
          content:
            `Tu es ANIMA, l'assistant d'AULIA. Rédige le corps d'un e-mail ${lang === 'en' ? 'en anglais' : 'en français'} adressé à la personne, ` +
            'à partir de la note interne du fondateur. Pars de son besoin (sa situation, sa question), montre en quoi la réponse y répond, ' +
            'puis indique la suite logique. Garde EXACTEMENT les faits de la note (montants, dates, durées, conditions, engagements) ; ' +
            "n'ajoute aucune promesse, aucun chiffre, aucun fait absent de la note. Ne cite pas la note et ne parle pas d'« administrateur ». " +
            'Pas de formule de salutation ni de signature (elles sont ajoutées automatiquement). 120 mots maximum, ton chaleureux et professionnel, texte brut sans Markdown.',
        },
        { role: 'user', content: contexte },
      ],
      [],
      500,
      15_000,
    );
    const texte = (res.content ?? '').replace(/\*\*/g, '').trim();
    return texte.length >= 20 ? texte : brut;
  } catch (err) {
    console.error('[ANIMA suivi] reformulation impossible, note envoyée telle quelle', err);
    return brut;
  }
}
