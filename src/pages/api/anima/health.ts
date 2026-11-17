// ANIMA — état de l'agent : « ok » (conversation) ou « veille » (le visiteur laisse un message).
import { json } from '../../../lib/server/http.ts';
import { db } from '../../../lib/server/db.ts';
import { animaConfigured } from '../../../lib/server/anima/llm.ts';

export const GET = async () => json({ statut: db && animaConfigured() ? 'ok' : 'veille', agents: ['aulia'] });
