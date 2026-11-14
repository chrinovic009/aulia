/**
 * Filiales, personnes, invitations et rôles.
 * Chaque écriture passe d'abord les règles de authz.ts, puis les verrous de la base.
 */
import type { MemberStatus, OrgStatus, PrismaClient } from '@prisma/client';
import { HttpError } from './db.ts';
import { audit } from './audit.ts';
import { canAddExistingPerson, canAssign, canManageMember, isFounder, strongEnough, type UserCtx } from './authz.ts';
import { inviteMail, sendMail } from './mail.ts';
import { normEmail, validEmail } from './auth.ts';
import { invalidateLive } from './content.ts';

const INVITE_DAYS = 7;

export async function acceptPendingInvitations(db: PrismaClient, userId: string, email: string) {
  const pending = await db.invitation.findMany({ where: { email, status: 'PENDING', expiresAt: { gt: new Date() } } });
  for (const inv of pending) {
    try {
      await db.$transaction(async (tx) => {
        const exists = await tx.membership.findUnique({ where: { userId_orgId: { userId, orgId: inv.orgId } } });
        if (!exists) {
          await tx.membership.create({
            data: { userId, orgId: inv.orgId, roleCode: inv.roleCode, title: inv.title, createdById: inv.invitedById },
          });
        }
        await tx.invitation.update({ where: { id: inv.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
        await audit(tx, userId, { orgId: inv.orgId, action: 'member.join', entity: 'invitation', entityId: inv.id, summary: `Invitation acceptée (${inv.roleCode})` });
      });
    } catch (err) {
      // la personne qui a invité n'a plus ce droit, ou la règle « plusieurs organisations » s'applique
      console.warn('[AULIA] invitation non appliquée', inv.id, String((err as Error).message).slice(0, 200));
    }
  }
}

export async function inviteMember(
  db: PrismaClient,
  u: UserCtx,
  input: { orgId: string; email: string; roleCode: string; title?: string },
  baseUrl: string,
) {
  const email = normEmail(input.email);
  if (!validEmail(email)) throw new HttpError(422, 'Adresse e-mail invalide.');
  const [org, role] = await Promise.all([
    db.organization.findUnique({ where: { id: input.orgId } }),
    db.role.findUnique({ where: { code: input.roleCode } }),
  ]);
  if (!org || org.status === 'ARCHIVED') throw new HttpError(404, 'Organisation introuvable.');
  if (!role) throw new HttpError(422, 'Rôle inconnu.');
  if (!canAssign(u, org, role)) throw new HttpError(403, 'Vous ne pouvez pas attribuer ce rôle dans cette organisation.');
  const title = input.title?.trim().slice(0, 120) || null;

  const existing = await db.user.findUnique({ where: { email }, include: { memberships: { where: { status: 'ACTIVE' } } } });
  if (existing) {
    if (existing.memberships.some((m) => m.orgId === org.id)) throw new HttpError(409, 'Cette personne fait déjà partie de cette organisation.');
    if (!canAddExistingPerson(u, existing.memberships.map((m) => m.orgId), org.id)) {
      throw new HttpError(403, 'Cette personne appartient déjà à une autre organisation du groupe : seul le fondateur peut la rattacher ici.');
    }
    const m = await db.membership.create({ data: { userId: existing.id, orgId: org.id, roleCode: role.code, title, createdById: u.id } });
    await audit(db, u.id, { orgId: org.id, action: 'member.add', entity: 'membership', entityId: m.id, summary: `${existing.name} rattaché(e) à ${org.name} — ${role.labelFr}` });
    await sendMail({ to: email, subject: `Vous avez rejoint ${org.name} (AULIA)`, text: `${u.name} vous a rattaché(e) à ${org.name} avec le rôle « ${role.labelFr} ».\nConnectez-vous : ${baseUrl}/admin/connexion` });
    return { added: true as const };
  }

  // une personne invitée ailleurs (invitation en attente) relève aussi du fondateur
  const elsewhere = await db.invitation.findMany({ where: { email, status: 'PENDING', orgId: { not: org.id }, expiresAt: { gt: new Date() } } });
  if (elsewhere.length && !isFounder(u)) {
    throw new HttpError(403, 'Cette adresse est déjà invitée dans une autre organisation : seul le fondateur peut la rattacher à plusieurs.');
  }

  await db.invitation.updateMany({ where: { email, orgId: org.id, status: 'PENDING' }, data: { status: 'REVOKED' } });
  const inv = await db.invitation.create({
    data: { email, orgId: org.id, roleCode: role.code, title, invitedById: u.id, expiresAt: new Date(Date.now() + INVITE_DAYS * 864e5) },
  });
  await audit(db, u.id, { orgId: org.id, action: 'member.invite', entity: 'invitation', entityId: inv.id, summary: `Invitation envoyée à ${email} — ${role.labelFr}` });
  const sent = await sendMail(inviteMail(email, org.name, role.labelFr, u.name, `${baseUrl}/admin/rejoindre?email=${encodeURIComponent(email)}`));
  return { invited: true as const, mailError: sent.ok ? undefined : sent.error };
}

export async function revokeInvitation(db: PrismaClient, u: UserCtx, id: string) {
  const inv = await db.invitation.findUnique({ where: { id }, include: { role: true, org: true } });
  if (!inv || inv.status !== 'PENDING') throw new HttpError(404, 'Invitation introuvable.');
  if (inv.invitedById !== u.id && !canAssign(u, inv.org, inv.role)) throw new HttpError(403, 'Action non autorisée.');
  await db.invitation.update({ where: { id }, data: { status: 'REVOKED' } });
  await audit(db, u.id, { orgId: inv.orgId, action: 'member.invite_revoke', entity: 'invitation', entityId: id, summary: `Invitation annulée (${inv.email})` });
}

export async function updateMember(
  db: PrismaClient,
  u: UserCtx,
  membershipId: string,
  input: { roleCode?: string; title?: string | null; status?: MemberStatus },
) {
  const m = await db.membership.findUnique({ where: { id: membershipId }, include: { role: true, org: true, user: true } });
  if (!m) throw new HttpError(404, 'Membre introuvable.');
  if (!canManageMember(u, m.orgId, { userId: m.userId, rank: m.role.rank, roleCode: m.roleCode })) {
    throw new HttpError(403, 'Vous ne pouvez pas modifier cette personne.');
  }
  const data: { roleCode?: string; title?: string | null; status?: MemberStatus; endedAt?: Date | null; updatedById: string } = { updatedById: u.id };
  if (input.roleCode && input.roleCode !== m.roleCode) {
    const role = await db.role.findUnique({ where: { code: input.roleCode } });
    if (!role || !canAssign(u, m.org, role)) throw new HttpError(403, 'Vous ne pouvez pas attribuer ce rôle.');
    data.roleCode = role.code;
  }
  if (input.title !== undefined) data.title = input.title?.trim().slice(0, 120) || null;
  if (input.status && input.status !== m.status) {
    data.status = input.status;
    data.endedAt = input.status === 'ENDED' ? new Date() : null;
  }
  const out = await db.membership.update({ where: { id: m.id }, data });
  if (data.status && data.status !== 'ACTIVE') {
    // fin ou suspension : les sessions ouvertes de la personne sont fermées
    const others = await db.membership.count({ where: { userId: m.userId, status: 'ACTIVE' } });
    if (others === 0) await db.session.deleteMany({ where: { userId: m.userId } });
  }
  await audit(db, u.id, {
    orgId: m.orgId, action: 'member.update', entity: 'membership', entityId: m.id,
    summary: `${m.user.name} : ${[data.roleCode && `rôle → ${data.roleCode}`, data.status && `statut → ${data.status}`, input.title !== undefined && 'intitulé'].filter(Boolean).join(', ')}`,
    before: { roleCode: m.roleCode, title: m.title, status: m.status },
    after: { roleCode: out.roleCode, title: out.title, status: out.status },
  });
  return out;
}

const SLUG = /^[a-z][a-z0-9-]{1,30}$/;

export async function createOrg(db: PrismaClient, u: UserCtx, input: { name: string; slug: string; sector?: string; status?: OrgStatus }) {
  if (!isFounder(u) || !strongEnough(u)) throw new HttpError(403, 'Seul le fondateur crée les filiales.');
  const name = input.name?.trim().slice(0, 80);
  const slug = input.slug?.trim().toLowerCase();
  if (!name) throw new HttpError(422, 'Nom obligatoire.');
  if (!SLUG.test(slug)) throw new HttpError(422, 'Identifiant invalide : lettres minuscules, chiffres et tirets (ex. « vigil »).');
  const org = await db.$transaction(async (tx) => {
    const o = await tx.organization.create({
      data: { name, slug, kind: 'SUBSIDIARY', status: input.status ?? 'PREPARING', sector: input.sector?.trim().slice(0, 80) || null, createdById: u.id },
    });
    // la page publique de la filiale (si elle existe déjà) lui est confiée
    const block = await tx.contentBlock.findUnique({ where: { key: `entity:${slug}` } });
    if (block) {
      await tx.contentBlock.update({ where: { id: block.id }, data: { orgId: o.id } });
      await tx.contentVersion.updateMany({ where: { blockId: block.id }, data: { orgId: o.id } });
      await tx.contentLive.updateMany({ where: { blockId: block.id }, data: { orgId: o.id } });
    }
    await audit(tx, u.id, { orgId: o.id, action: 'org.create', entity: 'organization', entityId: o.id, summary: `Filiale créée : ${name}` });
    return o;
  });
  invalidateLive();
  return org;
}

export async function updateOrg(db: PrismaClient, u: UserCtx, id: string, input: { name?: string; sector?: string | null; status?: OrgStatus }) {
  if (!isFounder(u) || !strongEnough(u)) throw new HttpError(403, 'Seul le fondateur modifie les filiales.');
  const before = await db.organization.findUnique({ where: { id } });
  if (!before) throw new HttpError(404, 'Organisation introuvable.');
  if (before.kind === 'HOLDING' && input.status && input.status !== 'ACTIVE') throw new HttpError(422, 'La holding reste active.');
  const out = await db.organization.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name.trim().slice(0, 80) } : {}),
      ...(input.sector !== undefined ? { sector: input.sector?.trim().slice(0, 80) || null } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  });
  await audit(db, u.id, { orgId: id, action: 'org.update', entity: 'organization', entityId: id, summary: `Filiale modifiée : ${out.name}`, before, after: out });
  return out;
}

/** Le fondateur réinitialise la double vérification d'une personne qui a perdu son téléphone. */
export async function resetTwoFactor(db: PrismaClient, u: UserCtx, userId: string) {
  if (!isFounder(u) || !strongEnough(u)) throw new HttpError(403, 'Action réservée au fondateur.');
  if (userId === u.id) throw new HttpError(422, 'Utilisez vos codes de secours pour votre propre compte.');
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new HttpError(404, 'Personne introuvable.');
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { totpSecret: null, totpPending: null, totpEnabledAt: null } }),
    db.recoveryCode.deleteMany({ where: { userId } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  await audit(db, u.id, { action: 'security.reset_2fa', entity: 'user', entityId: userId, summary: `Double vérification réinitialisée pour ${target.name}` });
}
