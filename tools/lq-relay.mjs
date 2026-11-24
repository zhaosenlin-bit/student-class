/*
 * A small client for the translation services that are already
 * configured on this machine.  Used for the bulk translation of the
 * lessons that were still in English.
 *
 * Two services are available.  When the first one cannot answer, the
 * second one is used instead, so a long run is not stopped by one
 * service being busy or out of credit.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const readEnv = (file) => {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
};

const env = {
  ...readEnv(path.join(os.homedir(), '.codex', 'secrets', 'aixj.env')),
  ...readEnv(path.join(os.homedir(), '.codex', 'secrets', 'qwen.env'))
};

export const BASE = env.AIXJ_BASE_URL || process.env.AIXJ_BASE_URL || '';
export const KEY = env.AIXJ_API_KEY || process.env.AIXJ_API_KEY || '';

const QWEN_BASE = env.QWEN_BASE_URL || process.env.QWEN_BASE_URL || '';
const QWEN_KEY = env.QWEN_API_KEY || process.env.QWEN_API_KEY || '';

/* The services, in the order they are asked. */
export const PROVIDERS = [
  {
    name: 'aixj',
    base: BASE,
    key: KEY,
    path: '/v1/chat/completions',
    model: 'gpt-5.6',
    models: ['gpt-5.6', 'gpt-5.6-sol', 'gpt-6', 'gpt-5.4-mini', 'gpt-5.2']
  },
  {
    name: 'qwen',
    base: QWEN_BASE,
    key: QWEN_KEY,
    path: '/chat/completions',
    model: 'qwen3.8-flash',
    models: ['qwen3.8-flash', 'qwen3.8-max', 'qwen3.7-plus', 'deepseek-v4-flash-0731', 'glm-5.3']
  }
].filter((p) => p.base && p.key);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function chat(
  messages,
  model = 'gpt-5.4-mini',
  temperature = 0.2,
  tries = 8,
  timeoutMs = 90000
) {
  if (!PROVIDERS.length) throw new Error('no relay credentials');
  let last = null;
  /* The service that knows the asked model is asked first. */
  const ordered = [...PROVIDERS].sort(
    (a, b) => (b.models.includes(model) ? 1 : 0) - (a.models.includes(model) ? 1 : 0)
  );
  for (const provider of ordered) {
    const use = provider.models.includes(model) ? model : provider.model;
    for (let i = 0; i < tries; i++) {
      let res;
      try {
        res = await fetch(`${provider.base.replace(/\/$/, '')}${provider.path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${provider.key}`
          },
          body: JSON.stringify({ model: use, messages, temperature }),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (e) {
        last = e.message;
        await sleep(1200 * (i + 1));
        continue;
      }
      if (res.ok) {
        const j = await res.json();
        return j.choices?.[0]?.message?.content || '';
      }
      const t = await res.text();
      last = `${provider.name} ${res.status}: ${t.slice(0, 200)}`;
      /* Out of credit: this service cannot serve the run at all. */
      if (res.status === 402 || res.status === 403) break;
      /* A busy account or a rate limit: wait and try again. */
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (i + 1) + Math.floor(Math.random() * 800));
        continue;
      }
      break;
    }
  }
  throw new Error(last || 'relay failed');
}

export async function listModels() {
  const res = await fetch(`${BASE.replace(/\/$/, '')}/v1/models`, {
    headers: { authorization: `Bearer ${KEY}` }
  });
  if (!res.ok) throw new Error(`relay ${res.status}`);
  const j = await res.json();
  return (j.data || []).map((m) => m.id);
}
