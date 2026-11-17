// ANIMA — conversation avec l'agent Aulia (widget du site : orbe en bas à droite).
import { handle, json, readJson, str, publicOrigin } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { visitorHash } from '../../../lib/server/visitors.ts';
import { animaConfigured } from '../../../lib/server/anima/llm.ts';
import { handleChat } from '../../../lib/server/anima/orchestrator.ts';

export const POST = handle(async (ctx) => {
  if (!animaConfigured()) throw new HttpError(503, 'ANIMA est en veille.');
  const db = requireDb();
  const b = await readJson(ctx, 12_000);
  const message = str(b.message, 1500);
  if (!message) throw new HttpError(422, 'Message vide.');
  const out = await handleChat(db, {
    message,
    visitorId: str(b.visitor_id, 64) || undefined,
    conversationId: str(b.conversation_id, 64) || undefined,
    lang: b.language === 'en' ? 'en' : b.language === 'fr' ? 'fr' : undefined,
    channel: b.channel === 'voix' ? 'voix' : 'web',
    hash: visitorHash(ctx.request),
    origin: publicOrigin(ctx),
  });
  return json(out);
});
