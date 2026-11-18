/**
 * ANIMA — orchestrateur : fait dialoguer l'agent, le moteur de langage, les outils
 * et la Mémoire du Royaume (tables anima_* de la base du site).
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { HttpError } from '../db.ts';
import { chat, type ChatMessage } from './llm.ts';
import { detectLanguage, extractContacts, mergeContacts, redact, type Contacts } from './governance.ts';
import { runTool, systemPrompt, TOOLS, type ToolCtx } from './aulia.ts';
import { ensureContact, findContact, markDelivered, memoryContext } from './memoire.ts';
import type { Lang } from './catalogue.ts';

const MAX_ROUNDS = 3;
const HISTORY = 14;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 40;

export type ChatInput = {
  message: string;
  visitorId?: string;
  conversationId?: string;
  lang?: Lang;
  channel: 'web' | 'voix';
  hash: string; // empreinte anonyme du visiteur (limite d'usage)
  origin: string;
};

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const newId = (p: string) => `${p}_${randomBytes(9).toString('base64url')}`;

export async function handleChat(db: PrismaClient, input: ChatInput) {
  const started = Date.now();
  const message = input.message.trim().slice(0, 1500);
  const lang: Lang = input.lang ?? detectLanguage(message);

  // limite d'usage : protège les quotas gratuits du moteur
  const recent = await db.animaEvent.count({
    where: { kind: 'msg', at: { gt: new Date(Date.now() - RATE_WINDOW_MS) }, detail: { path: ['h'], equals: input.hash } },
  });
  if (recent >= RATE_MAX) {
    throw new HttpError(429, lang === 'fr' ? 'Beaucoup de messages en peu de temps : réessayez dans quelques minutes.' : 'Many messages in a short time: please try again in a few minutes.');
  }

  const visitorId = input.visitorId && ID_RE.test(input.visitorId) ? input.visitorId : newId('vis');
  let conv = input.conversationId && ID_RE.test(input.conversationId)
    ? await db.animaConversation.findUnique({ where: { id: input.conversationId } })
    : null;
  if (!conv || conv.visitorId !== visitorId) {
    conv = await db.animaConversation.create({ data: { visitorId, agent: 'aulia', lang, channel: input.channel } });
  }

  const contacts: Contacts = mergeContacts((conv.contact as unknown as Contacts) ?? { emails: [], phones: [] }, extractContacts(message));
  await db.animaConversation.update({ where: { id: conv.id }, data: { lang, contact: contacts as unknown as Prisma.InputJsonValue } });
  await db.animaMessage.create({ data: { conversationId: conv.id, role: 'user', content: message } });
  await db.animaEvent.create({ data: { agent: 'aulia', kind: 'msg', conversationId: conv.id, detail: { h: input.hash } } });

  // mémoire : reconnaître la personne (même appareil, ou e-mail / téléphone déjà connus)
  let contactId: string | null = conv.contactId ?? null;
  if (!contactId) {
    const known = await findContact(db, visitorId, contacts);
    if (known || contacts.emails.length || contacts.phones.length) {
      contactId = (await ensureContact(db, { conversationId: conv.id, visitorId, contacts, lang })).id;
    }
  } else if (contacts.emails.length || contacts.phones.length) {
    await ensureContact(db, { conversationId: conv.id, visitorId, contacts, lang });
  }
  const memory = contactId ? await memoryContext(db, contactId, conv.id, lang) : { text: '', requestIds: [] as string[], appointmentIds: [] as string[] };

  const history = await db.animaMessage.findMany({ where: { conversationId: conv.id }, orderBy: { id: 'desc' }, take: HISTORY });
  const msgs: ChatMessage[] = [{ role: 'system', content: systemPrompt(lang, memory.text) }];
  for (const m of history.reverse()) {
    // emails et téléphones ne quittent jamais AULIA
    msgs.push(m.role === 'user' ? { role: 'user', content: redact(m.content, lang) } : { role: 'assistant', content: m.content });
  }

  const ctx: ToolCtx = { db, conversationId: conv.id, visitorId, lang, contacts, origin: input.origin, contactId };
  const actions: { outil: string; resultat: Record<string, unknown> }[] = [];
  let reply = '';
  let engine = '';
  try {
    for (let round = 0; round < MAX_ROUNDS && !reply; round++) {
      const res = await chat(msgs, round === MAX_ROUNDS - 1 ? [] : TOOLS);
      engine = res.engine;
      if (!res.toolCalls.length) {
        reply = res.content;
        break;
      }
      const calls = res.toolCalls.slice(0, 2).map((c, i) => ({ ...c, id: c.id || `appel_${round}_${i}` }));
      msgs.push({ role: 'assistant', content: res.content || null, tool_calls: calls });
      for (const c of calls) {
        const resultat = await runTool(c.function.name, c.function.arguments, ctx);
        actions.push({ outil: c.function.name, resultat });
        await db.animaEvent.create({
          data: { agent: 'aulia', kind: 'action', conversationId: conv.id, detail: { outil: c.function.name, resultat } as Prisma.InputJsonValue },
        });
        msgs.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(resultat) });
      }
    }
  } catch (err) {
    await db.animaEvent.create({ data: { agent: 'aulia', kind: 'erreur', conversationId: conv.id, detail: { message: String((err as Error)?.message ?? err).slice(0, 500) } } });
    throw new HttpError(503, lang === 'fr' ? 'ANIMA est momentanément indisponible.' : 'ANIMA is temporarily unavailable.');
  }

  if (!reply) {
    reply = lang === 'fr' ? 'Merci. Pouvez-vous m’en dire un peu plus sur votre organisation et votre besoin ?' : 'Thank you. Could you tell me a little more about your organisation and your needs?';
  }
  await db.animaMessage.create({ data: { conversationId: conv.id, role: 'assistant', content: reply } });
  // les nouvelles présentes dans la mémoire viennent d'être annoncées
  await markDelivered(db, memory.requestIds, memory.appointmentIds);
  await db.animaEvent.create({
    data: { agent: 'aulia', kind: 'reponse', conversationId: conv.id, detail: { duree_ms: Date.now() - started, moteur: engine, actions: actions.map((a) => a.outil) } },
  });

  const page = actions.find((a) => a.outil === 'creer_page_personnalisee' && a.resultat.ok);
  return {
    conversation_id: conv.id,
    visitor_id: visitorId,
    language: lang,
    reply,
    page_url: (page?.resultat.url as string | undefined) ?? null,
    actions: actions.map((a) => ({ outil: a.outil, ok: Boolean(a.resultat.ok) })),
  };
}
