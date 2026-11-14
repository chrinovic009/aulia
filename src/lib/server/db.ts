/**
 * Connexion à PostgreSQL via Prisma.
 * Sans DATABASE_URL, `db` vaut null : le site public reste en ligne avec ses textes de repli
 * et l'espace d'administration affiche un message clair.
 */
import { PrismaClient } from '@prisma/client';
import { env } from './env.ts';

const g = globalThis as unknown as { __auliaDb?: PrismaClient };

export const db: PrismaClient | null = env('DATABASE_URL')
  ? // l'adresse est passée explicitement : en développement, Astro lit .env sans le copier dans process.env
    (g.__auliaDb ??= new PrismaClient({ log: ['error'], datasourceUrl: env('DATABASE_URL') }))
  : null;

export function requireDb(): PrismaClient {
  if (!db) throw new HttpError(503, 'La base de données n’est pas configurée (DATABASE_URL).');
  return db;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
