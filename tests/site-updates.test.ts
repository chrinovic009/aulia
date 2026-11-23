import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchBlock, UPDATES } from '../src/lib/server/site-updates.ts';
import { blockCatalog } from '../src/data/blocks.ts';

const ch = (k: string) => UPDATES[0].changes.filter((c) => c.block === k);
const code = (k: string, l: 'en' | 'fr') => blockCatalog().find((b) => b.key === k)!.data[l] as any;

test('chaque changement pointe vers un champ existant du code, différent de l’ancienne valeur', () => {
  for (const c of UPDATES.flatMap((u) => u.changes)) {
    for (const l of ['en', 'fr'] as const) {
      const v = c.path.reduce((o: any, k) => o?.[k], code(c.block, l));
      assert.notEqual(v, undefined, `${c.block} ${c.path.join('.')}`);
      assert.notDeepEqual(v, c.from[l]);
    }
  }
});

test('ancienne valeur en ligne → remplacée par celle du code', () => {
  const live = { ...code('page:anima', 'fr'), state: 'Programme de recherche de long terme', archNote: 'texte modifié par le fondateur' };
  const out = patchBlock(live, ch('page:anima'), code('page:anima', 'fr'), 'fr') as any;
  assert.equal(out.state, code('page:anima', 'fr').state);
  assert.equal(out.archNote, 'texte modifié par le fondateur'); // jamais écrasé
});

test('chemin dans un tableau et rien à faire si déjà à jour', () => {
  const fr = code('entity:care', 'fr');
  const live = JSON.parse(JSON.stringify(fr)); live.status = 'dev'; live.capabilities[0].status = 'dev';
  const out = patchBlock(live, ch('entity:care'), fr, 'fr') as any;
  assert.equal(out.status, 'pilot'); assert.equal(out.capabilities[0].status, 'pilot');
  assert.equal(patchBlock(fr, ch('entity:care'), fr, 'fr'), null);
});

test('ajout d’un membre : seulement si la place est libre', () => {
  const c = UPDATES.find((u) => u.id === '2026-11-23-equipe-regal')!.changes;
  const fr = code('team', 'fr');
  const seul = { ...fr, members: [fr.members[0]] };
  const out = patchBlock(seul, c, fr, 'fr') as any;
  assert.equal(out.members.length, 2);
  assert.equal(out.members[1].name, 'Kasompe Kakese Régal');
  const autre = { ...fr, members: [fr.members[0], { ...fr.members[0], name: 'Quelqu’un d’autre' }] };
  assert.equal(patchBlock(autre, c, fr, 'fr'), null);
});
