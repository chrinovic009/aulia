/**
 * Espace interne — comportements communs :
 *  - formulaires et boutons d'action (envoi JSON vers /api/admin/…) ;
 *  - mise à jour en direct : à chaque changement dans la base, la page se met à jour seule ;
 *  - confirmations, notifications, menu mobile.
 */
import { refreshRegions } from './morph.ts';
import { post, toast } from './admin-core.ts';

export { post, toast };

const REGIONS = ['#a-main', '#a-links'];

let marker = 0;
export async function refresh() {
  marker++;
  await refreshRegions(REGIONS, `a${Date.now()}${marker}`);
}

/** Valeurs d'un formulaire → objet (cases à cocher → booléen). */
function formData(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = el.value;
  }
  return out;
}

function busy(el: HTMLElement | null, on: boolean) {
  if (!el) return;
  if (on) el.setAttribute('disabled', '');
  else el.removeAttribute('disabled');
}

async function run(action: string, payload: unknown, opts: { ok?: string; redirect?: string; trigger?: HTMLElement | null }) {
  busy(opts.trigger ?? null, true);
  try {
    const out = await post(`/api/admin/${action}`, payload);
    if (opts.ok) toast(opts.ok, 'ok');
    if (out.mailError) toast(String(out.mailError), 'err');
    if (opts.redirect) location.href = opts.redirect.replace('{id}', String(out.id ?? ''));
    else await refresh();
    return out;
  } catch (err) {
    toast((err as Error).message, 'err');
    return null;
  } finally {
    busy(opts.trigger ?? null, false);
  }
}

// formulaires : <form data-action="member-invite" data-ok="Invitation envoyée">
document.addEventListener('submit', async (e) => {
  const form = e.target as HTMLFormElement;
  const action = form.dataset.action;
  if (!action) return;
  e.preventDefault();
  const payload = { ...JSON.parse(form.dataset.payload ?? '{}'), ...formData(form) };
  const out = await run(action, payload, { ok: form.dataset.ok, redirect: form.dataset.redirect, trigger: form.querySelector('[type=submit]') });
  if (out && form.dataset.reset !== 'false') form.reset();
});

// boutons : <button data-action="content-publish" data-payload='{"id":"…"}' data-confirm="Publier ?">
document.addEventListener('click', async (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>('button[data-action]');
  if (!btn) return;
  e.preventDefault();
  if (btn.dataset.confirm && !btn.classList.contains('confirming')) {
    const label = btn.textContent;
    btn.classList.add('confirming');
    btn.textContent = btn.dataset.confirm;
    setTimeout(() => {
      btn.classList.remove('confirming');
      btn.textContent = label;
    }, 3500);
    return;
  }
  btn.classList.remove('confirming');
  let payload = JSON.parse(btn.dataset.payload ?? '{}');
  // champ associé (ex. commentaire de refus) : data-with="#id"
  if (btn.dataset.with) {
    const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(btn.dataset.with);
    if (field) payload = { ...payload, [field.name]: field.value };
  }
  await run(btn.dataset.action!, payload, { ok: btn.dataset.ok, redirect: btn.dataset.redirect, trigger: btn });
});

// changements immédiats : <select data-auto="member-update" data-payload='{"id":"…"}' name="roleCode">
document.addEventListener('change', async (e) => {
  const el = e.target as HTMLSelectElement;
  if (!el.dataset.auto) return;
  await run(el.dataset.auto, { ...JSON.parse(el.dataset.payload ?? '{}'), [el.name]: el.value }, { ok: el.dataset.ok ?? 'Enregistré', trigger: el });
});

// menu mobile
document.querySelector('[data-menu]')?.addEventListener('click', () => document.querySelector('.a-shell')?.classList.toggle('nav-open'));
document.querySelector('.a-nav')?.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a')) document.querySelector('.a-shell')?.classList.remove('nav-open');
});

// déconnexion
document.querySelector('[data-logout]')?.addEventListener('click', async () => {
  await post('/api/auth/logout', {}).catch(() => null);
  location.href = '/admin/connexion';
});

// ── temps réel ──
const badge = document.querySelector('[data-live]');
let es: EventSource | null = null;
let timer: number | undefined;
let pending = false;

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    // on ne met pas la page à jour pendant une saisie : on attend qu'elle se termine
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && (active as HTMLElement).closest('#a-main')) {
      pending = true;
      return;
    }
    pending = false;
    await refresh().catch(() => {});
    document.querySelectorAll('.a-feed li[data-new]').forEach((li) => li.classList.add('new'));
  }, 350);
}

document.addEventListener('focusout', () => {
  if (pending) setTimeout(schedule, 50);
});

function connect() {
  if (es || !('EventSource' in window) || document.body.dataset.live === 'off') return;
  es = new EventSource('/api/live?scope=internal');
  es.addEventListener('open', () => badge?.classList.add('on'));
  es.addEventListener('error', () => badge?.classList.remove('on'));
  es.addEventListener('change', schedule);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    es?.close();
    es = null;
    badge?.classList.remove('on');
  } else {
    connect();
    schedule();
  }
});
connect();
