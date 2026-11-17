/**
 * ANIMA — moteurs de langage interchangeables, au format « compatible OpenAI ».
 * Gemini, Groq, Mistral, OpenRouter… ou un modèle hébergé par AULIA : seuls l'adresse,
 * la clé et le nom du modèle changent. Un second moteur de secours peut être configuré.
 *
 * Variables : ANIMA_LLM_BASE_URL, ANIMA_LLM_API_KEY, ANIMA_LLM_MODEL, ANIMA_LLM_REASONING (facultatif)
 *             ANIMA_LLM2_BASE_URL, ANIMA_LLM2_API_KEY, ANIMA_LLM2_MODEL (secours, facultatif)
 */
import { env } from '../env.ts';

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };
export type ToolSpec = { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } };
export type ChatResult = { content: string; toolCalls: ToolCall[]; engine: string };

type Engine = { name: string; base: string; key: string; model: string; reasoning?: string };

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai';

function engines(): Engine[] {
  const list: Engine[] = [];
  const key = env('ANIMA_LLM_API_KEY');
  if (key) {
    list.push({
      name: 'principal',
      base: (env('ANIMA_LLM_BASE_URL') ?? GEMINI).replace(/\/$/, ''),
      key,
      model: env('ANIMA_LLM_MODEL') ?? 'gemini-flash-latest',
      reasoning: env('ANIMA_LLM_REASONING'),
    });
  }
  const key2 = env('ANIMA_LLM2_API_KEY');
  if (key2 && env('ANIMA_LLM2_BASE_URL') && env('ANIMA_LLM2_MODEL')) {
    list.push({ name: 'secours', base: env('ANIMA_LLM2_BASE_URL')!.replace(/\/$/, ''), key: key2, model: env('ANIMA_LLM2_MODEL')! });
  }
  return list;
}

export const animaConfigured = () => engines().length > 0;

async function callEngine(e: Engine, messages: ChatMessage[], tools: ToolSpec[], maxTokens: number, timeoutMs: number): Promise<ChatResult> {
  try {
    return await callOnce(e, messages, tools, maxTokens, timeoutMs);
  } catch (err) {
    const msg = String((err as Error)?.message ?? err);
    // Repli 1 : certains modèles refusent le réglage de réflexion → on réessaie sans.
    if (e.reasoning && /HTTP 400/.test(msg)) {
      console.warn('[ANIMA llm] nouvel essai sans reasoning_effort :', msg.slice(0, 200));
      return await callEngine({ ...e, reasoning: undefined }, messages, tools, maxTokens, timeoutMs);
    }
    // Repli 2 : modèle inconnu chez Gemini → modèle stable de secours.
    if (e.base.includes('generativelanguage') && /HTTP 404|not found|is not supported/i.test(msg) && e.model !== FALLBACK_GEMINI) {
      console.warn(`[ANIMA llm] modèle ${e.model} indisponible, essai avec ${FALLBACK_GEMINI}`);
      return await callEngine({ ...e, model: FALLBACK_GEMINI }, messages, tools, maxTokens, timeoutMs);
    }
    throw err;
  }
}

const FALLBACK_GEMINI = 'gemini-2.5-flash';

/** Auto-diagnostic : modèles disponibles pour la clé + un très court appel chronométré. */
export async function probe(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const e = engines()[0];
  if (e) {
    out.modele_configure = e.model;
    try {
      const r = await fetch(`${e.base}/models`, { headers: { Authorization: `Bearer ${e.key}` }, signal: AbortSignal.timeout(10_000) });
      const data = (await r.json().catch(() => ({}))) as { data?: { id: string }[] };
      out.modeles_disponibles = r.ok
        ? (data.data ?? []).map((m) => m.id.replace(/^models\//, '')).filter((id) => /flash|lite|gemma/i.test(id)).slice(0, 30)
        : `HTTP ${r.status}`;
    } catch (err) {
      out.modeles_disponibles = String((err as Error)?.message ?? err).slice(0, 200);
    }
  }
  const t0 = Date.now();
  try {
    const r = await chat([{ role: 'user', content: 'Réponds seulement : OK' }], [], 50, 40_000);
    Object.assign(out, { ok: true, moteur: r.engine, reponse: r.content.slice(0, 40), duree_ms: Date.now() - t0 });
  } catch (err) {
    // le message d'erreur du fournisseur ne contient jamais la clé
    Object.assign(out, { ok: false, detail: String((err as Error)?.message ?? err).slice(0, 400), duree_ms: Date.now() - t0 });
  }
  return out;
}

async function callOnce(e: Engine, messages: ChatMessage[], tools: ToolSpec[], maxTokens: number, timeoutMs: number): Promise<ChatResult> {
  const res = await fetch(`${e.base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: e.model,
      messages,
      ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
      temperature: 0.4,
      max_tokens: maxTokens,
      ...(e.reasoning ? { reasoning_effort: e.reasoning } : {}),
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`moteur ${e.name} (${e.model}) : HTTP ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
  const msg = data.choices?.[0]?.message ?? {};
  return { content: (msg.content ?? '').trim(), toolCalls: msg.tool_calls ?? [], engine: `${e.name} · ${e.model}` };
}

/** Interroge le moteur principal, puis le moteur de secours en cas d'échec. */
export async function chat(messages: ChatMessage[], tools: ToolSpec[], maxTokens = 600, timeoutMs = 25_000): Promise<ChatResult> {
  const list = engines();
  if (!list.length) throw new Error('ANIMA : aucun moteur de langage configuré (ANIMA_LLM_API_KEY).');
  let last: unknown;
  for (const e of list) {
    try {
      return await callEngine(e, messages, tools, maxTokens, timeoutMs);
    } catch (err) {
      last = err;
      console.error('[ANIMA llm]', String((err as Error)?.message ?? err));
    }
  }
  throw last;
}
