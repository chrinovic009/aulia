// Actions de l'espace interne. Chaque action vérifie les droits (authz.ts) ; la base
// applique en plus ses propres verrous.
import type { MemberStatus, MessageStatus, OrgStatus } from '@prisma/client';
import { handle, json, readJson, str } from '../../../lib/server/http.ts';
import { requireDb, HttpError } from '../../../lib/server/db.ts';
import { can, inScope, strongEnough } from '../../../lib/server/authz.ts';
import { createOrg, inviteMember, resetTwoFactor, revokeInvitation, updateMember, updateOrg } from '../../../lib/server/people.ts';
import { discardDraft, publishVersion, rejectVersion, restoreVersion, saveDraft, submitVersion } from '../../../lib/server/content.ts';
import { audit } from '../../../lib/server/audit.ts';

const ORG_STATUS: OrgStatus[] = ['ACTIVE', 'PREPARING', 'ARCHIVED'];
const MEMBER_STATUS: MemberStatus[] = ['ACTIVE', 'SUSPENDED', 'ENDED'];
const MESSAGE_STATUS: MessageStatus[] = ['NEW', 'READ', 'HANDLED', 'ARCHIVED'];
const pick = <T extends string>(v: unknown, list: T[]) => (list.includes(v as T) ? (v as T) : undefined);

export const POST = handle(async (ctx) => {
  const db = requireDb();
  const u = ctx.locals.user;
  if (!u) throw new HttpError(401, 'Session expirée : reconnectez-vous.');
  if (!strongEnough(u)) throw new HttpError(403, 'Deuxième étape requise.');
  const b = await readJson(ctx);
  const base = ctx.url.origin;

  switch (ctx.params.action) {
    // ── filiales ──
    case 'org-create':
      return json(await createOrg(db, u, { name: str(b.name, 80), slug: str(b.slug, 31), sector: str(b.sector, 80), status: pick(b.status, ORG_STATUS) }));
    case 'org-update':
      return json(await updateOrg(db, u, str(b.id, 40), { name: b.name ? str(b.name, 80) : undefined, sector: b.sector === undefined ? undefined : str(b.sector, 80), status: pick(b.status, ORG_STATUS) }));

    // ── personnes ──
    case 'member-invite':
      return json(await inviteMember(db, u, { orgId: str(b.orgId, 40), email: str(b.email, 254), roleCode: str(b.roleCode, 40), title: str(b.title, 120) }, base));
    case 'member-update':
      return json(await updateMember(db, u, str(b.id, 40), {
        roleCode: b.roleCode ? str(b.roleCode, 40) : undefined,
        title: b.title === undefined ? undefined : str(b.title, 120),
        status: pick(b.status, MEMBER_STATUS),
      }));
    case 'invite-revoke':
      await revokeInvitation(db, u, str(b.id, 40));
      return json({ ok: true });
    case 'reset-2fa':
      await resetTwoFactor(db, u, str(b.userId, 40));
      return json({ ok: true });

    // ── contenu ──
    case 'content-save': {
      const v = await saveDraft(db, u, str(b.blockId, 40), b.locale, b.data, b.note ? str(b.note, 500) : undefined);
      if (b.then === 'submit') return json(await submitVersion(db, u, v.id));
      if (b.then === 'publish') return json(await publishVersion(db, u, v.id, 'Publication directe'));
      return json(v);
    }
    case 'content-submit':
      return json(await submitVersion(db, u, str(b.id, 40)));
    case 'content-publish':
      return json(await publishVersion(db, u, str(b.id, 40), str(b.comment, 2000)));
    case 'content-reject':
      return json(await rejectVersion(db, u, str(b.id, 40), str(b.comment, 2000)));
    case 'content-restore':
      return json(await restoreVersion(db, u, str(b.id, 40)));
    case 'content-discard':
      await discardDraft(db, u, str(b.id, 40));
      return json({ ok: true });

    // ── messages des internautes ──
    case 'message-update': {
      const m = await db.contactMessage.findUnique({ where: { id: str(b.id, 40) } });
      if (!m || !inScope(u, m.orgId) || !can(u, 'messages.handle', m.orgId)) throw new HttpError(404, 'Message introuvable.');
      const status = pick(b.status, MESSAGE_STATUS);
      const out = await db.contactMessage.update({
        where: { id: m.id },
        data: { ...(status ? { status } : {}), ...(b.note !== undefined ? { note: str(b.note, 2000) || null } : {}), handledById: u.id },
      });
      await audit(db, u.id, { orgId: m.orgId, action: 'message.update', entity: 'contact_message', entityId: m.id, summary: `Message de ${m.name} → ${out.status}` });
      return json(out);
    }
  }
  throw new HttpError(404, 'Action inconnue.');
});
