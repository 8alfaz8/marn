'use client';
import { useState, useEffect, useRef } from 'react';
import Member from '@/components/Member';
import Coach from '@/components/Coach';
import { ApiPanel, DataPanel } from '@/components/Panels';
import { api, useSnapshot } from '@/lib/store';
import { SITE } from '@/lib/reference';

type Identity = { kind: 'member'; id: string } | { kind: 'coach'; id: string } | null;

export default function Page() {
  const { data: snap, error, refresh } = useSnapshot();
  const [who, setWho] = useState<Identity>(null);
  const [dock, setDock] = useState<'none' | 'api' | 'data'>('none');
  const [menu, setMenu] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', goal: '' });
  const menuRef = useRef<HTMLDivElement>(null);

  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (error && !snap) {
    return (
      <main style={{ padding: 40, maxWidth: 620 }}>
        <h1 style={{ fontSize: 40 }}>No database.</h1>
        <p style={{ marginTop: 14, lineHeight: 1.6 }}>
          The app is running but can&apos;t reach Postgres. Set <code>DATABASE_URL</code> in your environment,
          then run <code>npm run db:push</code> and <code>npm run db:seed</code>.
        </p>
        <p className="kv on-bone" style={{ marginTop: 16 }}>{error}</p>
      </main>
    );
  }
  if (!snap) return <main style={{ padding: 40 }}><span className="eyebrow">Loading…</span></main>;

  const personas = [
    { id: 'power',  hint: 'Phone · nine months in' },
    { id: 'active', hint: 'Phone · four months in' },
    { id: 'new',    hint: 'Phone · day one' },
  ].map((p) => ({ ...p, member: snap.members.find((m: any) => m.persona === p.id) })).filter((p) => p.member);

  const createMember = async () => {
    if (!form.name.trim()) return;
    try {
      const r = await api('POST', '/members', { ...form, parqCleared: false }, 'MEMBER');
      await refresh();
      setWho({ kind: 'member', id: r.memberId });
      setSignup(false); setForm({ name: '', phone: '', goal: '' });
      toast('Account created — this is the real empty state');
    } catch (e: any) { toast(e.error || 'Could not create account'); }
  };

  /* ---------- gate ---------- */
  const Gate = () => (
    <div className="gate">
      <div className="left">
        <span className="eyebrow">Recovery studio · Dubai · prototype</span>
        <h1>Stretching<br />you can <em>measure</em>.</h1>
        <p className="lede">
          Every session produces numbers: joint angle in degrees, pain before and after, how much range came back.
          Members watch the line move. Coaches work from evidence instead of memory.
        </p>
        <div style={{ display: 'flex', gap: 28, marginTop: 34, flexWrap: 'wrap' }}>
          {[['10', 'Muscle groups measured'], ['100', 'AED per session'], ['30′', 'Base session']].map(([n, l]) => (
            <div key={l}><div className="big" style={{ fontSize: 38 }}>{n}</div><span className="eyebrow">{l}</span></div>))}
        </div>
        <p className="kv on-bone" style={{ marginTop: 34, maxWidth: '52ch', lineHeight: 1.7 }}>
          Live on Postgres. Book on a phone, confirm on a laptop, and the row is there tomorrow. Settings opens the
          API log and the database itself.
        </p>
      </div>

      <div className="right">
        <span className="eyebrow on-ink">Open as a member</span>
        {personas.map((p) => (
          <button className="enter" key={p.id} onClick={() => setWho({ kind: 'member', id: p.member.id })}>
            <span className="k">{p.hint}</span>
            <b>{p.member.name}</b>
            <span>
              {p.id === 'power' && `${p.member.sessionCount} sessions, wearable linked, ${p.member.streak}-day streak. The graph has a story in it.`}
              {p.id === 'active' && `${p.member.sessionCount} sessions, steady gains, one open safety flag.`}
              {p.id === 'new' && 'Signed up today. No assessment, no scores — the empty state.'}
            </span>
          </button>))}

        {!signup ? (
          <button className="enter" onClick={() => setSignup(true)}>
            <span className="k">Phone · make your own</span>
            <b>Create an account</b><span>Start genuinely empty and walk the onboarding yourself.</span>
          </button>
        ) : (
          <div className="enter" style={{ borderColor: 'var(--lime)' }}>
            <span className="k">New member</span>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              <input type="text" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input type="tel" placeholder="+971 5x xxx xxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input type="text" placeholder="What you want to fix" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sm" disabled={!form.name.trim()} onClick={createMember}>Create</button>
                <button className="btn line sm" onClick={() => setSignup(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(237,235,226,.14)', margin: '10px 0' }} />
        <span className="eyebrow on-ink">Open as staff</span>
        {snap.coaches.slice(0, 3).map((c: any) => (
          <button className="enter" key={c.id} onClick={() => setWho({ kind: 'coach', id: c.id })}>
            <span className="k">Laptop or tablet</span>
            <b>{c.name}</b><span>{c.title} · {SITE.name}</span>
          </button>))}
      </div>
    </div>
  );

  const label = who?.kind === 'member'
    ? snap.members.find((m: any) => m.id === who.id)?.name
    : who?.kind === 'coach' ? snap.coaches.find((c: any) => c.id === who.id)?.name : 'Recovery, measured';

  return (
    <>
      <div className="topbar">
        <div className="brand">MAR<i>N</i> <small>{label}</small></div>
        <div className="spacer" />
        {who && (
          <div className="seg">
            <button aria-pressed={who.kind === 'member'}
                    onClick={() => setWho({ kind: 'member', id: personas[0]?.member.id || snap.members[0].id })}>Member</button>
            <button aria-pressed={who.kind === 'coach'}
                    onClick={() => setWho({ kind: 'coach', id: snap.coaches[0].id })}>Coach</button>
          </div>)}
        <div className="menu" ref={menuRef}>
          <button className="ghost" onClick={() => setMenu(!menu)}>Settings ▾</button>
          {menu && (
            <div className="sheet">
              <button onClick={() => { setDock(dock === 'api' ? 'none' : 'api'); setMenu(false); }}>
                API activity<small>Every request and response, live</small></button>
              <button onClick={() => { setDock(dock === 'data' ? 'none' : 'data'); setMenu(false); }}>
                Database rows<small>Read straight from Postgres</small></button>
              <div className="sep" />
              <button onClick={() => { setWho(null); setMenu(false); }}>Switch account<small>Back to the persona picker</small></button>
              <button onClick={async () => {
                setMenu(false);
                try { await api('POST', '/admin/seed', {}, 'SYSTEM'); await refresh(); setWho(null); toast('Demo data reset'); }
                catch { toast('Reset failed'); }
              }}>Reset demo data<small>Wipes everything, re-seeds the personas</small></button>
            </div>)}
        </div>
      </div>

      <main>
        {!who && <Gate />}
        {who?.kind === 'member' && <Member snap={snap} memberId={who.id} refresh={refresh} toast={toast} />}
        {who?.kind === 'coach' && <Coach snap={snap} coachId={who.id} refresh={refresh} toast={toast} />}
      </main>

      {dock === 'api' && <ApiPanel onClose={() => setDock('none')} />}
      {dock === 'data' && <DataPanel onClose={() => setDock('none')} />}
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
