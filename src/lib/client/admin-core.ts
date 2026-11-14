/** Notifications et appels JSON, partagés par toutes les pages de l'espace interne. */
export function toast(text: string, kind: '' | 'ok' | 'err' = '') {
  let box = document.querySelector('.a-toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'a-toasts';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = `a-toast ${kind}`;
  t.textContent = text;
  box.appendChild(t);
  setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3500);
}

export async function post(url: string, data: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data ?? {}),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(body.error ?? `Erreur ${res.status}`));
  return body;
}

