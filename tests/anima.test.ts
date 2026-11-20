import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ANIMA_LLM_API_KEY = 'cle-de-test';
process.env.ANIMA_LLM_BASE_URL = 'https://moteur.test/v1';
process.env.ANIMA_LLM_MODEL = 'principal';
process.env.ANIMA_LLM2_API_KEY = 'cle-secours';
process.env.ANIMA_LLM2_BASE_URL = 'https://secours.test/v1';
process.env.ANIMA_LLM2_MODEL = 'secours';

const g = await import('../src/lib/server/anima/governance.ts');
const llm = await import('../src/lib/server/anima/llm.ts');
const { handleChat } = await import('../src/lib/server/anima/orchestrator.ts');

test('ANIMA repère e-mails et téléphones dans un message', () => {
  const c = g.extractContacts('Écrivez-moi à jean@exemple.cd ou au +243 812 345 678');
  assert.deepEqual(c.emails, ['jean@exemple.cd']);
  assert.equal(c.phones.length, 1);
});

test('ANIMA reconnaît la langue du message', () => {
  assert.equal(g.detectLanguage('Bonjour, je voudrais un rendez-vous avec votre équipe'), 'fr');
  assert.equal(g.detectLanguage('Hello, I would like to book a meeting with your team'), 'en');
});

test('si le moteur principal tombe, ANIMA répond avec le moteur de secours', async () => {
  const orig = globalThis.fetch;
  const muted = console.error;
  console.error = () => {};
  globalThis.fetch = (async (url: string) => {
    if (String(url).startsWith('https://moteur.test')) return new Response('quota', { status: 429 });
    return Response.json({ choices: [{ message: { content: 'Bonjour !' } }] });
  }) as typeof fetch;
  try {
    const r = await llm.chat([{ role: 'user', content: 'salut' }], []);
    assert.equal(r.content, 'Bonjour !');
    assert.match(r.engine, /secours/);
  } finally {
    globalThis.fetch = orig;
    console.error = muted;
  }
});

test('au-delà de 40 messages en 10 minutes, ANIMA refuse poliment (429)', async () => {
  const db = { animaEvent: { count: async () => 40 } } as any;
  await assert.rejects(
    handleChat(db, { message: 'Bonjour', channel: 'web', hash: 'h', origin: 'https://aulia.test' }),
    (e: any) => e.status === 429 && /réessayez/.test(e.message),
  );
});
