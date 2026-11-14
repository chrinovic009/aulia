/** Journal inaltérable : chaque action de l'espace interne y est inscrite. */
import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

export async function audit(
  db: Tx,
  actorId: string | null,
  entry: { orgId?: string | null; action: string; entity: string; entityId?: string | null; summary?: string; before?: unknown; after?: unknown },
) {
  await db.auditLog.create({
    data: {
      actorId,
      orgId: entry.orgId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      summary: entry.summary?.slice(0, 500),
      before: entry.before === undefined ? undefined : (JSON.parse(JSON.stringify(entry.before)) as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (JSON.parse(JSON.stringify(entry.after)) as Prisma.InputJsonValue),
    },
  });
}
