/**
 * Règles d'accès de l'espace interne (fonctions pures, testées dans tests/authz.test.ts).
 * Les verrous essentiels sont AUSSI appliqués par la base (déclencheurs) : si une règle
 * était oubliée ici, la base refuserait quand même l'écriture.
 */

export type MemberCtx = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgKind: 'HOLDING' | 'SUBSIDIARY';
  roleCode: string;
  roleLabel: string;
  rank: number;
  permissions: string[];
};

export type UserCtx = {
  id: string;
  email: string;
  name: string;
  totpEnabled: boolean;
  githubLogin: string | null;
  aal: number;
  sessionId: string;
  memberships: MemberCtx[];
};

export type Perm =
  | 'team.manage'
  | 'content.edit'
  | 'content.submit'
  | 'content.publish'
  | 'content.review'
  | 'site.view'
  | 'messages.handle'
  | 'audit.view'
  | 'directory.view';

export const isFounder = (u: UserCtx | null | undefined) =>
  !!u?.memberships.some((m) => m.roleCode === 'founder');

/** Fondateur, validateurs et directions (rang ≤ 20) : deuxième étape obligatoire. */
export const needsStrongAuth = (u: UserCtx) =>
  u.memberships.some((m) => m.rank <= 20 || m.permissions.includes('content.publish'));

export const strongEnough = (u: UserCtx) => !needsStrongAuth(u) || u.aal >= 2;

/** Deuxième étape disponible : application de codes (TOTP) ou compte GitHub relié. */
export const hasSecondFactor = (u: UserCtx) => u.totpEnabled || !!u.githubLogin;

/** Une deuxième étape existe mais n'a pas encore été validée dans cette session. */
export const stepUpPending = (u: UserCtx) => hasSecondFactor(u) && u.aal < 2;

/** Droit `perm` dans l'organisation `orgId`. Le fondateur a tous les droits partout. */
export function can(u: UserCtx | null | undefined, perm: Perm, orgId?: string | null): boolean {
  if (!u || !strongEnough(u)) return false;
  if (isFounder(u)) return true;
  // droits « groupe » (validation du site) valables pour toutes les organisations
  if (u.memberships.some((m) => m.orgKind === 'HOLDING' && m.permissions.includes(perm) && (perm === 'content.publish' || perm === 'content.review' || perm === 'site.view'))) return true;
  return u.memberships.some((m) => (orgId == null || m.orgId === orgId) && m.permissions.includes(perm));
}

/** Organisations dont la personne voit les données (le fondateur : toutes → null). */
export function visibleOrgIds(u: UserCtx): string[] | null {
  if (isFounder(u)) return null;
  return [...new Set(u.memberships.map((m) => m.orgId))];
}

export function orgsWith(u: UserCtx, perm: Perm): string[] | null {
  if (isFounder(u)) return null;
  return [...new Set(u.memberships.filter((m) => m.permissions.includes(perm)).map((m) => m.orgId))];
}

export function inScope(u: UserCtx, orgId: string): boolean {
  const ids = visibleOrgIds(u);
  return ids === null || ids.includes(orgId);
}

/** Rang le plus élevé (plus petit nombre) de la personne dans une organisation. */
export function rankIn(u: UserCtx, orgId: string): number {
  if (isFounder(u)) return 0;
  const ranks = u.memberships.filter((m) => m.orgId === orgId).map((m) => m.rank);
  return ranks.length ? Math.min(...ranks) : Infinity;
}

export type RoleInfo = { code: string; scope: 'GROUP' | 'SUBSIDIARY'; rank: number };

/**
 * Peut-on attribuer le rôle `role` dans l'organisation `org` ?
 * - rôles du groupe et DG : fondateur uniquement ;
 * - sinon : gérer l'équipe de cette organisation et viser un rang inférieur au sien.
 */
export function canAssign(u: UserCtx, org: { id: string; kind: 'HOLDING' | 'SUBSIDIARY' }, role: RoleInfo): boolean {
  if (!strongEnough(u)) return false;
  if (role.code === 'founder') return false;
  if ((role.scope === 'GROUP') !== (org.kind === 'HOLDING')) return false;
  if (isFounder(u)) return true;
  if (role.scope === 'GROUP' || role.code === 'dg') return false;
  if (!can(u, 'team.manage', org.id)) return false;
  return role.rank > rankIn(u, org.id);
}

/** Peut-on modifier (rôle, intitulé, suspension) la personne qui a `targetRank` dans `orgId` ? */
export function canManageMember(u: UserCtx, orgId: string, target: { userId: string; rank: number; roleCode: string }): boolean {
  if (target.userId === u.id) return false;
  if (target.roleCode === 'founder') return false;
  if (isFounder(u)) return strongEnough(u);
  if (target.roleCode === 'dg') return false;
  return can(u, 'team.manage', orgId) && target.rank > rankIn(u, orgId);
}

/** Ajouter à une organisation quelqu'un qui appartient déjà à une autre : fondateur uniquement. */
export function canAddExistingPerson(u: UserCtx, otherOrgIds: string[], targetOrgId: string): boolean {
  const elsewhere = otherOrgIds.filter((id) => id !== targetOrgId);
  if (elsewhere.length === 0) return true;
  return isFounder(u) && strongEnough(u);
}

export const canPublish = (u: UserCtx) => can(u, 'content.publish');
