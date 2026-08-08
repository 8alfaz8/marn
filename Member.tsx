'use client';
import { useState, useEffect } from 'react';
import { Gonio, AreaChart, BodyMap } from './Viz';
import { api } from '@/lib/store';
import { MUSCLES, SERVICES, ADDONS, SITE, muscle, service, addon, colorOf, iso, addDays, todayIso } from '@/lib/reference';

type Props = { snap: any; memberId: string; refresh: () => void; toast: (s: string) => void };

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function Member({ snap, memberId, refresh, toast }: Props) {
  const [tab, setTab] = useState<'today' | 'body' | 'progress' | 'book' | 'home'>('today');
  const [sel, setSel] = useState('hamstrings');
  const [face, setFace] = useState<'front' | 'back'>('back');
  const [metric, setMetric] = useState<'flexibility' | 'mobility' | 'recovery'>('flexibility');
  const [draft, setDraft] = useState<{ svc: string; date: string; slot: string | null; addons: string[] }>(
    { svc: 'st30', date: todayIso(), slot: null, addons: [] });
  const [slots, setSlots] = useState<any[]>([]);

  const me = snap.members.find((m: any) => m.id === memberId);
  const meas = snap.measurements.filter((m: any) => m.assessmentId === me?.latestAssessmentId);
  const assessment = snap.assessments.find((a: any) => a.id === me?.latestAssessmentId);
  const prevAssessment = snap.assessments.filter((a: any) => a.memberId === memberId)[1];
  const prevMeas = snap.measurements.filter((m: any) => m.assessmentId === prevAssessment?.id);
  const series = snap.scoreDays.filter((s: any) => s.memberId === memberId);
  const sessions = snap.sessions.filter((s: any) => s.memberId === memberId);
  const programs = snap.programs.filter((p: any) => p.memberId === memberId);
  const myBookings = snap.bookings.filter((b: any) => b.memberId === memberId && !['cancelled', 'completed'].includes(b.status));
  const next = [...myBookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const coachName = (id: string | null) => snap.coaches.find((c: any) => c.id === id)?.name || 'Coach to be assigned';

  useEffect(() => {
    if (tab !== 'book') return;
    api('GET', `/availability?date=${draft.date}&serviceId=${draft.svc}`, undefined, 'MEMBER')
      .then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, [tab, draft.date, draft.svc]);

  const delta = (k: string) => {
    if (series.length < 8) return 0;
    return series[series.length - 1][k] - series[series.length - 8][k];
  };

  /* ---------- actions ---------- */
  const book = async () => {
    try {
      const r = await api('POST', '/bookings', { memberId, serviceId: draft.svc, date: draft.date, time: draft.slot, addons: draft.addons }, 'MEMBER');
      toast(r.message); setDraft({ ...draft, slot: null }); setTab('today'); refresh();
    } catch (e: any) { toast(e.error || 'Could not book'); }
  };
  const act = async (fn: Promise<any>, msg: string) => { try { await fn; toast(msg); refresh(); } catch (e: any) { toast(e.error || 'Failed'); } };

  /* ---------- views ---------- */
  const Today = () => {
    const sub = (lab: string, val: number, d: number) => (
      <div className="sub">
        <span className="eyebrow on-ink">{lab}</span>
        <span className="mono" style={{ fontSize: 11, color: d >= 0 ? 'var(--lime)' : 'var(--amber)' }}>{d >= 0 ? '+' : ''}{d} · 7d</span>
        <span className="n">{val}</span><span />
        <div className="bar"><i style={{ width: `${val}%`, background: colorOf(val / 100) }} /></div>
      </div>
    );
    const priority = [...meas].map((m) => ({ ...m, pct: m.degrees / m.target })).sort((a, b) => a.pct - b.pct).slice(0, 3);

    return (
      <>
        <div className="mhead">
          <div><span className="eyebrow">{SITE.name}</span>
            <h2>Morning,<br /><em>{me.name.split(' ')[0]}</em>.</h2></div>
          <div className="streak"><b>{me.streak}</b>day streak</div>
        </div>

        {meas.length ? (
          <div className="panel"><div className="pad hero">
            <Gonio pct={me.scores.flexibility / 100} size={164} label={me.scores.flexibility} sub="FLEXIBILITY" />
            <div style={{ display: 'grid', gap: 9 }}>
              {sub('Mobility', me.scores.mobility, delta('mobility'))}
              {sub('Recovery', me.scores.recovery, delta('recovery'))}
              <div className="kv">Flexibility {delta('flexibility') >= 0 ? '+' : ''}{delta('flexibility')} over 7 days</div>
            </div>
          </div></div>
        ) : (
          <div className="panel"><div className="pad">
            <span className="eyebrow on-ink">No assessment yet</span>
            <div className="big" style={{ fontSize: 26, margin: '10px 0 10px' }}>Your numbers start at your first session.</div>
            <div className="kv" style={{ lineHeight: 1.6 }}>
              A coach measures ten muscle groups in about eight minutes. After that, every screen here has data in it.
            </div>
          </div></div>
        )}

        <div className="stack">
          {next ? (
            <div className="panel"><div className="pad">
              <div className="row"><span className="eyebrow on-ink">Next session</span>
                <span className={`pill ${next.status === 'confirmed' ? 's-optimal' : 's-limited'}`}>{next.status}</span></div>
              <div className="big" style={{ fontSize: 25, margin: '8px 0 4px' }}>{service(next.serviceId).name}</div>
              <div className="kv">{fmtDate(next.date)} · {next.time} · {service(next.serviceId).mins} min · {coachName(next.coachId)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <button className="btn line sm" onClick={() => act(
                  api('POST', '/checkins', { memberId, sleep: 3, pain: 5, areas: ['lower back', 'right shoulder'], note: 'Slept badly, shoulder stiff.' }, 'MEMBER'),
                  'Check-in sent to your coach')}>Pre-session check-in</button>
                <button className="btn line sm" onClick={() => act(api('DELETE', `/bookings/${next.id}`, undefined, 'MEMBER'), 'Session cancelled')}>Cancel</button>
              </div>
            </div></div>
          ) : (
            <div className="panel"><div className="pad">
              <span className="eyebrow on-ink">Nothing booked</span>
              <div className="big" style={{ fontSize: 23, margin: '8px 0 14px' }}>
                {sessions.length ? 'Your last session was ' + fmtDate(sessions[0].completedAt) + '.' : 'Book your first session.'}
              </div>
              <button className="btn" onClick={() => setTab('book')}>Book a session</button>
            </div></div>
          )}

          {!me.parqCleared && (
            <div className="panel"><div className="pad">
              <span className="eyebrow on-ink">Before you start</span>
              <div className="big" style={{ fontSize: 21, margin: '8px 0 8px' }}>Readiness screening outstanding.</div>
              <div className="kv" style={{ lineHeight: 1.6 }}>
                Seven quick questions about your health history. A coach completes it with you at the studio. If anything
                needs a doctor first, we will tell you rather than work around it.
              </div>
            </div></div>
          )}

          {priority.length > 0 && (
            <div className="panel"><div className="pad">
              <div className="row"><span className="eyebrow on-ink">Priority areas today</span>
                <button className="kv" style={{ color: 'var(--lime)' }} onClick={() => setTab('body')}>Full body map →</button></div>
              <div className="rowlist" style={{ marginTop: 6 }}>
                {priority.map((p: any) => (
                  <div key={p.muscleKey} onClick={() => { setSel(p.muscleKey); setFace(muscle(p.muscleKey).face); setTab('body'); }}>
                    <span style={{ height: 22, background: colorOf(p.pct), borderRadius: 2 }} />
                    <div><b style={{ fontFamily: 'var(--dsp)', fontSize: 16 }}>{muscle(p.muscleKey).label}</b>
                      <div className="kv">{muscle(p.muscleKey).region} · {Math.round(p.pct * 100)}% of target arc</div></div>
                    <span className="mono" style={{ fontSize: 15 }}>{p.degrees}°</span>
                  </div>
                ))}
              </div>
            </div></div>
          )}

          <div className="panel"><div className="pad">
            <span className="eyebrow on-ink">Data streams</span>
            <div className="big" style={{ fontSize: 21, margin: '8px 0 6px' }}>
              {me.wearable ? `Connected — ${me.wearable}` : 'Sharpen your recovery score'}</div>
            <div className="kv" style={{ lineHeight: 1.6 }}>
              Add heart-rate variability, sleep and strain from your wearable. Recovery becomes measured rather than estimated.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {['whoop', 'apple'].map((p) => (
                <button key={p} className="btn line sm" onClick={() => act(
                  api('POST', `/members/${memberId}/wearable`, { provider: p }, 'MEMBER'), `${p} connected`)}>
                  {p === 'whoop' ? 'Whoop' : 'Apple Health'}</button>
              ))}
            </div>
          </div></div>
        </div>
      </>
    );
  };

  const Body = () => {
    if (!meas.length) return (
      <>
        <h2 style={{ fontSize: 34, margin: '6px 0 16px' }}>Range of Motion</h2>
        <div className="panel"><div className="pad kv" style={{ lineHeight: 1.7 }}>
          Nothing measured yet. Your coach captures ten joint angles at your first session and this map fills in.
        </div></div>
      </>
    );
    const m = meas.find((x: any) => x.muscleKey === sel) || meas[0];
    const info = muscle(m.muscleKey);
    const pv = prevMeas.find((x: any) => x.muscleKey === m.muscleKey);
    const drift = pv ? m.degrees - pv.degrees : null;
    return (
      <>
        <span className="eyebrow">Assessment · {assessment?.capturedAt} · {assessment?.source === 'bodymap' ? 'BodyMap device' : 'coach entry'}</span>
        <h2 style={{ fontSize: 34, margin: '6px 0 16px' }}>Range of Motion</h2>
        <div className="panel"><div className="pad">
          <div className="row"><span className="eyebrow on-ink">Whole-body map</span>
            <div className="seg">
              {(['front', 'back'] as const).map((f) => (
                <button key={f} aria-pressed={face === f} onClick={() => setFace(f)}>{f}</button>))}
            </div></div>
          <BodyMap face={face} measurements={meas} selected={sel} onSelect={setSel} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
            {['restricted', 'limited', 'optimal', 'excellent'].map((s) => (
              <span key={s} className={`pill s-${s}`} style={{ border: 'none' }}>●&nbsp;{s}</span>))}
          </div>
        </div></div>

        <div className="panel" style={{ marginTop: 14 }}><div className="pad">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 126px', gap: 12, alignItems: 'center' }}>
            <div>
              <span className="eyebrow on-ink">{info.region} region</span>
              <div className="big" style={{ fontSize: 28, margin: '6px 0 8px' }}>{info.label}</div>
              <div className="kv" style={{ lineHeight: 1.6, color: '#B6BCA9' }}>{info.note}</div>
              {drift !== null && <div className="kv" style={{ marginTop: 10, color: drift >= 0 ? 'var(--lime)' : 'var(--amber)' }}>
                {drift >= 0 ? '+' : ''}{drift}° since {prevAssessment.capturedAt}</div>}
            </div>
            <Gonio pct={m.degrees / m.target} size={126} label={`${m.degrees}°`} sub={`OF ${m.target}°`} />
          </div>
        </div></div>

        <div className="panel" style={{ marginTop: 14 }}><div className="pad">
          <span className="eyebrow on-ink">All groups</span>
          <div className="rowlist" style={{ marginTop: 6 }}>
            {MUSCLES.map((mu) => {
              const x = meas.find((y: any) => y.muscleKey === mu.key); if (!x) return null;
              const p = x.degrees / x.target;
              return (
                <div key={mu.key} onClick={() => { setSel(mu.key); setFace(mu.face); }}>
                  <span style={{ height: 26, background: colorOf(p), borderRadius: 2 }} />
                  <div><b style={{ fontFamily: 'var(--dsp)', fontSize: 15 }}>{mu.label}</b><div className="kv">{mu.region}</div></div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 14 }}>{x.degrees}° / {x.target}°</div>
                    <div className="kv">{Math.round(p * 100)}%</div></div>
                </div>);
            })}
          </div>
        </div></div>
      </>
    );
  };

  const Progress = () => {
    const cur = series.length ? series[series.length - 1][metric] : 0;
    const start = series.length ? series[0][metric] : 0;
    return (
      <>
        <span className="eyebrow">Longitudinal · {series.length} days on record</span>
        <h2 style={{ fontSize: 34, margin: '6px 0 16px' }}>Progress</h2>
        <div className="panel"><div className="pad">
          <div className="chipline">
            {(['flexibility', 'mobility', 'recovery'] as const).map((k) => (
              <button key={k} className="chip" aria-pressed={metric === k} onClick={() => setMetric(k)}>{k}</button>))}
          </div>
          <div style={{ display: 'flex', gap: 28, margin: '16px 0 6px' }}>
            <div><span className="eyebrow on-ink">Now</span><div className="big" style={{ fontSize: 32 }}>{cur}</div></div>
            <div><span className="eyebrow on-ink">At start</span><div className="big" style={{ fontSize: 32, color: 'var(--mute-ink)' }}>{start}</div></div>
            <div><span className="eyebrow on-ink">Change</span>
              <div className="big" style={{ fontSize: 32, color: cur - start >= 0 ? 'var(--lime)' : 'var(--amber)' }}>
                {cur - start >= 0 ? '+' : ''}{cur - start}</div></div>
          </div>
          <AreaChart series={series} keys={[metric]} />
        </div></div>

        <div className="panel" style={{ marginTop: 14 }}><div className="pad">
          <span className="eyebrow on-ink">All three compared</span>
          <AreaChart series={series} keys={['flexibility', 'mobility', 'recovery']} height={150} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['Flexibility', 'Mobility', 'Recovery'].map((n, i) => (
              <span key={n} className="kv">
                <span style={{ display: 'inline-block', width: 14, height: 2, background: ['#A9E34B', '#43B07C', '#E0A33C'][i], verticalAlign: 'middle' }} /> {n}
              </span>))}
          </div>
        </div></div>

        <div className="panel" style={{ marginTop: 14 }}><div className="pad">
          <span className="eyebrow on-ink">Session history · {sessions.length} logged</span>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {sessions.length ? sessions.slice(0, 8).map((s: any) => (
              <div key={s.id} style={{ padding: 13, borderRadius: 3, background: 'rgba(237,235,226,.045)', boxShadow: 'inset 0 0 0 1px rgba(237,235,226,.09)' }}>
                <div className="row"><b style={{ fontFamily: 'var(--dsp)', fontSize: 16 }}>{s.mins} min · {s.modalities.join(' + ')}</b>
                  <span className="kv">{s.completedAt}</span></div>
                <div className="kv" style={{ margin: '6px 0 9px' }}>
                  {coachName(s.coachId)} · RPE {s.rpe} · pain {s.painBefore}→{s.painAfter}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: '#D4D8C7' }}>{s.memberSummary}</div>
              </div>)) : <div className="kv">No sessions yet. Your coach&apos;s summary appears here after the first one.</div>}
          </div>
        </div></div>
      </>
    );
  };

  const Book = () => {
    const sv = service(draft.svc);
    const total = sv.aed + draft.addons.reduce((s, a) => s + addon(a).aed, 0);
    const dates = [...Array(7)].map((_, i) => addDays(new Date(), i));
    return (
      <>
        <span className="eyebrow">{SITE.name}</span>
        <h2 style={{ fontSize: 34, margin: '6px 0 16px' }}>Book a session</h2>
        {!me.parqCleared && (
          <div className="flag" style={{ marginBottom: 14, color: 'var(--on-bone)', background: 'rgba(210,83,42,.16)' }}>
            <span><b>Screening needed.</b> Complete your readiness questionnaire with a coach before your first session.</span>
          </div>)}
        <div className="panel"><div className="pad">
          <span className="eyebrow on-ink">Service</span>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {SERVICES.map((s) => (
              <button key={s.id} className="svc" aria-pressed={draft.svc === s.id}
                      onClick={() => setDraft({ ...draft, svc: s.id, slot: null })}>
                <b>{s.name}</b><span className="p">AED {s.aed}</span><small>{s.mins} min · {s.desc}</small>
              </button>))}
          </div>

          <div style={{ marginTop: 18 }}><span className="eyebrow on-ink">Date</span>
            <div className="chipline" style={{ marginTop: 9 }}>
              {dates.map((d) => (
                <button key={iso(d)} className="chip" aria-pressed={draft.date === iso(d)}
                        onClick={() => setDraft({ ...draft, date: iso(d), slot: null })}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()} {d.getDate()}
                </button>))}
            </div></div>

          <div style={{ marginTop: 18 }}><span className="eyebrow on-ink">Time</span>
            <div className="slots" style={{ marginTop: 9 }}>
              {slots.map((s) => (
                <button key={s.time} className="slot" disabled={s.busy} aria-pressed={draft.slot === s.time}
                        onClick={() => setDraft({ ...draft, slot: s.time })}>{s.time}</button>))}
            </div></div>

          <div style={{ marginTop: 18 }}><span className="eyebrow on-ink">Add-ons</span>
            <div className="checks" style={{ marginTop: 9 }}>
              {ADDONS.map((a) => (
                <label key={a.id}>
                  <input type="checkbox" checked={draft.addons.includes(a.id)}
                         onChange={() => setDraft({ ...draft, addons: draft.addons.includes(a.id) ? draft.addons.filter((x) => x !== a.id) : [...draft.addons, a.id] })} />
                  {a.name} · AED {a.aed}
                </label>))}
            </div></div>

          <div className="row" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(237,235,226,.12)' }}>
            <div><span className="eyebrow on-ink">Total</span>
              <div className="big" style={{ fontSize: 27 }}>AED {total}</div>
              <div className="kv">{me.credits} session credits on account</div></div>
            <button className="btn" disabled={!draft.slot || !me.parqCleared} onClick={book}>Request session</button>
          </div>
        </div></div>
      </>
    );
  };

  const Home = () => (
    <>
      <span className="eyebrow">Prescribed by your coach</span>
      <h2 style={{ fontSize: 34, margin: '6px 0 16px' }}>Home programme</h2>
      {programs.length ? programs.map((p: any) => {
        const doneToday = p.completions.includes(todayIso());
        return (
          <div className="panel" key={p.id} style={{ marginBottom: 14 }}><div className="pad">
            <div className="row">
              <div><span className="eyebrow on-ink">Assigned {p.assignedAt} · {coachName(p.coachId)}</span>
                <div className="big" style={{ fontSize: 23, marginTop: 6 }}>{p.title}</div></div>
              <div style={{ textAlign: 'right' }}><div className="big" style={{ fontSize: 30 }}>{p.completions.length}</div>
                <span className="eyebrow on-ink">Done</span></div>
            </div>
            <div className="rowlist" style={{ marginTop: 10 }}>
              {p.moves.map((mv: any, i: number) => (
                <div key={i} style={{ cursor: 'default' }}>
                  <span className="mono" style={{ color: 'var(--lime)', fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div><b style={{ fontFamily: 'var(--dsp)', fontSize: 16 }}>{mv.n}</b><div className="kv">{mv.d}</div></div>
                  <span />
                </div>))}
            </div>
            <button className="btn" style={{ marginTop: 16, width: '100%' }} disabled={doneToday}
                    onClick={() => act(api('POST', `/programs/${p.id}/complete`, {}, 'MEMBER'), 'Logged for today')}>
              {doneToday ? 'Logged for today' : 'Mark today complete'}</button>
          </div></div>);
      }) : (
        <div className="panel"><div className="pad kv" style={{ lineHeight: 1.7 }}>
          Nothing prescribed yet. Your coach assigns a home block after your next session — usually three or four moves that
          take under ten minutes.
        </div></div>)}
    </>
  );

  /* Called as plain functions, not rendered as <Component />. Defining a
     component inside another gives it a new identity on every render, which
     makes React unmount and remount it — losing any state and scroll position
     every time the 5-second poll lands. */
  const body = () => {
    if (!me) return <div className="kv on-bone">Member not found.</div>;
    switch (tab) {
      case 'today': return Today();
      case 'body': return Body();
      case 'progress': return Progress();
      case 'book': return Book();
      case 'home': return Home();
    }
  };

  return (
    <>
      <div className="member">{body()}</div>
      <nav className="mtabs">
        {(['today', 'body', 'progress', 'book', 'home'] as const).map((k) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{k}</button>))}
      </nav>
    </>
  );
}
