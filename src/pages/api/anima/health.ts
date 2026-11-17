// ANIMA — état de l'agent : « ok » (conversation) ou « veille » (le visiteur laisse un message).
// /api/anima/health?verifier=1 : auto-diagnostic du moteur de langage (erreur exacte du fournisseur).
import type { APIRoute } from 'astro';
import { json } from '../../../lib/server/http.ts';
import { db } from '../../../lib/server/db.ts';
import { animaConfigured, probe } from '../../../lib/server/anima/llm.ts';

export const GET: APIRoute = async (ctx) => {
  const statut = db && animaConfigured() ? 'ok' : 'veille';
  if (ctx.url.searchParams.get('verifier') !== '1' || statut !== 'ok') return json({ statut, agents: ['aulia'] });
  return json({ statut, agents: ['aulia'], moteur: await probe() });
};
