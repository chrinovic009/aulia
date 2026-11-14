// Tests : node --experimental-strip-types --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/lib/server/crypto.ts';

test('TOTP conforme aux vecteurs RFC 6238 (SHA-1)', () => {
  const secret = c.base32Encode(Buffer.from('12345678901234567890'));
  // RFC 6238 annexe B, 8 chiffres → on vérifie les 6 derniers
  const vectors: [number, string][] = [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037']];
  for (const [t, expected] of vectors) assert.equal(c.totp(secret, t * 1000), expected.slice(2));
});

test('TOTP tolère ±30 s et refuse au-delà', () => {
  const s = c.newTotpSecret();
  const now = 1_800_000_000_000;
  assert.ok(c.verifyTotp(s, c.totp(s, now - 30_000), now));
  assert.ok(c.verifyTotp(s, c.totp(s, now + 30_000), now));
  assert.ok(!c.verifyTotp(s, c.totp(s, now - 90_000), now));
  assert.ok(!c.verifyTotp(s, 'abcdef', now));
});

test('base32 aller-retour', () => {
  const b = Buffer.from('aulia-holding-secret');
  assert.deepEqual(c.base32Decode(c.base32Encode(b)), b);
});

test('mot de passe scrypt', async () => {
  const h = await c.hashPassword('Kinshasa-2026!');
  assert.ok(await c.verifyPassword('Kinshasa-2026!', h));
  assert.ok(!(await c.verifyPassword('kinshasa-2026!', h)));
  assert.ok(!(await c.verifyPassword('x', null)));
  assert.equal(c.passwordProblem('court'), 'Le mot de passe doit contenir au moins 10 caractères.');
  assert.ok(c.passwordProblem('1234567890'));
  assert.equal(c.passwordProblem('une phrase longue'), null);
});

test('chiffrement AES-GCM', () => {
  const enc = c.encrypt('JBSWY3DPEHPK3PXP', 'secret-app');
  assert.equal(c.decrypt(enc, 'secret-app'), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => c.decrypt(enc, 'autre-secret'));
});

test('codes à 6 chiffres et codes de secours', () => {
  for (let i = 0; i < 200; i++) assert.match(c.sixDigits(), /^\d{6}$/);
  const codes = c.newRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.equal(c.normalizeRecoveryCode(' abcd-efgh '), 'ABCDEFGH');
});
