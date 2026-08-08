'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { api, getCalls, getCallsServer, subscribeCalls, clearCalls, toggleCall } from '@/lib/store';

/* Two read-only windows onto the machinery. The API panel shows the HTTP
   round-trips; the Data panel shows the rows those round-trips wrote. Together
   they demonstrate that this is a real system rather than a click-through. */

export function ApiPanel({ onClose }: { onClose: () => void }) {
  const calls = useSyncExternalStore(subscribeCalls, getCalls, getCallsServer);
  return (
    <div className="dock">
      <header>
        <span className="eyebrow on-ink">API activity — {calls.length} calls this session</span>
        <span className="kv" style={{ marginLeft: 'auto' }}>Click a row for the payload</span>
        <button className="ghost" onClick={clearCalls}>Clear</button>
        <button className="ghost" onClick={onClose}>Hide</button>
      </header>
      <div className="body">
        {calls.length ? calls.map((c) => (
          <button className="call" key={c.id} onClick={() => toggleCall(c.id)}>
            <span className="l1">
              <span className={`who ${c.who}`}>{c.who}</span>
              <span className="verb">{c.verb}</span>
              <span>{c.path}</span>
              <span className="meta" style={{ color: c.status >= 400 ? 'var(--clay)' : undefined }}>
                {c.status} · {c.ms}ms · {c.at.toLocaleTimeString('en-GB', { hour12: false })}
              </span>
            </span>
            {c.open && (
              <pre>{`→ request  ${JSON.stringify(c.req, null, 1)}\n← response ${JSON.stringify(c.res, null, 1)}`}</pre>
            )}
          </button>
        )) : <div className="kv" style={{ padding: 16 }}>No calls yet. Every action in either view is recorded here.</div>}
      </div>
    </div>
  );
}

export function DataPanel({ onClose }: { onClose: () => void }) {
  const [tables, setTables] = useState<any>(null);
  const [counts, setCounts] = useState<any>({});
  const [tab, setTab] = useState('members');
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try { const r = await api('GET', '/admin/tables', undefined, 'SYSTEM'); setTables(r.tables); setCounts(r.counts); setErr(null); }
    catch (e: any) { setErr(e?.error || 'Could not read tables'); }
  };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const rows: any[] = tables?.[tab] || [];
  const cols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="dock">
      <header>
        <span className="eyebrow on-ink">Postgres — live rows</span>
        <div className="tabs" style={{ marginLeft: 8 }}>
          {Object.keys(counts).map((k) => (
            <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{k} {counts[k]}</button>))}
        </div>
        <button className="ghost" style={{ marginLeft: 'auto' }} onClick={load}>Refresh</button>
        <button className="ghost" onClick={onClose}>Hide</button>
      </header>
      <div className="body">
        {err && <div className="kv" style={{ padding: 16, color: 'var(--clay)' }}>{err}</div>}
        {!err && !rows.length && <div className="kv" style={{ padding: 16 }}>No rows in {tab}.</div>}
        {!err && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 60).map((r, i) => (
                  <tr key={i}>{cols.map((c) => {
                    const v = r[c];
                    const s = v === null || v === undefined ? '—'
                      : typeof v === 'object' ? JSON.stringify(v)
                      : String(v);
                    return <td key={c} title={s}>{s.length > 44 ? s.slice(0, 44) + '…' : s}</td>;
                  })}</tr>))}
              </tbody>
            </table>
            {rows.length > 60 && <div className="kv" style={{ padding: '8px 14px' }}>Showing 60 of {rows.length} rows.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
