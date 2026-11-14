import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shapeProblem, diff } from '../src/lib/server/shape.ts';
import { merge } from '../src/data/site.ts';

const base = { title: 'A', items: [{ t: 'x', n: 1 }], flag: true };

test('forme : accepte une modification valide', () => {
  assert.equal(shapeProblem(base, { title: 'B', items: [{ t: 'y', n: 2 }, { t: 'z', n: 3 }], flag: false }), null);
});
test('forme : refuse un changement de type', () => {
  assert.match(shapeProblem(base, { title: 3 })!, /doit être un texte/);
  assert.match(shapeProblem(base, { items: 'x' })!, /doit être une liste/);
  assert.match(shapeProblem(base, { items: [{ t: 1 }] })!, /items › 1 › t/);
});
test('comparaison de versions', () => {
  const d = diff({ a: 'x', l: ['1', '2'] }, { a: 'y', l: ['1'], b: 'n' });
  assert.deepEqual(d.map((r) => r.kind).sort(), ['added', 'changed', 'removed']);
});
test('fusion : la base l’emporte, les nouvelles clés du code restent', () => {
  const m = merge({ a: 'code', nouveau: 'défaut', l: [{ x: 1, y: 2 }] }, { a: 'base', l: [{ x: 5 }, { x: 6, y: 7 }] });
  assert.deepEqual(m, { a: 'base', nouveau: 'défaut', l: [{ x: 5, y: 2 }, { x: 6, y: 7 }] });
  assert.equal(merge('texte', 42), 'texte');
});
