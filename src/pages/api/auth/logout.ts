import { handle, json } from '../../../lib/server/http.ts';
import { db } from '../../../lib/server/db.ts';
import { destroySession } from '../../../lib/server/auth.ts';

export const POST = handle(async (ctx) => {
  await destroySession(db, ctx.cookies);
  return json({ next: '/admin/connexion' });
});
