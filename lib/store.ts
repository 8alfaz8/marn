'use client';
import { useEffect, useState, useCallback } from 'react';

/* Every client→server call goes through here so the API panel can show the
   real request and response. Nothing is faked: these are the actual HTTP
   round-trips that wrote the rows. */

export type Call = {
  id: string; who: 'MEMBER' | 'COACH' | 'ADMIN' | 'SYSTEM';
  verb: string; path: string; req: any; res: any;
  status: number; ms: number; at: Date; open?: boolean;
};

let calls: Call[] = [];
let listeners: (() => void)[] = [];
const emit = () => listeners.forEach((l) => l());

export function subscribeCalls(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
const EMPTY: Call[] = [];
export const getCalls = () => calls;
/** Must return a cached value — React throws if this allocates on every call. */
export const getCallsServer = () => EMPTY;
export const clearCalls = () => { calls = []; emit(); };
export const toggleCall = (id: string) => {
  calls = calls.map((c) => (c.id === id ? { ...c, open: !c.open } : c));
  emit();
};

export async function api(verb: string, path: string, body?: any, who: Call['who'] = 'SYSTEM') {
  const t0 = performance.now();
  const res = await fetch('/api' + path, {
    method: verb,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  const call: Call = {
    id: Math.random().toString(36).slice(2, 9), who, verb, path,
    req: body ?? null, res: json, status: res.status,
    ms: Math.round(performance.now() - t0), at: new Date(),
  };
  calls = [call, ...calls].slice(0, 80);
  emit();
  if (!res.ok) throw json;
  return json;
}

/** Whole-dataset snapshot, polled. Fine at demo scale; paginate for production. */
export function useSnapshot(pollMs = 5000) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (who: Call['who'] = 'SYSTEM', silent = false) => {
    try {
      const d = silent
        ? await fetch('/api/snapshot', { cache: 'no-store' }).then((r) => r.json())
        : await api('GET', '/snapshot', undefined, who);
      if (d?.error) setError(d.error); else { setData(d); setError(null); }
    } catch (e: any) { setError(e?.error || 'Could not reach the API'); }
  }, []);

  useEffect(() => {
    refresh('SYSTEM');
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh('SYSTEM', true);
    }, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { data, error, refresh };
}
