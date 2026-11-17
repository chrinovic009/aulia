/**
 * ANIMA — moteurs de langage interchangeables, au format « compatible OpenAI ».
 * Gemini, Groq, Mistral, OpenRouter… ou un modèle hébergé par AULIA : seuls l'adresse,
 * la clé et le nom du modèle changent.
 *
 * Variables : ANIMA_LLM_BASE_URL, ANIMA_LLM_API_KEY, ANIMA_LLM_MODEL, ANIMA_LLM_REASONING (facultatif)
 *             ANIMA_LLM_MODELS (facultatif : modèles de renfort, séparés par des virgules)
 *             ANIMA_LLM2_BASE_URL, ANIMA_LLM2_API_KEY, ANIMA_LLM2_MODEL (moteur de secours, facultatif)
 *
 * Résilience : si le modèle configuré ne répond pas (lent, quota, retiré), ANIMA interroge en
 * parallèle des modèles rapides de renfort et retient le premier qui répond, tant qu'il répond.
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
// Modèles Gemini rapides essayés en renfort, du plus léger au plus complet.
const GEMINI_RENFORTS = ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'];

function engines(): Engine[] {
  const list: Engine[] = [];
  const key = env('ANIMA_LLM_API_KEY');
  if (key) {
    list.push({
      name: 'principal',
      base: (env('ANIMA_LLM_BASE_URL') ?? GEMINI).replace(/\/$/, ''),
      key,
      model: env('ANIMA_LLM_MODEL') ?? 'gemini-2.5-flash-lite',
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

/** Moteur principal, renforts (pour Gemini) puis moteur de secours. */
function candidats(): Engine[] {
  const [principal, secours] = engines();
  const out: Engine[] = [];
  if (principal) {
    out.push(principal);
    if (principal.base.includes('generativelanguage')) {
      const extra = (env('ANIMA_LLM_MODELS') ?? '').split(',').map((m) => m.trim()).filter(Boolean);
      for (const model of [...extra, ...GEMINI_RENFORTS]) {
        if (!out.some((e) => e.model === model)) out.push({ ...principal, name: 'renfort', model, reasoning: undefined });
      }
    }
  }
  if (secours) out.push(secours);
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
    throw new Error(`${e.model} : HTTP ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
  const msg = data.choices?.[0]?.message ?? {};
  return { content: (msg.content ?? '').trim(), toolCalls: msg.tool_calls ?? [], engine: `${e.name} · ${e.model}` };
}

/** Moteur retenu : le premier qui a répondu, gardé tant qu'il répond. */
let elu: Engine | null = null;

/**
 * Interroge les moteurs. Le moteur déjà retenu est utilisé directement ; sinon (ou s'il échoue),
 * tous les candidats sont interrogés en parallèle et le premier qui répond est retenu.
 */
export async function chat(messages: ChatMessage[], tools: ToolSpec[], maxTokens = 600, timeoutMs = 20_000): Promise<ChatResult> {
  if (!engines().length) throw new Error('ANIMA : aucun moteur de langage configuré (ANIMA_LLM_API_KEY).');
  if (elu) {
    try {
      return await callOnce(elu, messages, tools, maxTokens, timeoutMs);
    } catch (err) {
      console.error('[ANIMA llm] moteur retenu en échec, nouvelle sélection :', String((err as Error)?.message ?? err).slice(0, 200));
      elu = null;
    }
  }
  try {
    return await Promise.any(
      candidats().map(async (e) => {
        const r = await callOnce(e, messages, tools, maxTokens, timeoutMs);
        if (!elu) {
          elu = e;
          console.info(`[ANIMA llm] moteur retenu : ${e.model}`);
        }
        return r;
      }),
    );
  } catch (agg) {
    const errs = (agg as AggregateError).errors ?? [agg];
    const detail = errs.map((x) => String((x as Error)?.message ?? x).slice(0, 160)).join(' | ');
    console.error('[ANIMA llm] aucun moteur disponible :', detail);
    throw new Error(`aucun moteur n'a répondu : ${detail}`);
  }
}

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
    const r = await chat([{ role: 'user', content: 'Réponds seulement : OK' }], [], 50, 20_000);
    Object.assign(out, { ok: true, moteur: r.engine, reponse: r.content.slice(0, 40), duree_ms: Date.now() - t0 });
  } catch (err) {
    // les messages d'erreur du fournisseur ne contiennent jamais la clé
    Object.assign(out, { ok: false, detail: String((err as Error)?.message ?? err).slice(0, 600), duree_ms: Date.now() - t0 });
  }
  return out;
}
