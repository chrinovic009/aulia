/** Aides d'affichage de l'espace interne (organisations visibles, dates, libellés). */
import type { PrismaClient } from '@prisma/client';
import { env } from './env.ts';
import { isFounder, orgsWith, visibleOrgIds, type Perm, type UserCtx } from './authz.ts';

export type OrgOption = { id: string; name: string; slug: string; kind: 'HOLDING' | 'SUBSIDIARY'; status: string };

/** Organisations que la personne peut consulter pour un droit donné. */
export async function orgOptions(db: PrismaClient, u: UserCtx, perm?: Perm): Promise<OrgOption[]> {
  const ids = perm ? orgsWith(u, perm) : visibleOrgIds(u);
  const orgs = await db.organization.findMany({
    where: ids === null ? {} : { id: { in: ids } },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, kind: true, status: true },
  });
  return orgs;
}

/**
 * Organisation choisie (?org=…) parmi celles autorisées.
 * Le fondateur peut choisir « toutes » (valeur null) quand `allowAll` est vrai.
 */
export function pickOrg(options: OrgOption[], wanted: string | null, u: UserCtx, allowAll = false): OrgOption | null {
  if (wanted && wanted !== 'all') {
    const o = options.find((x) => x.id === wanted || x.slug === wanted);
    if (o) return o;
  }
  if (allowAll && isFounder(u)) return null;
  // par défaut : la première filiale de la personne, sinon la première organisation autorisée
  const own = u.memberships.find((m) => options.some((o) => o.id === m.orgId));
  return options.find((o) => o.id === own?.orgId) ?? options[0] ?? null;
}

const TZ = () => env('APP_TIMEZONE') ?? 'Africa/Kinshasa';

export function fmtDate(d: Date | string | null | undefined, withTime = true): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('fr-FR', {
    timeZone: TZ(),
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function ago(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `il y a ${Math.floor(s / 86400)} j`;
  return fmtDate(d, false);
}

export const VERSION_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Brouillon', tone: '' },
  SUBMITTED: { label: 'En attente de validation', tone: 'warn' },
  REJECTED: { label: 'Refusé', tone: 'err' },
  PUBLISHED: { label: 'En ligne', tone: 'ok' },
  ARCHIVED: { label: 'Archivé', tone: '' },
};

export const MEMBER_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Actif', tone: 'ok' },
  SUSPENDED: { label: 'Suspendu', tone: 'warn' },
  ENDED: { label: 'Parti', tone: '' },
};

export const ORG_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Active', tone: 'ok' },
  PREPARING: { label: 'En préparation', tone: 'info' },
  ARCHIVED: { label: 'Archivée', tone: '' },
};

export const MESSAGE_STATUS: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'Nouveau', tone: 'gold' },
  READ: { label: 'Lu', tone: 'info' },
  HANDLED: { label: 'Traité', tone: 'ok' },
  ARCHIVED: { label: 'Archivé', tone: '' },
};

export const TOPIC_LABEL: Record<string, string> = {
  presentation: 'Présentation du groupe',
  care: 'AULIA Care',
  vigil: 'AULIA Vigil',
  flow: 'AULIA Flow',
  vr: 'AULIA VR',
  anima: 'ANIMA',
  partnership: 'Partenariat',
  research: 'Recherche',
  investment: 'Investissement',
  other: 'Autre',
};

export const ACTION_LABEL: Record<string, string> = {
  'founder.bootstrap': 'Création du compte fondateur',
  'org.create': 'Filiale créée',
  'org.update': 'Filiale modifiée',
  'member.invite': 'Invitation',
  'member.invite_revoke': 'Invitation annulée',
  'member.join': 'Arrivée',
  'member.add': 'Rattachement',
  'member.update': 'Membre modifié',
  'content.draft': 'Brouillon',
  'content.submit': 'Soumission',
  'content.publish': 'Publication',
  'content.reject': 'Refus',
  'content.discard': 'Brouillon abandonné',
  'message.update': 'Message',
  'security.2fa_enabled': 'Sécurité',
  'security.reset_2fa': 'Sécurité',
  'security.recovery_code': 'Sécurité',
  'security.recovery_codes': 'Sécurité',
  'security.password_change': 'Sécurité',
  'security.password_reset': 'Sécurité',
  'security.recovery_email': 'Sécurité',
  'security.github_link': 'Sécurité',
  'security.github_unlink': 'Sécurité',
};
