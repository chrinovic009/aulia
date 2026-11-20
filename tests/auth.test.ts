import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_SECRET = 'test-secret-de-plus-de-trente-deux-caracteres';
const auth = await import('../src/lib/server/auth.ts');

type Row = { id: string; email: string; purpose: string; codeHash: string; attempts: number; consumedAt: Date | null; expiresAt: Date; createdAt: Date };

/** Fausse base : juste ce que les fonctions de connexion utilisent. */
function fakeDb() {
  const otps: Row[] = [];
  const attempts: { email: string; ok: boolean; at: Date }[] = [];
  let n = 0;
  const db = {
    otpCode: {
      count: async ({ where }: any) => otps.filter((o) => o.email === where.email && o.createdAt >= where.createdAt.gte).length,
      updateMany: async ({ where, data }: any) => {
        for (const o of otps) if (o.email === where.email && o.purpose === where.purpose && !o.consumedAt) Object.assign(o, data);
      },
      create: async ({ data }: any) => {
        const row = { id: String(++n), attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
        otps.push(row);
        return row;
      },
      findFirst: async ({ where }: any) =>
        otps.filter((o) => o.email === where.email && o.purpose === where.purpose && !o.consumedAt && o.expiresAt > new Date()).at(-1) ?? null,
      update: async ({ where, data }: any) => {
        const o = otps.find((x) => x.id === where.id)!;
        if (data.attempts?.increment) o.attempts += data.attempts.increment;
        if (data.consumedAt) o.consumedAt = data.consumedAt;
      },
    },
    loginAttempt: {
      count: async ({ where }: any) => attempts.filter((a) => a.email === where.email && a.ok === where.ok && a.at >= where.at.gte).length,
      create: async ({ data }: any) => attempts.push({ ...data, at: new Date() }),
    },
  };
  return { db: db as any, otps };
}

/** Récupère le code envoyé : sans clé Resend, les e-mails s'affichent dans la console. */
async function issueAndCatch(db: any, email: string) {
  const logs: string[] = [];
  const orig = console.log;
  const origInfo = console.info;
  console.log = console.info = (...a: unknown[]) => void logs.push(a.join(' '));
  try {
    const r = await auth.issueOtp(db, email, 'LOGIN' as any);
    return { r, code: logs.join('\n').match(/\b\d{6}\b/)?.[0] };
  } finally {
    console.log = orig;
    console.info = origInfo;
  }
}

test('un bon code à 6 chiffres est accepté une seule fois', async () => {
  const { db } = fakeDb();
  const { r, code } = await issueAndCatch(db, 'a@aulia.test');
  assert.ok(r.ok);
  assert.match(code!, /^\d{6}$/);
  assert.equal(await auth.verifyOtp(db, 'a@aulia.test', 'LOGIN' as any, code!), true);
  assert.equal(await auth.verifyOtp(db, 'a@aulia.test', 'LOGIN' as any, code!), false);
});

test('après 5 mauvais codes, même le bon code est refusé', async () => {
  const { db } = fakeDb();
  const { code } = await issueAndCatch(db, 'b@aulia.test');
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) assert.equal(await auth.verifyOtp(db, 'b@aulia.test', 'LOGIN' as any, wrong), false);
  assert.equal(await auth.verifyOtp(db, 'b@aulia.test', 'LOGIN' as any, code!), false);
});

test('un code expiré est refusé', async () => {
  const { db, otps } = fakeDb();
  const { code } = await issueAndCatch(db, 'c@aulia.test');
  otps[0]!.expiresAt = new Date(Date.now() - 1000);
  assert.equal(await auth.verifyOtp(db, 'c@aulia.test', 'LOGIN' as any, code!), false);
});

test('pas plus de 5 codes demandés par heure', async () => {
  const { db } = fakeDb();
  for (let i = 0; i < 5; i++) assert.ok((await issueAndCatch(db, 'd@aulia.test')).r.ok);
  assert.equal((await issueAndCatch(db, 'd@aulia.test')).r.ok, false);
});

test('8 mots de passe faux en 15 minutes bloquent la connexion', async () => {
  const { db } = fakeDb();
  for (let i = 0; i < 7; i++) await auth.recordLogin(db, 'e@aulia.test', false);
  assert.equal(await auth.loginLocked(db, 'e@aulia.test'), false);
  await auth.recordLogin(db, 'e@aulia.test', false);
  assert.equal(await auth.loginLocked(db, 'e@aulia.test'), true);
});

test('les adresses e-mail sont normalisées et vérifiées', () => {
  assert.equal(auth.normEmail('  Chef@AULIA.com '), 'chef@aulia.com');
  assert.ok(auth.validEmail('chef@aulia.com'));
  assert.ok(!auth.validEmail('chef@aulia'));
});
