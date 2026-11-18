// ANIMA — accueil personnalisé : si la personne est connue, ANIMA la salue par son nom
// et lui annonce les suites données (réponses du fondateur, rendez-vous).
import type { APIRoute } from 'astro';
import { json } from '../../../lib/server/http.ts';
import { db } from '../../../lib/server/db.ts';
import { greetingFor } from '../../../lib/server/anima/memoire.ts';

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export const GET: APIRoute = async (ctx) => {
  const v = ctx.url.searchParams.get('v') ?? '';
  const lang = ctx.url.searchParams.get('lang') === 'en' ? 'en' : 'fr';
  if (!db || !ID_RE.test(v)) return json({ greeting: null });
  try {
    return json({ greeting: await greetingFor(db, v, lang) });
  } catch (err) {
    console.error('[ANIMA accueil]', err);
    return json({ greeting: null });
  }
};
