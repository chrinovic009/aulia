/**
 * Page personnalisée « Ce qu'AULIA ferait pour vous », créée par l'agent Aulia d'ANIMA
 * et conservée dans la Mémoire du Royaume (table anima_pages).
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/server/db.ts';
import { publicOrigin } from '../../../../lib/server/http.ts';
import { renderPage } from '../../../../lib/server/anima/page.ts';

const ID = /^[a-z0-9]{20,32}$/;

export const GET: APIRoute = async (ctx) => {
  const id = ctx.params.id ?? '';
  const page = db && ID.test(id) ? await db.animaPage.findUnique({ where: { id } }) : null;
  if (!page) return new Response('Page introuvable', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const home = `${publicOrigin(ctx)}${page.lang === 'fr' ? '/fr' : '/'}`;
  return new Response(renderPage(page.data as never, page.lang, home), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
