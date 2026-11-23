/**
 * Contrôle de forme d'un contenu avant enregistrement : un texte reste un texte, une liste
 * reste une liste… Ainsi, une modification ne peut pas casser la mise en page du site.
 */
export function shapeProblem(base: unknown, data: unknown, path = 'contenu'): string | null {
  if (base === undefined || base === null) return null;
  if (typeof base === 'string') {
    if (typeof data !== 'string') return `« ${path} » doit être un texte.`;
    // une photo envoyée depuis l'éditeur est stockée en image allégée (data:image/…)
    const photo = /› photo$/.test(path) && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(data);
    if (/› photo$/.test(path) && data.startsWith('data:') && !photo) return `« ${path} » n’est pas une image valide.`;
    if (data.length > (photo ? 400_000 : 20000)) return `« ${path} » est trop ${photo ? 'lourde' : 'long'}.`;
    return null;
  }
  if (typeof base === 'number' || typeof base === 'boolean') {
    return typeof data === typeof base ? null : `« ${path} » a un type invalide.`;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(data)) return `« ${path} » doit être une liste.`;
    if (data.length > 200) return `« ${path} » contient trop d’éléments.`;
    const model = base[0];
    for (let i = 0; i < data.length; i++) {
      const p = shapeProblem(i < base.length ? base[i] : model, data[i], `${path} › ${i + 1}`);
      if (p) return p;
    }
    return null;
  }
  if (typeof base === 'object') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return `« ${path} » doit être un groupe de champs.`;
    for (const k of Object.keys(data as object)) {
      const p = shapeProblem((base as Record<string, unknown>)[k], (data as Record<string, unknown>)[k], `${path} › ${k}`);
      if (p) return p;
    }
    return null;
  }
  return null;
}

/** Aplatit un contenu en chemins → valeurs (pour comparer deux versions). */
export function flatten(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(value)) value.forEach((v, i) => flatten(v, prefix ? `${prefix} › ${i + 1}` : String(i + 1), out));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix} › ${k}` : k, out);
  else if (typeof value === 'string' && value.startsWith('data:image/')) out[prefix] = `[photo envoyée · ${Math.round(value.length / 1365)} Ko]`;
  else out[prefix] = value === undefined || value === null ? '' : String(value);
  return out;
}

export type DiffRow = { path: string; before: string; after: string; kind: 'added' | 'removed' | 'changed' };

export function diff(before: unknown, after: unknown): DiffRow[] {
  const a = flatten(before);
  const b = flatten(after);
  const rows: DiffRow[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in a)) rows.push({ path: k, before: '', after: b[k], kind: 'added' });
    else if (!(k in b)) rows.push({ path: k, before: a[k], after: '', kind: 'removed' });
    else if (a[k] !== b[k]) rows.push({ path: k, before: a[k], after: b[k], kind: 'changed' });
  }
  return rows;
}
