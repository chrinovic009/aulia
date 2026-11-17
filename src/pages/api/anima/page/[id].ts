/**
 * Page personnalisée « Ce qu'AULIA ferait pour vous », créée par l'agent Aulia d'ANIMA.
 * Le site la récupère auprès de l'API ANIMA et la sert sous son propre domaine.
 */
import type { APIRoute } from 'astro';

const ID = /^page_[a-f0-9]{16}$/;

export const GET: APIRoute = async ({ params }) => {
  const api = (import.meta.env.PUBLIC_ANIMA_API_URL || '').replace(/\/$/, '');
  const id = params.id ?? '';
  if (!api || !ID.test(id)) return new Response('Page introuvable', { status: 404 });
  try {
    const res = await fetch(`${api}/page/${id}`, {
      headers: { 'ngrok-skip-browser-warning': '1' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return new Response('Page introuvable', { status: 404 });
    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch {
    return new Response("ANIMA n'est pas joignable pour le moment. Réessayez dans un instant.", {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
};
