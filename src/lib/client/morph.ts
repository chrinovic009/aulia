/**
 * Mise à jour d'une partie de page sans rechargement : on compare l'ancienne et la nouvelle
 * version et on ne change que ce qui diffère (textes, liens, images…). Les éléments
 * inchangés gardent leur état (animations, menus ouverts, écouteurs d'événements).
 */
const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'VIDEO', 'IFRAME', 'TEXTAREA', 'INPUT', 'SELECT']);

function syncAttributes(from: Element, to: Element) {
  for (const { name, value } of Array.from(to.attributes)) {
    if (name === 'style') continue;
    if (name === 'class') {
      // on ajoute les classes nouvelles sans retirer celles posées par les scripts (ex. is-visible)
      for (const c of to.classList) if (!from.classList.contains(c)) from.classList.add(c);
      continue;
    }
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
}

export function morph(from: Node, to: Node): void {
  if (from.nodeType === Node.TEXT_NODE || from.nodeType === Node.COMMENT_NODE) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return;
  }
  if (!(from instanceof Element) || !(to instanceof Element)) return;
  if (SKIP.has(from.tagName) || from.hasAttribute('data-live-skip')) return;
  syncAttributes(from, to);

  const a = Array.from(from.childNodes);
  const b = Array.from(to.childNodes);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (!y) {
      x.parentNode?.removeChild(x);
      continue;
    }
    if (!x) {
      from.appendChild(document.importNode(y, true));
      continue;
    }
    const same = x.nodeType === y.nodeType && (!(x instanceof Element) || x.tagName === (y as Element).tagName);
    if (same) morph(x, y);
    else from.replaceChild(document.importNode(y, true), x);
  }
}

/** Recharge la version actuelle de la page et applique les différences aux zones indiquées. */
export async function refreshRegions(selectors: string[], marker: string): Promise<Document | null> {
  const url = new URL(location.href);
  url.searchParams.set('_live', marker);
  const res = await fetch(url.toString(), { credentials: 'same-origin', headers: { 'X-Aulia-Live': '1' } });
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null;
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  for (const sel of selectors) {
    const cur = document.querySelector(sel);
    const next = doc.querySelector(sel);
    if (cur && next) morph(cur, next);
  }
  if (doc.title && doc.title !== document.title) document.title = doc.title;
  return doc;
}
