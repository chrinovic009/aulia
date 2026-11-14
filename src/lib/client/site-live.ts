/**
 * Site public : mise à jour en direct quand un contenu validé est mis en ligne,
 * et mesure d'audience (visites et interactions), sans cookie.
 */
import { refreshRegions } from './morph.ts';

const html = document.documentElement;
const lang = html.lang === 'fr' ? 'fr' : 'en';

function beacon(data: Record<string, string>) {
  const body = JSON.stringify(data);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'text/plain' }))) return;
  } catch {}
  fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
}

// ── visites ──
if (!/^(localhost|127\.)/.test(location.hostname) || html.dataset.trackLocal) {
  beacon({ k: 'view', p: location.pathname, l: lang, r: document.referrer });
}

// ── interactions : demandes de présentation, partenariats, liens sortants, éléments marqués ──
document.addEventListener('click', (e) => {
  const el = (e.target as Element | null)?.closest('a, button, [data-track]') as HTMLElement | null;
  if (!el) return;
  const a = el.closest('a') as HTMLAnchorElement | null;
  let label = el.dataset.track ?? '';
  if (!label && a) {
    const href = a.getAttribute('href') ?? '';
    const external = a.host && a.host !== location.host;
    if (external || href.startsWith('mailto:') || href.startsWith('tel:') || /\/(contact|partnerships|partenariats)/.test(href)) {
      label = `${(a.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)} → ${external ? a.host : href}`;
    }
  }
  if (label) beacon({ k: 'click', p: location.pathname, l: lang, t: label });
}, { capture: true });

// ── mises à jour en direct ──
let last = Number(html.dataset.liveSince ?? 0);
let es: EventSource | null = null;
let timer: number | undefined;

function apply() {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      await refreshRegions(['header', 'main', 'footer'], String(last));
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((n) => n.classList.add('is-visible'));
      window.dispatchEvent(new CustomEvent('aulia:content-updated'));
    } catch {}
  }, 250);
}

function open() {
  if (es || !('EventSource' in window)) return;
  es = new EventSource(`/api/live?scope=public&since=${last}`);
  es.addEventListener('change', (ev) => {
    const id = Number((ev as MessageEvent).lastEventId);
    if (id) last = id;
    apply();
  });
}

function close() {
  es?.close();
  es = null;
}

document.addEventListener('visibilitychange', () => (document.hidden ? close() : open()));
if (!document.hidden) open();
