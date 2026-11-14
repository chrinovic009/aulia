import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as a from '../src/lib/server/authz.ts';

const P: Record<string, string[]> = {
  founder: ['group.all', 'content.publish', 'content.edit', 'content.submit', 'team.manage', 'site.view', 'messages.handle', 'audit.view'],
  dg: ['team.manage', 'content.edit', 'content.submit', 'site.view', 'messages.handle', 'audit.view', 'directory.view'],
  deputy: ['team.manage', 'content.edit', 'content.submit', 'site.view', 'messages.handle', 'audit.view', 'directory.view'],
  staff: ['directory.view'],
  public_validator: ['content.publish', 'content.review', 'site.view'],
};
const R: Record<string, number> = { founder: 0, public_validator: 5, dg: 10, deputy: 20, staff: 50 };
const m = (orgId: string, roleCode: string) => ({ orgId, orgSlug: orgId, orgName: orgId, orgKind: orgId === 'aulia' ? 'HOLDING' as const : 'SUBSIDIARY' as const, roleCode, roleLabel: roleCode, rank: R[roleCode], permissions: P[roleCode] });
const user = (id: string, aal: number, ...ms: ReturnType<typeof m>[]): a.UserCtx => ({ id, email: id, name: id, totpEnabled: aal > 1, githubLogin: null, aal, sessionId: 's', memberships: ms });

const F = user('F', 2, m('aulia', 'founder'));
const D = user('D', 2, m('care', 'dg'));
const Dweak = user('D', 1, m('care', 'dg'));
const P2 = user('P', 2, m('care', 'deputy'));
const E = user('E', 1, m('care', 'staff'));
const V = user('V', 2, m('aulia', 'public_validator'));
const care = { id: 'care', kind: 'SUBSIDIARY' as const };
const holding = { id: 'aulia', kind: 'HOLDING' as const };
const role = (code: string, scope: 'GROUP' | 'SUBSIDIARY' = 'SUBSIDIARY') => ({ code, scope, rank: R[code] ?? 30 });

test('le fondateur voit et peut tout, avec la 2e étape', () => {
  assert.equal(a.visibleOrgIds(F), null);
  assert.ok(a.can(F, 'content.publish'));
  assert.ok(a.canAssign(F, care, role('dg')));
  assert.ok(!a.can({ ...F, aal: 1 }, 'content.publish'));
});

test('un DG est cantonné à sa filiale et ne publie pas', () => {
  assert.deepEqual(a.visibleOrgIds(D), ['care']);
  assert.ok(a.can(D, 'content.submit', 'care'));
  assert.ok(!a.can(D, 'content.submit', 'vigil'));
  assert.ok(!a.can(D, 'content.edit', 'aulia'));
  assert.ok(!a.canPublish(D));
  assert.ok(a.can(D, 'site.view', 'care') && !a.can(D, 'site.view', 'vigil'));
});

test('sans 2e étape, un DG n’a aucun droit', () => {
  assert.ok(!a.strongEnough(Dweak));
  assert.ok(!a.can(Dweak, 'team.manage', 'care'));
});

test('attribution des rôles : catalogue, rang et DG', () => {
  assert.ok(a.canAssign(D, care, role('deputy')));
  assert.ok(a.canAssign(D, care, role('staff')));
  assert.ok(!a.canAssign(D, care, role('dg')));
  assert.ok(!a.canAssign(D, holding, role('transversal', 'GROUP')));
  assert.ok(!a.canAssign(P2, care, role('deputy')));
  assert.ok(a.canAssign(P2, care, role('staff')));
  assert.ok(!a.canAssign(E, care, role('staff')));
  assert.ok(!a.canAssign(F, care, role('transversal', 'GROUP')));
  assert.ok(!a.canAssign(F, holding, role('founder', 'GROUP')));
});

test('gestion des membres', () => {
  assert.ok(a.canManageMember(D, 'care', { userId: 'E', rank: 50, roleCode: 'staff' }));
  assert.ok(!a.canManageMember(D, 'care', { userId: 'D', rank: 10, roleCode: 'dg' }));
  assert.ok(!a.canManageMember(P2, 'care', { userId: 'D', rank: 10, roleCode: 'dg' }));
  assert.ok(a.canManageMember(F, 'care', { userId: 'D', rank: 10, roleCode: 'dg' }));
  assert.ok(!a.canManageMember(F, 'aulia', { userId: 'X', rank: 0, roleCode: 'founder' }));
});

test('rattacher une personne à plusieurs organisations : fondateur uniquement', () => {
  assert.ok(a.canAddExistingPerson(D, [], 'care'));
  assert.ok(!a.canAddExistingPerson(D, ['vigil'], 'care'));
  assert.ok(a.canAddExistingPerson(F, ['vigil'], 'care'));
});

test('validateur délégué : publie, ne gère pas les équipes', () => {
  assert.ok(a.canPublish(V));
  assert.ok(a.can(V, 'site.view', 'care'));
  assert.ok(!a.can(V, 'team.manage', 'care'));
  assert.ok(a.needsStrongAuth(V));
});
