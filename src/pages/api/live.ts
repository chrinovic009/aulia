/**
 * Flux temps réel (Server-Sent Events).
 * Les déclencheurs de la base écrivent un événement à chaque ajout, modification ou
 * suppression (table change_events). Ce flux transmet ces événements aux écrans ouverts :
 *  - scope=public   : contenus mis en ligne (site public) ;
 *  - scope=internal : activité des organisations que la personne connectée peut voir.
 * Les événements ne contiennent aucune donnée : l'écran redemande la page avec ses propres droits.
 * La connexion dure ~50 s puis le navigateur la rouvre automatiquement à partir du dernier événement reçu.
 */
import type { APIRoute } from 'astro';
import { db } from '../../lib/server/db.ts';
import { strongEnough, visibleOrgIds } from '../../lib/server/authz.ts';

const LIFETIME = 50_000;
const PUBLIC_INTERVAL = 5000;
const INTERNAL_INTERVAL = 2000;

type Row = { id: bigint; topic: string; action: string; orgId: string | null; ref: string | null };

/**
 * Site public : un seul appel à la base toutes les 5 s pour tous les visiteurs servis par
 * la même instance, au lieu d'un appel par visiteur. Chaque flux filtre ensuite ce qu'il n'a pas vu.
 */
const shared: { at: number; rows: Row[]; pending: Promise<Row[]> | null } = { at: 0, rows: [], pending: null };
async function recentPublic(): Promise<Row[]> {
  if (Date.now() - shared.at < PUBLIC_INTERVAL - 200) return shared.rows;
  shared.pending ??= db!.changeEvent
    .findMany({ where: { scope: 'public' }, orderBy: { id: 'desc' }, take: 200 })
    .then((rows) => {
      shared.rows = rows.reverse();
      shared.at = Date.now();
      return shared.rows;
    })
    .finally(() => (shared.pending = null));
  return shared.pending;
}

export const GET: APIRoute = async (ctx) => {
  const scope = ctx.url.searchParams.get('scope') === 'internal' ? 'internal' : 'public';
  if (!db) return new Response('retry: 60000\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  const user = ctx.locals.user;
  if (scope === 'internal' && (!user || !strongEnough(user))) return new Response(null, { status: 401 });
  const orgIds = scope === 'internal' && user ? visibleOrgIds(user) : null;
  const interval = scope === 'internal' ? INTERNAL_INTERVAL : PUBLIC_INTERVAL;

  const given = ctx.request.headers.get('last-event-id') ?? ctx.url.searchParams.get('since');
  let last = Number(given ?? 0) || 0;
  if (given === null) {
    const max = await db.changeEvent.aggregate({ _max: { id: true }, where: { scope } });
    last = Number(max._max.id ?? 0);
  }

  const enc = new TextEncoder();
  const signal = ctx.request.signal;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          // le navigateur a fermé la connexion : rien à envoyer, la boucle s'arrête au tour suivant
        }
      };
      send(`retry: 1500\n: AULIA live\n\n`);
      const started = Date.now();
      let beat = Date.now();
      while (!signal.aborted && Date.now() - started < LIFETIME) {
        try {
          const cached = scope === 'public' ? await recentPublic() : null;
          // le cache partagé suffit tant qu'il contient tout ce que ce visiteur n'a pas encore vu
          const rows = cached && (cached.length < 200 || Number(cached[0]!.id) <= last + 1)
            ? cached.filter((r) => Number(r.id) > last)
            : await db!.changeEvent.findMany({
            where: {
              scope,
              id: { gt: BigInt(last) },
              ...(orgIds ? { OR: [{ orgId: { in: orgIds } }] } : {}),
            },
            orderBy: { id: 'asc' },
            take: 200,
          });
          if (rows.length) {
            // regroupe les événements d'un même lot : un seul rafraîchissement côté écran
            const payload = rows.map((r) => ({ t: r.topic, a: r.action, o: r.orgId, r: r.ref }));
            last = Number(rows[rows.length - 1].id);
            send(`id: ${last}\nevent: change\ndata: ${JSON.stringify(payload)}\n\n`);
          } else if (orgIds) {
            // les événements d'autres organisations font quand même avancer le curseur
            const max = await db!.changeEvent.aggregate({ _max: { id: true }, where: { scope } });
            last = Math.max(last, Number(max._max.id ?? 0));
          }
          if (Date.now() - beat > 15_000) {
            send(`: ping\n\n`);
            beat = Date.now();
          }
        } catch (err) {
          console.warn('[AULIA live]', String((err as Error).message).slice(0, 200));
          break;
        }
        await new Promise((r) => setTimeout(r, interval));
      }
      // le nettoyage des anciens événements est fait chaque nuit par /api/cron/cleanup
      try {
        controller.close();
      } catch {
        // déjà fermé par le navigateur
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};
