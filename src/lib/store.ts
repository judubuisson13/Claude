// Accès aux données. Deux modes strictement séparés :
// - "server" : SQLite via l'API (vraies données) ;
// - "demo"   : fiches fictives en mémoire + localStorage, clairement signalées.
import { useCallback, useEffect, useState } from 'react';
import type { Analysis } from './analysis-schema';
import type { RecordItem } from './debrief-model';
import { demoItems } from './demo';
import { templateMessage } from './insights';

export type Mode = 'server' | 'demo';
const MODE_KEY = 'tempo-mode';
const DEMO_KEY = 'tempo-demo-items';

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export type Status = { reachable: boolean; ai: boolean };

export function useStore() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [mode, setModeState] = useState<Mode>('demo');
  const [status, setStatus] = useState<Status>({ reachable: false, ai: false });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (wanted?: Mode) => {
    let reachable = false;
    let ai = false;
    try {
      const s = await fetch('/api/status').then((r) => (r.ok ? r.json() : null));
      reachable = !!s?.ok;
      ai = !!s?.ai;
    } catch { /* serveur absent : démo uniquement */ }
    setStatus({ reachable, ai });
    const m: Mode = !reachable ? 'demo' : wanted || (safeGet(MODE_KEY) as Mode) || 'server';
    setModeState(m);
    if (m === 'server') {
      const r = await fetch('/api/data').then((x) => x.json());
      setItems(r.items || []);
    } else {
      let stored: RecordItem[] | null = null;
      try { stored = JSON.parse(safeGet(DEMO_KEY) || 'null'); } catch { stored = null; }
      setItems(stored || demoItems());
    }
    setReady(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setMode = useCallback((m: Mode) => { safeSet(MODE_KEY, m); setReady(false); load(m); }, [load]);

  const resetDemo = useCallback(() => {
    const fresh = demoItems();
    safeSet(DEMO_KEY, JSON.stringify(fresh));
    setItems(fresh);
  }, []);

  /** Enregistre un plan de débrief (versions CIBLES). Ne renvoie qu'après confirmation réelle. */
  const commitPlan = useCallback(async (plan: RecordItem[]) => {
    setError('');
    const merged = (prev: RecordItem[]) => Array.from(new Map([...prev, ...plan].map((i) => [i.id, i])).values());
    if (mode === 'demo') {
      const next = merged(items);
      safeSet(DEMO_KEY, JSON.stringify(next));
      setItems(next);
      return next;
    }
    const res = await fetch('/api/debrief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: plan }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Enregistrement impossible.');
    const next = merged(items);
    setItems(next);
    return next;
  }, [items, mode]);

  /** Mise à jour unitaire (version de DÉPART, contrat /api/data). */
  const saveOne = useCallback(async (item: RecordItem, isNew = false) => {
    if (mode === 'demo') {
      const saved = { ...item, version: isNew ? 1 : item.version + 1 };
      const next = Array.from(new Map([...items, saved].map((i) => [i.id, i])).values());
      safeSet(DEMO_KEY, JSON.stringify(next));
      setItems(next);
      return saved;
    }
    const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, kind: item.kind, data: item.data, version: isNew ? 0 : item.version }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Enregistrement impossible.');
    setItems((prev) => Array.from(new Map([...prev, body.item].map((i: RecordItem) => [i.id, i])).values()));
    return body.item as RecordItem;
  }, [items, mode]);

  return { items, mode, setMode, status, ready, error, setError, commitPlan, saveOne, resetDemo, reload: () => load(mode) };
}

export type Store = ReturnType<typeof useStore>;

export async function analyse(text: string, opts: { items: RecordItem[]; demo: boolean; history: { role: 'copilot' | 'user'; text: string }[]; persona: string }, reachable: boolean): Promise<{ analysis: Analysis; engine: 'claude' | 'local'; warning?: string }> {
  if (reachable) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, history: opts.history, persona: opts.persona, demo: opts.demo, items: opts.demo ? opts.items : undefined }),
    });
    if (res.ok) return res.json();
  }
  // Démo en ligne (sans serveur) : on demande à Claude via la capacité `sample` de la page, si elle est offerte.
  const viaSample = await analyseWithSample(text, opts).catch(() => null);
  if (viaSample) return { analysis: viaSample, engine: 'claude' };
  const { analyseLocally } = await import('./local-analyzer');
  return { analysis: analyseLocally(text, opts.items), engine: 'local' };
}

let sampleRef: Promise<any> | null = null;
export function sampleCapability(): Promise<any> {
  const c = (globalThis as any).claude;
  if (!c?.use) return Promise.resolve(null);
  if (!sampleRef) sampleRef = c.use('sample').catch(() => null);
  return sampleRef as Promise<any>;
}

async function analyseWithSample(text: string, opts: { items: RecordItem[]; persona: string }) {
  const sample = await sampleCapability();
  if (!sample) return null;
  const { ANALYSE_SYSTEM, ANALYSE_FORMAT, contextBlock, knownContext, normalizeAnalysis } = await import('./prompt');
  const { today } = await import('./debrief-model');
  const prompt = `${ANALYSE_SYSTEM}\n\n${contextBlock(today(), knownContext(opts.items), opts.persona)}\n\nRécit à analyser (dialogue de la session) :\n\"\"\"${text}\"\"\"\n\n${ANALYSE_FORMAT}`;
  const raw = await sample.json(prompt, { modelTier: 'quick' });
  return normalizeAnalysis(raw);
}

export async function compose(body: { kind: string; person: string; details?: string; client?: string; sender?: string; tone?: string }, reachable: boolean) {
  if (reachable) {
    const res = await fetch('/api/compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return res.json() as Promise<{ subject: string; message: string; engine: string }>;
  }
  return { subject: '', message: templateMessage(body.kind as any, body.person, body), engine: 'local' };
}
