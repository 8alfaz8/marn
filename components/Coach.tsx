'use client';
import { useState, useEffect } from 'react';
import { Gonio } from './Viz';
import { api } from '@/lib/store';
import { MUSCLES, MODALITIES, SITE, service, addon, colorOf, iso, addDays, todayIso } from '@/lib/reference';

/* NOTE ON STRUCTURE
   Every piece of form state lives in this component, not in the sub-views.
   The snapshot is polled every few seconds, which re-renders this tree; if a
   view held its own state it would be remounted and a coach's half-typed
   session notes would vanish mid-session. Keep new state here. */

type Props = { snap: any; coachId: string; refresh: () => void; toast: (s: string) => void };

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const blankSession = (mins = 30) => ({
  mins, rpe: 6, painBefore: 5, painAfter: 2,
  modalities: ['Assisted stretch'] as string[], coachNotes: '', memberSummary: '',
});

export default function Coach({ snap, coachId, refresh, toast }: Props) {
  const [view, setView] = useState<'today' | 'members' | 'requests' | 'studio'>('today');
  const [open, setOpen] = useState<string | null>(null);

  const [newMember, setNewMember] = useState({ name: '', phone: '', goal: '', parqCleared: false });
  const [newCoach, setNewCoach] = useState('');
  const [rom, setRom] = useState<Record<string, number>>({});
  const [romKey, setRomKey] = useState<string | null>(null);
  const [sform, setSform] = useState(blankSession());
  const [pgTitle, setPgTitle] = useState('');

  const today = todayIso();
  const pending = snap.bookings.filter((b: any) => b.status === 'requested');
  const memberOf = (id: string | null) => snap.members.find((m: any) => m.id === id);
  const coachName = (id: string | null) => snap.coaches.find((c: any) => c.id === id)?.name || '—';
  const measFor = (assessmentId: string | null) => snap.measurements.filter((x: any) => x.assessmentId === assessmentId);

  const utilisation = (date: string) => {
    const mins = snap.bookings.filter((b: any) => b.date === date && b.status !== 'cancelled')
      .reduce((s: number, b: any) => s + service(b.serviceId).mins, 0);
    return Math.round((mins / (12 * 60 * Math.max(snap.coaches.length, 1))) * 100);
  };

  const act = async (p: Promise<any>, msg: string, close = false) => {
    try { await p; toast(msg); if (close) setOpen(null); refresh(); }
    catch (e: any) { toast(e?.error || 'Failed'); }
  };

  const drawerMember = memberOf(open);
  const drawerAssessmentId = drawerMember?.latestAssessmentId ?? null;

  /* Load the ROM inputs when the drawer opens, and again when a new assessment
     lands for that member — so a BodyMap import visibly refreshes the fields. */
  useEffect(() => {
    if (!open) { setRomKey(null); return; }
    const key = `${open}:${drawerAssessmentId}`;
    if (romKey === key) return;
    const meas = snap.measurements.filter((x: any) => x.assessmentId === drawerAssessmentId);
    setRom(Object.fromEntries(MUSCLES.map((mu) => [
      mu.key, meas.find((x: any) => x.muscleKey === mu.key)?.degrees ?? Math.round(mu.target * 0.6),
    ])));
    if (romKey?.split(':')[0] !== open) {
      const bk = snap.bookings.find((b: any) => b.memberId === open && b.date === today && b.status === 'confirmed');
      setSform(blankSession(bk ? service(bk.serviceId).mins : 30));
      setPgTitle('');
    }
    setRomKey(key);
  }, [open, drawerAssessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- views ---------------- */

  const renderToday = () => {
    const bks = snap.bookings.filter((b: any) => b.date === today && b.status !== 'cancelled');
    const util = utilisation(today);
    return (
      <>
        <div className="chead">
          <div><span className="eyebrow">{SITE.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <h2>Floor today</h2></div>
          <div className="stats">
            <div><span className="eyebrow">Booked</span><b>{bks.length}</b></div>
            <div><span className="eyebrow">Utilisation</span><b style={{ color: util < 40 ? 'var(--clay)' : 'var(--lime-deep)' }}>{util}%</b></div>
            <div><span className="eyebrow">Awaiting reply</span><b>{pending.length}</b></div>
            <div><span className="eyebrow">Open flags</span><b>{snap.members.reduce((s: number, m: any) => s + m.flags.length, 0)}</b></div>
          </div>
        </div>

        <div className="grid2">
          <div className="panel"><div className="pad">
            <span className="eyebrow on-ink">Schedule</span>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>Time</th><th>Member</th><th>Service</th><th>Coach</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {bks.length ? bks.map((b: any) => {
                    const m = memberOf(b.memberId); if (!m) return null;
                    return (
                      <tr key={b.id} className="clickable" onClick={() => setOpen(m.id)}>
                        <td className="tnum">{b.time}</td>
                        <td><b>{m.name}</b>{m.flags.length ? <span className="pill s-restricted" style={{ border: 'none', marginLeft: 6 }}>flag</span> : null}</td>
                        <td>{service(b.serviceId).name}<div className="kv">{service(b.serviceId).mins} min
                          {b.addons.length ? ' · +' + b.addons.map((a: string) => addon(a).name).join(', ') : ''}</div></td>
                        <td className="kv">{coachName(b.coachId)}</td>
                        <td><span className={`pill ${b.status === 'confirmed' ? 's-optimal' : b.status === 'completed' ? 's-excellent' : 's-limited'}`}>{b.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          {b.status === 'requested'
                            ? <button className="btn sm" onClick={(e) => { e.stopPropagation(); act(api('POST', `/bookings/${b.id}/confirm`, { coachId }, 'COACH'), 'Confirmed — member notified'); }}>Confirm</button>
                            : b.status === 'confirmed'
                              ? <button className="btn line sm" onClick={(e) => { e.stopPropagation(); setOpen(m.id); }}>Log session</button>
                              : null}
                        </td>
                      </tr>);
                  }) : <tr><td colSpan={6} className="kv" style={{ padding: '22px 10px' }}>Nothing on the floor today. Requests land here as members book.</td></tr>}
                </tbody>
              </table>
            </div>
          </div></div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div className="panel"><div className="pad">
              <span className="eyebrow on-ink">Attention</span>
              <div style={{ display: 'grid', gap: 9, marginTop: 11 }}>
                {snap.members.flatMap((m: any) => m.flags.map((f: any) => (
                  <div className="flag" key={f.id} style={{ color: 'var(--on-ink)' }}>
                    <b style={{ whiteSpace: 'nowrap' }}>{m.name.split(' ')[0]}</b><span>{f.text}</span>
                  </div>))).slice(0, 5)}
                {snap.members.every((m: any) => !m.flags.length) && <div className="kv">No open flags.</div>}
              </div>
            </div></div>

            <div className="panel"><div className="pad">
              <span className="eyebrow on-ink">Pre-session check-ins</span>
              <div style={{ display: 'grid', gap: 10, marginTop: 11 }}>
                {snap.checkins.length ? snap.checkins.slice(0, 4).map((c: any) => (
                  <div key={c.id} style={{ padding: 11, borderRadius: 3, background: 'rgba(169,227,75,.08)' }}>
                    <div className="row"><b>{memberOf(c.memberId)?.name || 'Member'}</b>
                      <span className="kv">{new Date(c.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></div>
                    <div className="kv" style={{ marginTop: 5 }}>Sleep {c.sleep}/5 · pain {c.pain}/10 · {c.areas.join(', ') || 'no areas noted'}</div>
                    {c.note && <div style={{ fontSize: 13, marginTop: 6, color: '#D4D8C7' }}>{c.note}</div>}
                  </div>)) : <div className="kv" style={{ lineHeight: 1.6 }}>
                    Members who check in before arriving show up here, so you know the plan before they walk in.</div>}
              </div>
            </div></div>
          </div>
        </div>
      </>
    );
  };

  const renderMembers = () => {
    const cell = (v: number, k: string) => <td key={k}><span className="tnum" style={{ color: v ? colorOf(v / 100) : 'var(--mute-ink)' }}>{v || '—'}</span></td>;
    return (
      <>
        <div className="chead">
          <div><span className="eyebrow">Roster</span><h2>Members</h2></div>
          <div className="stats">
            <div><span className="eyebrow">Active</span><b>{snap.members.length}</b></div>
            <div><span className="eyebrow">Credits outstanding</span><b>{snap.members.reduce((s: number, m: any) => s + m.credits, 0)}</b></div>
          </div>
        </div>

        <div className="grid2">
          <div className="panel"><div className="pad"><div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Member</th><th>Flex</th><th>Mob</th><th>Rec</th><th>Sessions</th><th>Credits</th><th>Last</th><th /></tr></thead>
              <tbody>
                {snap.members.map((m: any) => (
                  <tr key={m.id} className="clickable" onClick={() => setOpen(m.id)}>
                    <td><b>{m.name}</b>
                      {m.flags.length ? <span className="pill s-restricted" style={{ border: 'none', marginLeft: 6 }}>{m.flags.length}</span> : null}
                      <div className="kv">{m.phone} · {m.persona}</div></td>
                    {cell(m.scores.flexibility, 'f')}{cell(m.scores.mobility, 'm')}{cell(m.scores.recovery, 'r')}
                    <td className="tnum">{m.sessionCount}</td>
                    <td className="tnum">{m.credits}</td>
                    <td className="kv">{m.lastSession || '—'}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn line sm" onClick={(e) => { e.stopPropagation(); setOpen(m.id); }}>Open</button></td>
                  </tr>))}
              </tbody>
            </table>
          </div></div></div>

          <div className="panel"><div className="pad">
            <span className="eyebrow on-ink">Add a member</span>
            <div className="big" style={{ fontSize: 20, margin: '8px 0 12px' }}>New sign-up</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><label className="fl eyebrow on-ink">Full name</label>
                <input type="text" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="Full name" /></div>
              <div><label className="fl eyebrow on-ink">Phone</label>
                <input type="tel" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} placeholder="+971 5x xxx xxxx" /></div>
              <div><label className="fl eyebrow on-ink">What they want to fix</label>
                <input type="text" value={newMember.goal} onChange={(e) => setNewMember({ ...newMember, goal: e.target.value })} placeholder="e.g. lower back stiffness" /></div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--mute-ink)', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 'auto', accentColor: 'var(--lime)' }} checked={newMember.parqCleared}
                       onChange={(e) => setNewMember({ ...newMember, parqCleared: e.target.checked })} />
                PAR-Q COMPLETED AND CLEARED
              </label>
              <button className="btn" disabled={!newMember.name.trim()} onClick={() => act(
                api('POST', '/members', newMember, 'COACH').then(() => setNewMember({ name: '', phone: '', goal: '', parqCleared: false })),
                'Member created — starts with no data')}>Create member</button>
            </div>
            <div className="kv" style={{ marginTop: 14, lineHeight: 1.6 }}>
              A new member starts genuinely empty: no scores, no body map, no history. That empty state is what most
              people actually see on day one, so it is worth looking at.
            </div>
          </div></div>
        </div>
      </>
    );
  };

  const renderRequests = () => (
    <>
      <div className="chead"><div><span className="eyebrow">Inbox</span><h2>Requests</h2></div></div>
      <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
        {pending.length ? pending.map((b: any) => {
          const m = memberOf(b.memberId); if (!m) return null;
          return (
            <div className="panel" key={b.id}><div className="pad row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <span className="eyebrow on-ink">Requested {Math.max(1, Math.round((Date.now() - new Date(b.createdAt).getTime()) / 6e4))} min ago</span>
                <div className="big" style={{ fontSize: 23, margin: '6px 0' }}>{m.name} · {service(b.serviceId).name}</div>
                <div className="kv">{fmtDate(b.date)} · {b.time} · {service(b.serviceId).mins} min · AED {b.aed}
                  {b.addons.length ? ' · +' + b.addons.map((a: string) => addon(a).name).join(', ') : ''}</div>
                {m.flags.length ? <div className="flag" style={{ marginTop: 10, color: 'var(--on-ink)' }}><span>{m.flags[0].text}</span></div> : null}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => act(api('POST', `/bookings/${b.id}/confirm`, { coachId }, 'COACH'), 'Confirmed — member notified')}>Confirm</button>
                <button className="btn line sm" onClick={() => act(api('POST', `/bookings/${b.id}/decline`, { reason: 'No coach available' }, 'COACH'), 'Declined — member notified')}>Decline</button>
              </div>
            </div></div>);
        }) : <div className="panel"><div className="pad kv">Inbox clear. New booking requests land here.</div></div>}
      </div>
    </>
  );

  const renderStudio = () => {
    const perCoach = snap.coaches.map((c: any) => {
      const ss = snap.sessions.filter((s: any) => s.coachId === c.id);
      return {
        ...c, sessions: ss.length,
        avgRpe: ss.length ? (ss.reduce((a: number, b: any) => a + b.rpe, 0) / ss.length).toFixed(1) : '—',
        painDrop: ss.length ? (ss.reduce((a: number, b: any) => a + (b.painBefore - b.painAfter), 0) / ss.length).toFixed(1) : '—',
      };
    });
    return (
      <>
        <div className="chead">
          <div><span className="eyebrow">Operations</span><h2>Studio</h2></div>
          <div className="stats">
            <div><span className="eyebrow">Utilisation today</span><b>{utilisation(today)}%</b></div>
            <div><span className="eyebrow">Booked today</span><b>AED {snap.bookings.filter((b: any) => b.date === today && b.status !== 'cancelled').reduce((s: number, b: any) => s + b.aed, 0)}</b></div>
            <div><span className="eyebrow">Sessions logged</span><b>{snap.sessions.length}</b></div>
          </div>
        </div>
        <div className="grid2">
          <div className="panel"><div className="pad">
            <span className="eyebrow on-ink">Coach outcomes</span>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>Coach</th><th>Sessions</th><th>Avg RPE</th><th>Avg pain drop</th></tr></thead>
                <tbody>{perCoach.map((c: any) => (
                  <tr key={c.id}><td><b>{c.name}</b><div className="kv">{c.title}</div></td>
                    <td className="tnum">{c.sessions}</td><td className="tnum">{c.avgRpe}</td>
                    <td className="tnum" style={{ color: 'var(--lime)' }}>{c.painDrop === '—' ? '—' : `−${c.painDrop}`}</td></tr>))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}><label className="fl eyebrow on-ink">Add a coach</label>
                <input type="text" value={newCoach} onChange={(e) => setNewCoach(e.target.value)} placeholder="Full name" /></div>
              <button className="btn sm" disabled={!newCoach.trim()} onClick={() =>
                act(api('POST', '/coaches', { name: newCoach }, 'COACH').then(() => setNewCoach('')), 'Coach added')}>Add coach</button>
            </div>
            <div className="kv" style={{ marginTop: 12, lineHeight: 1.6 }}>
              Average pain drop per session is the outcome metric worth managing, and the number that sells a corporate contract.
            </div>
          </div></div>

          <div className="panel"><div className="pad">
            <span className="eyebrow on-ink">Capacity, next 7 days</span>
            <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
              {[...Array(7)].map((_, i) => {
                const dd = iso(addDays(new Date(), i)); const u = utilisation(dd);
                return (
                  <div key={dd}>
                    <div className="row"><span className="kv">{fmtDate(dd)}</span><span className="mono" style={{ fontSize: 11 }}>{u}%</span></div>
                    <div className="bar" style={{ marginTop: 5 }}>
                      <i style={{ width: `${Math.max(u, 2)}%`, background: u < 40 ? 'var(--clay)' : u < 70 ? 'var(--amber)' : 'var(--lime)' }} /></div>
                  </div>);
              })}
            </div>
            <div className="kv" style={{ marginTop: 14, lineHeight: 1.6 }}>
              Anything under 40% is a slot to push to nearby members at short notice.
            </div>
          </div></div>
        </div>
      </>
    );
  };

  /* ---------------- member drawer ---------------- */
  const renderDrawer = () => {
    const m = drawerMember;
    if (!m) return null;
    const meas = measFor(m.latestAssessmentId);
    const a = snap.assessments.find((x: any) => x.id === m.latestAssessmentId);
    const prevA = snap.assessments.filter((x: any) => x.memberId === m.id)[1];
    const prevMeas = measFor(prevA?.id ?? null);
    const sess = snap.sessions.filter((s: any) => s.memberId === m.id);
    const pgs = snap.programs.filter((p: any) => p.memberId === m.id);
    const todayBooking = snap.bookings.find((b: any) => b.memberId === m.id && b.date === today && b.status === 'confirmed');

    return (
      <div className="drawer" onClick={() => setOpen(null)}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div><span className="eyebrow">Member since {m.joinedAt} · {m.phone}</span>
              <h2 style={{ fontSize: 38, marginTop: 6 }}>{m.name}</h2>
              {m.goal && <div className="kv on-bone" style={{ marginTop: 8, fontSize: 12.5 }}>Goal — {m.goal}</div>}</div>
            <button className="ghost" style={{ color: 'var(--mute-bone)', borderColor: 'var(--hair-bone)' }} onClick={() => setOpen(null)}>Close</button>
          </div>

          {m.flags.map((f: any) => (
            <div className="flag" key={f.id} style={{ marginTop: 12, color: 'var(--on-bone)' }}>
              <b style={{ whiteSpace: 'nowrap' }}>Flag</b><span>{f.text}</span>
              <button className="ghost" style={{ color: 'var(--clay)', borderColor: 'rgba(210,83,42,.4)', marginLeft: 'auto' }}
                      onClick={() => act(api('DELETE', `/members/${m.id}/flags/${f.id}`, undefined, 'COACH'), 'Flag cleared')}>Clear</button>
            </div>))}
          {!m.parqCleared && (
            <div style={{ marginTop: 12 }}>
              <button className="btn sm" onClick={() => act(api('POST', `/members/${m.id}/parq`, { cleared: true }, 'COACH'), 'PAR-Q cleared — member can book')}>
                Mark PAR-Q cleared</button></div>)}

          <div className="panel" style={{ marginTop: 16 }}><div className="pad">
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <span className="eyebrow on-ink">{a ? `Latest assessment · ${a.capturedAt} · ${a.source}` : 'No assessment on record'}</span>
              <button className="btn line sm" onClick={() => act(
                api('POST', '/integrations/bodymap/import', { memberId: m.id, coachId }, 'COACH'), 'BodyMap reading ingested')}>
                Import from BodyMap</button>
            </div>

            {meas.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(108px,1fr))', gap: 10, marginTop: 14 }}>
                <Gonio pct={m.scores.flexibility / 100} size={108} label={m.scores.flexibility} sub="FLEXIBILITY" />
                <Gonio pct={m.scores.mobility / 100} size={108} label={m.scores.mobility} sub="MOBILITY" />
                <Gonio pct={m.scores.recovery / 100} size={108} label={m.scores.recovery} sub="RECOVERY" />
              </div>)}

            <div className="fieldgrid" style={{ marginTop: 18 }}>
              {MUSCLES.map((mu) => {
                const pv = prevMeas.find((x: any) => x.muscleKey === mu.key)?.degrees;
                const cur = meas.find((x: any) => x.muscleKey === mu.key)?.degrees;
                const dl = pv !== undefined && cur !== undefined ? cur - pv : null;
                return (
                  <div key={mu.key}>
                    <label className="fl eyebrow on-ink">{mu.label}{' '}
                      {dl !== null && <span style={{ color: dl >= 0 ? 'var(--lime)' : 'var(--amber)' }}>{dl >= 0 ? '+' : ''}{dl}</span>}</label>
                    <input type="number" min={0} max={mu.target} value={rom[mu.key] ?? ''}
                           onChange={(e) => setRom({ ...rom, [mu.key]: Number(e.target.value) })} />
                    <div className="kv" style={{ marginTop: 3 }}>target {mu.target}°</div>
                  </div>);
              })}
            </div>
            <button className="btn" style={{ marginTop: 14 }} onClick={() => act(
              api('POST', `/members/${m.id}/assessments`, { coachId, measurements: MUSCLES.map((mu) => ({ key: mu.key, value: rom[mu.key] ?? 0 })) }, 'COACH'),
              'Assessment saved — member view updated')}>Save assessment</button>
          </div></div>

          <div className="panel" style={{ marginTop: 16 }}><div className="pad">
            <span className="eyebrow on-ink">Log session{todayBooking ? ` · ${todayBooking.time} ${service(todayBooking.serviceId).name}` : ''}</span>
            <div style={{ marginTop: 12 }}><label className="fl eyebrow on-ink">Modalities used</label>
              <div className="checks">{MODALITIES.map((x) => (
                <label key={x}><input type="checkbox" style={{ width: 'auto' }} checked={sform.modalities.includes(x)}
                  onChange={() => setSform({ ...sform, modalities: sform.modalities.includes(x) ? sform.modalities.filter((y) => y !== x) : [...sform.modalities, x] })} />{x}</label>))}
              </div></div>
            <div className="fieldgrid" style={{ marginTop: 14 }}>
              <div><label className="fl eyebrow on-ink">Duration (min)</label>
                <input type="number" value={sform.mins} onChange={(e) => setSform({ ...sform, mins: Number(e.target.value) })} /></div>
              <div><label className="fl eyebrow on-ink">RPE <span className="mono">{sform.rpe}</span>/10</label>
                <input type="range" min={1} max={10} value={sform.rpe} onChange={(e) => setSform({ ...sform, rpe: Number(e.target.value) })} /></div>
              <div><label className="fl eyebrow on-ink">Pain before</label>
                <input type="number" min={0} max={10} value={sform.painBefore} onChange={(e) => setSform({ ...sform, painBefore: Number(e.target.value) })} /></div>
              <div><label className="fl eyebrow on-ink">Pain after</label>
                <input type="number" min={0} max={10} value={sform.painAfter} onChange={(e) => setSform({ ...sform, painAfter: Number(e.target.value) })} /></div>
            </div>
            <div style={{ marginTop: 14 }}><label className="fl eyebrow on-ink">Coach notes — internal</label>
              <textarea rows={3} value={sform.coachNotes} onChange={(e) => setSform({ ...sform, coachNotes: e.target.value })}
                        placeholder="What you found, what you worked, what to watch next time." /></div>
            <div style={{ marginTop: 12 }}><label className="fl eyebrow on-ink">Summary the member reads</label>
              <textarea rows={3} value={sform.memberSummary} onChange={(e) => setSform({ ...sform, memberSummary: e.target.value })}
                        placeholder="Plain language. What we did, and what to do at home." /></div>
            <button className="btn" style={{ marginTop: 14 }} disabled={!sform.memberSummary.trim()} onClick={() => act(
              api('POST', '/sessions', { memberId: m.id, coachId, bookingId: todayBooking?.id || null, ...sform }, 'COACH'),
              'Session logged — summary sent to member', true)}>Log session</button>
          </div></div>

          <div className="panel" style={{ marginTop: 16 }}><div className="pad">
            <span className="eyebrow on-ink">Home programme</span>
            {pgs.length ? (<>
              <div className="big" style={{ fontSize: 20, margin: '8px 0 4px' }}>{pgs[0].title}</div>
              <div className="kv">{pgs[0].moves.length} moves · {pgs[0].completions.length} completions logged</div>
            </>) : <div className="kv" style={{ marginTop: 8 }}>None assigned.</div>}
            <div style={{ marginTop: 12 }}>
              <input type="text" value={pgTitle} onChange={(e) => setPgTitle(e.target.value)} placeholder="Programme title, e.g. Desk Reset — Block 3" /></div>
            <button className="btn line sm" style={{ marginTop: 10 }} onClick={() => act(
              api('POST', `/members/${m.id}/programs`, {
                title: pgTitle || 'Desk Reset — Block 3', coachId,
                moves: [{ n: 'Couch stretch', d: '2 × 45s per side' }, { n: '90/90 hip switch', d: '8 slow reps' }, { n: 'Thoracic opener over roller', d: '60s' }],
              }, 'COACH').then(() => setPgTitle('')), 'Programme sent to member')}>Prescribe standard desk block</button>
          </div></div>

          <div className="panel" style={{ marginTop: 16 }}><div className="pad">
            <span className="eyebrow on-ink">History · {sess.length} sessions</span>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {sess.length ? sess.slice(0, 10).map((s: any) => (
                <div key={s.id} style={{ padding: 11, borderRadius: 3, background: 'rgba(237,235,226,.05)' }}>
                  <div className="row"><b>{s.completedAt} · {s.mins} min</b>
                    <span className="kv">{coachName(s.coachId)} · RPE {s.rpe} · pain {s.painBefore}→{s.painAfter}</span></div>
                  <div className="kv" style={{ marginTop: 6, lineHeight: 1.55 }}>{s.coachNotes}</div>
                </div>)) : <div className="kv">No sessions logged.</div>}
            </div>
          </div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="coach">
      <nav className="rail">
        {(['today', 'members', 'requests', 'studio'] as const).map((k) => (
          <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>
            {k}{k === 'requests' && pending.length ? <span className="badge">{pending.length}</span> : null}
          </button>))}
      </nav>
      <div className="cmain">
        {view === 'today' && renderToday()}
        {view === 'members' && renderMembers()}
        {view === 'requests' && renderRequests()}
        {view === 'studio' && renderStudio()}
      </div>
      {open && renderDrawer()}
    </div>
  );
}
