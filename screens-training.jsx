// screens-training.jsx — Screen 2: Trainingsplan (Weekly Plan)
const MUSCLE_KEY = {
  'Brust':'brust','Rücken':'ruecken','Schultern':'schultern','Bizeps':'bizeps',
  'Trizeps':'trizeps','Bauch':'bauch','Beine':'beine',
};
const ALL_MUSCLES = ['brust','ruecken','schultern','bizeps','trizeps','bauch','beine'];
const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
};

function ScreenTraining({ data, setData, user, reload }) {
  // Current week (Monday → Sunday) derived from today; today's index expanded by default.
  const today = React.useMemo(() => new Date(), []);
  const todayIdx = (today.getDay() + 6) % 7; // 0 = Mo, 6 = So
  const monday = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - todayIdx);
    return d;
  }, [today, todayIdx]);
  const sunday = React.useMemo(() => {
    const d = new Date(monday); d.setDate(d.getDate() + 7); return d;
  }, [monday]);

  const dayLabels = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const fullDayLabels = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];

  const [doneDays, setDoneDays] = React.useState(new Set());
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = (await window.sb.auth.getUser()).data.user;
        if (!u) return;
        const sessions = await window.gainz.sessions.byDateRange(
          u.id, monday.toISOString(), sunday.toISOString(),
        );
        const set = new Set();
        (sessions || []).forEach(s => {
          if (s.status !== 'done') return;
          const d = new Date(s.started_at);
          set.add((d.getDay() + 6) % 7);
        });
        if (alive) setDoneDays(set);
      } catch (e) { console.error(e); }
    })();
    return () => { alive = false; };
  }, [monday, sunday]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i);
    const state = doneDays.has(i) ? 'done' : (i === todayIdx ? 'today' : 'empty');
    return { day: dayLabels[i], date: String(d.getDate()), monthShort: d.toLocaleDateString('de-DE', { month:'short' }), state };
  });

  const isoWeekNumber = React.useMemo(() => {
    const d = new Date(today.valueOf());
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }, [today]);
  const headerSub = `KW ${isoWeekNumber} · ${monday.toLocaleDateString('de-DE', { day:'numeric', month:'short' })} – ${(() => { const e = new Date(monday); e.setDate(e.getDate()+6); return e.toLocaleDateString('de-DE', { day:'numeric', month:'short', year:'numeric' }); })()}`;

  const [expanded, setExpanded] = React.useState(todayIdx);
  const [activeMood, setActiveMood] = React.useState(null);
  const [trackingMode, setTrackingMode] = React.useState({});
  const [setsBy, setSetsBy] = React.useState({});  // empty by default — no fake plan
  const [note, setNote] = React.useState('');
  const [wins, setWins] = React.useState('');
  const [hard, setHard] = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [error, setError]   = React.useState(null);
  const [toastUntil, setToastUntil] = React.useState(0);
  const [, force] = React.useReducer(x => x + 1, 0);
  const toastVisible = Date.now() < toastUntil;
  React.useEffect(() => {
    if (!toastUntil) return;
    const id = setTimeout(force, Math.max(0, toastUntil - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [toastUntil]);

  const muscleList = ['Brust','Rücken','Schultern','Bizeps','Trizeps','Bauch','Beine'];

  // Tab state — 'week' = log + plan (existing), 'history' = Verlauf
  const [tab, setTab] = React.useState('week');

  const onFinish = async () => {
    if (saving || !user) return;
    setError(null);

    // Need at least one logged set to count as a real workout.
    const trainedMuscles = Object.entries(setsBy)
      .filter(([, sets]) => Number(sets) > 0)
      .map(([m, sets]) => ({
        muscle: MUSCLE_KEY[m] || m.toLowerCase(),
        sets: Number(sets),
        tracking: trackingMode[m] || 'reps',
      }));
    if (trainedMuscles.length === 0) {
      setError('Bitte trag mindestens einen Satz für eine Muskelgruppe ein.');
      return;
    }

    setSaving(true);
    try {
      const dayDate = new Date(monday);
      dayDate.setDate(dayDate.getDate() + expanded);
      const isToday = expanded === todayIdx;
      const now = new Date();
      const startedAt = isToday
        ? now
        : new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 12, 0, 0);

      // 0) Capture prior last-trained date BEFORE inserting new session,
      //    derived from workout_sessions (no profile column needed).
      const priorLastTrained = await window.gainz.sessions.lastTrainedDate(user.id);

      // 1) Create session
      const sess = await window.gainz.sessions.start(user.id, {
        started_at: startedAt.toISOString(),
        mood: activeMood || null,
        note: note ? note.trim() : null,
        wins: wins ? wins.trim() : null,
        hard: hard ? hard.trim() : null,
      });
      // 2) Trained muscle rows
      await window.gainz.sessions.addMuscles(sess.id, trainedMuscles);
      // 3) Finalize
      await window.gainz.sessions.finish(sess.id, { duration_min: null });

      // 4) Profile: week_done + streak — only count the FIRST workout of the day
      const todayYMD = ymd(new Date());
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestYMD = ymd(yest);
      const priorDate = priorLastTrained;
      const isFirstToday = priorDate !== todayYMD;
      console.log('[training save] priorLastTrained:', priorDate, 'today:', todayYMD, 'isFirstToday:', isFirstToday);

      let nextStreak = Number(data.streak) || 0;
      if (priorDate === todayYMD) {
        // already trained today → keep streak as-is, do not bump
      } else if (priorDate === yestYMD) {
        nextStreak = nextStreak + 1;
      } else {
        nextStreak = 1;
      }

      const profilePatch = { streak: nextStreak };
      if (isFirstToday) {
        profilePatch.week_done = (Number(data.weekDone) || 0) + 1;
      }
      console.log('[training save] profile patch', profilePatch);
      await window.gainz.profile.update(user.id, profilePatch);

      // 5) Recompute muscle_status for the current week from real sessions.
      const weekStart = new Date(monday);
      const weekEnd = new Date(monday); weekEnd.setDate(weekEnd.getDate() + 7);
      const weekSessions = await window.gainz.sessions.byDateRange(
        user.id, weekStart.toISOString(), weekEnd.toISOString(),
      );
      const doneIds = (weekSessions || []).filter(s => s.status === 'done').map(s => s.id);
      const sums = {};
      if (doneIds.length) {
        const { data: rows, error: e } = await window.sb.from('workout_session_muscles')
          .select('muscle, sets').in('session_id', doneIds);
        if (e) throw e;
        (rows || []).forEach(r => { sums[r.muscle] = (sums[r.muscle] || 0) + Number(r.sets); });
      }
      const targets = data.muscleTargets || {};
      await Promise.all(ALL_MUSCLES.map((m) => {
        const sets = sums[m] || 0;
        const goal = Number(targets[m]) || 0;
        let status = 'grey';
        if (sets > 0 && goal > 0) {
          const pct = sets / goal;
          status = pct >= 1 ? 'green' : pct >= 0.5 ? 'yellow' : 'red';
        }
        return window.gainz.muscles.set(user.id, m, status);
      }));

      // 6) Leaderboard: increment by THIS session's contribution.
      //    score += sessionSets, workouts += 1 (via upsert).
      const sessionSets = trainedMuscles.reduce((a, m) => a + Number(m.sets), 0);
      const weekStartISO = ymd(weekStart);
      console.log('[training save] leaderboard call', { userId: user.id, weekStartISO, sessionSets });
      try {
        const result = await window.gainz.leaderboard.addSessionContribution(user.id, weekStartISO, sessionSets);
        console.log('[training save] leaderboard write success', result);
      } catch (e) {
        console.error('[training save] leaderboard write FAILED', e);
        setError(`Leaderboard nicht aktualisiert: ${e?.message || e}`);
      }

      // 7) Reset form
      setActiveMood(null); setNote(''); setWins(''); setHard('');
      setSetsBy({}); setTrackingMode({});

      // 8) Refresh global app data so every screen reflects new state.
      if (typeof reload === 'function') await reload();

      // 9) Toast
      setToastUntil(Date.now() + 2400);
    } catch (e) {
      console.error('save workout failed', e);
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-screen-label="02 Training">
      <ScreenHeader title="Trainingsplan" sub={tab === 'week' ? headerSub : 'Verlauf · alle Trainings'}/>

      {/* TABS */}
      <Section style={{ marginTop: 0 }}>
        <div style={{
          display:'flex', gap: 4, padding: 4,
          background:'rgba(255,255,255,0.03)',
          borderRadius: 12, border:'1px solid var(--line)',
        }}>
          {[['week','Diese Woche'], ['history','Verlauf']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding:'10px', border:'none', borderRadius: 9,
              background: tab === k ? 'var(--card-2)' : 'transparent',
              color: tab === k ? 'var(--accent)' : 'var(--txt-2)',
              fontSize: 13, fontWeight: 600, cursor:'pointer',
              fontFamily:'inherit',
              boxShadow: tab === k ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(var(--accent-bloom-rgb, var(--accent-rgb)),0.15)' : 'none',
              transition: 'all .15s',
            }}>{l}</button>
          ))}
        </div>
      </Section>

      {tab === 'history' ? <VerlaufTab user={user}/> : <>

      {/* WEEK GRID */}
      <Section>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 6 }}>
          {week.map((d, i) => {
            const dot = { done: 'var(--green)', today: 'var(--green)', empty: 'rgba(255,255,255,0.10)' }[d.state];
            const isOpen = expanded === i;
            const isToday = d.state === 'today';
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? -1 : i)} style={{
                background: isOpen ? 'rgba(var(--accent-rgb),0.09)' : isToday ? 'rgba(var(--accent-rgb),0.05)' : 'var(--card)',
                border: `1px solid ${isOpen || isToday ? 'rgba(var(--accent-rgb),0.25)' : 'var(--line)'}`,
                borderRadius: 12, padding: '10px 4px',
                display:'flex', flexDirection:'column', alignItems:'center', gap: 6,
                cursor:'pointer',
                boxShadow: isOpen ? '0 0 18px rgba(var(--accent-rgb),0.20)' : 'none',
                transition:'all .2s'
              }}>
                <div style={{ fontSize: 10, color:'var(--txt-2)', fontWeight: 600, letterSpacing: 1, fontFamily: 'Inter, sans-serif' }}>{d.day}</div>
                <div className={isToday ? 'ticker grad-text' : 'ticker'} style={{ fontSize: 17, fontWeight: 700, color: isToday ? undefined : 'var(--txt)' }}>{d.date}</div>
                <div style={{
                  width: 7, height: 7, borderRadius: 7, background: dot,
                  boxShadow: d.state === 'done' || d.state === 'today' ? '0 0 8px rgba(var(--accent-rgb),0.35)' : 'none',
                  animation: d.state === 'today' ? 'softPulse 1.6s ease-in-out infinite' : 'none',
                }}/>
              </div>
            );
          })}
        </div>
      </Section>

      {/* EXPANDED DAY VIEW */}
      {expanded >= 0 && (
        <>
          <Section style={{ marginTop: 4 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontFamily:'Inter, sans-serif', fontWeight:600 }}>
                  {fullDayLabels[expanded]} · {week[expanded].date}. {week[expanded].monthShort}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing:-0.3 }}>
                  {week[expanded].state === 'done' ? 'Abgeschlossen ✓' : week[expanded].state === 'today' ? 'Heute loggen' : 'Was hast du trainiert?'}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Muskelgruppen">
            <Card padding={4} style={{ overflow:'hidden' }}>
              {muscleList.map((m, i) => {
                const sets = setsBy[m] || 0;
                const mode = trackingMode[m] || 'reps';
                return (
                  <div key={m} style={{
                    display:'flex', alignItems:'center', gap: 12,
                    padding: '12px 12px',
                    borderBottom: i < muscleList.length - 1 ? '1px solid var(--line)' : 'none'
                  }}>
                    <MuscleGlyph name={m}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m}</div>
                      <div style={{ display:'flex', gap: 4, marginTop: 4 }}>
                        {['reps','time'].map(t => (
                          <button key={t} onClick={() => setTrackingMode({...trackingMode, [m]: t })} style={{
                            border:'none', cursor:'pointer',
                            padding:'2px 8px', borderRadius: 6,
                            fontSize: 10, fontWeight: 600, fontFamily:'Inter, sans-serif', letterSpacing: 0.5,
                            background: mode === t ? 'rgba(var(--accent-rgb),0.11)' : 'transparent',
                            color: mode === t ? 'var(--accent)' : 'var(--txt-3)',
                            textTransform:'uppercase'
                          }}>{t === 'reps' ? 'Reps' : 'Zeit'}</button>
                        ))}
                      </div>
                    </div>
                    <Stepper value={sets} onChange={(v) => setSetsBy({...setsBy, [m]: v })}/>
                  </div>
                );
              })}
            </Card>
          </Section>

          <Section title="Stimmung">
            <div style={{ display:'flex', gap: 8 }}>
              {['💪','😤','⚡','😴','🔥'].map(e => (
                <button key={e} onClick={() => setActiveMood(activeMood === e ? null : e)} style={{
                  flex: 1, height: 48, borderRadius: 14,
                  border: `1px solid ${activeMood === e ? 'rgba(var(--accent-rgb),0.28)' : 'var(--line)'}`,
                  background: activeMood === e ? 'rgba(var(--accent-rgb),0.09)' : 'rgba(140,150,255,0.02)',
                  fontSize: 22, cursor:'pointer',
                  boxShadow: activeMood === e ? '0 0 16px rgba(var(--accent-rgb),0.20)' : 'none',
                  transition:'all .15s'
                }}>{e}</button>
              ))}
            </div>
          </Section>

          <Section title="Notiz zum Training">
            <Card padding={0}>
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0,300))} placeholder="z.B. Schultern fühlten sich heute solide an…"
                style={{
                  width:'100%', minHeight: 70, padding: 14,
                  background: 'transparent', border: 'none', outline:'none',
                  resize:'none', color: 'var(--txt)', fontSize: 14,
                  fontFamily: 'inherit'
                }}/>
              <div style={{ padding: '0 14px 10px', textAlign:'right', fontSize: 11, color: note.length > 250 ? 'var(--gold)' : 'var(--txt-3)', fontFamily: 'Inter, sans-serif' }}>{note.length}/300</div>
            </Card>
          </Section>

          <Section title="Reflexion">
            <div style={{ display:'grid', gap: 10 }}>
              {[{ label:'Was gut lief', value: wins, set: setWins, ph: 'PRs, Form, Energie…' },
                { label:'Was schwer war', value: hard, set: setHard, ph: 'Knie, Atem, Konzentration…' }].map(f => (
                <Card key={f.label} padding={12}>
                  <div style={{ fontSize: 11, color: 'var(--txt-2)', fontWeight: 600, fontFamily:'Inter, sans-serif', textTransform:'uppercase', letterSpacing:1.2 }}>{f.label}</div>
                  <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                    style={{
                      width:'100%', marginTop: 6, padding: 0,
                      background: 'transparent', border:'none', outline:'none',
                      color:'var(--txt)', fontSize: 14, fontFamily:'inherit'
                    }}/>
                </Card>
              ))}
            </div>
          </Section>

          <Section style={{ marginBottom: 16, position:'relative' }}>
            {error && (
              <div style={{
                marginBottom: 10, padding:'10px 12px',
                background:'rgba(239,68,68,0.10)',
                border:'1px solid rgba(239,68,68,0.30)',
                borderRadius: 10,
                color:'#EF4444', fontSize: 12,
              }}>{error}</div>
            )}
            <CTA onClick={onFinish} icon={<Icon.check size={18} color="#fff"/>}>
              {saving ? 'Speichern…' : 'Speichern'}
            </CTA>
            {toastVisible && (
              <div style={{
                position:'absolute', left:'50%', bottom:'100%',
                transform:'translate(-50%, -10px)',
                padding:'10px 16px', borderRadius: 999,
                background:'rgba(34,197,94,0.18)',
                border:'1px solid rgba(34,197,94,0.45)',
                color:'#22C55E', fontSize: 13, fontWeight: 700,
                fontFamily:'Inter, sans-serif', letterSpacing: 0.6,
                boxShadow:'0 8px 24px rgba(34,197,94,0.25)',
                whiteSpace:'nowrap',
              }}>Training gespeichert! 💪</div>
            )}
          </Section>
        </>
      )}

      </>}
    </div>
  );
}

// ─── VERLAUF TAB ───────────────────────────────────────────────────────────
const MUSCLE_LABEL_DE = {
  brust: 'Brust', ruecken: 'Rücken', schultern: 'Schultern',
  bizeps: 'Bizeps', trizeps: 'Trizeps', bauch: 'Bauch', beine: 'Beine',
};

function VerlaufTab({ user }) {
  const [monthDate, setMonthDate] = React.useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });
  const [sessions, setSessions] = React.useState(null);
  const [expandedId, setExpandedId] = React.useState(null);

  React.useEffect(() => {
    if (!user) return;
    let alive = true;
    setSessions(null);
    (async () => {
      try {
        const data = await window.gainz.sessions.monthWithMuscles(
          user.id, monthDate.getFullYear(), monthDate.getMonth(),
        );
        if (alive) setSessions(data);
      } catch (e) { console.error('verlauf load failed', e); if (alive) setSessions([]); }
    })();
    return () => { alive = false; };
  }, [user, monthDate]);

  const monthLabel = monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const goPrev = () => { const d = new Date(monthDate); d.setMonth(d.getMonth() - 1); setMonthDate(d); };
  const goNext = () => { const d = new Date(monthDate); d.setMonth(d.getMonth() + 1); setMonthDate(d); };
  const isCurrentMonth = (() => {
    const now = new Date();
    return monthDate.getFullYear() === now.getFullYear() && monthDate.getMonth() === now.getMonth();
  })();

  // Per-day totals
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const dayBars = Array.from({ length: daysInMonth }, () => 0);
  let totalSessions = 0, totalSets = 0;
  (sessions || []).forEach(s => {
    const d = new Date(s.started_at);
    if (d.getFullYear() !== monthDate.getFullYear() || d.getMonth() !== monthDate.getMonth()) return;
    totalSessions += 1;
    const ds = (s.muscles || []).reduce((a, m) => a + Number(m.sets), 0);
    totalSets += ds;
    dayBars[d.getDate() - 1] += ds;
  });
  const trainedDays = dayBars.filter(v => v > 0).length;
  const avgPerDay = trainedDays > 0 ? Math.round(totalSets / trainedDays) : 0;
  const maxBar = Math.max(...dayBars, 1);

  // Per-session per-muscle delta vs the prior session (within loaded month)
  // that hit the same muscle.
  const asc = (sessions || []).slice().sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
  const lastByMuscle = {};
  const deltaMap = {}; // session_id -> { muscle: delta }
  asc.forEach(s => {
    const dm = {};
    (s.muscles || []).forEach(m => {
      const prev = lastByMuscle[m.muscle];
      if (prev != null) dm[m.muscle] = Number(m.sets) - prev;
      lastByMuscle[m.muscle] = Number(m.sets);
    });
    deltaMap[s.id] = dm;
  });

  return (
    <>
      {/* MONTH OVERVIEW */}
      <Section>
        <Card padding={16}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
            <button onClick={goPrev} aria-label="Vorheriger Monat" style={navBtnStyle}>←</button>
            <div className="serif" style={{
              fontSize: 22, fontStyle:'italic', fontWeight: 600,
              color:'var(--txt)', textTransform:'capitalize',
            }}>{monthLabel}</div>
            <button onClick={goNext} aria-label="Nächster Monat" disabled={isCurrentMonth} style={{
              ...navBtnStyle,
              opacity: isCurrentMonth ? 0.30 : 1,
              cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
            }}>→</button>
          </div>

          {/* DAILY BAR CHART */}
          <div style={{
            display:'flex', alignItems:'flex-end', gap: 2,
            height: 64, marginBottom: 10,
          }}>
            {dayBars.map((v, i) => (
              <div key={i} title={v > 0 ? `${i+1}. · ${v} Sätze` : `${i+1}. · keine`} style={{
                flex: 1, minWidth: 2,
                height: v > 0 ? `${(v / maxBar) * 100}%` : 2,
                minHeight: v > 0 ? 4 : 2,
                background: v > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                boxShadow: v > 0 ? '0 0 6px rgba(var(--accent-bloom-rgb, var(--accent-rgb)),0.30)' : 'none',
                transition: 'height .25s',
              }}/>
            ))}
          </div>
          <div style={{
            display:'flex', justifyContent:'space-between',
            fontSize: 9, color:'var(--txt-3)',
            fontFamily:'Inter, sans-serif', letterSpacing: 0.6,
            marginBottom: 14,
          }}>
            <span>1.</span><span>{Math.ceil(daysInMonth/2)}.</span><span>{daysInMonth}.</span>
          </div>

          {/* SUMMARY ROW */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8,
            paddingTop: 12, borderTop:'1px solid var(--line)',
          }}>
            {[
              { label:'Sessions',    val: totalSessions },
              { label:'Gesamtsätze', val: totalSets },
              { label:'Ø Sets/Tag',  val: avgPerDay },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div className="ticker serif" style={{
                  fontSize: 22, fontWeight: 600, fontStyle:'italic',
                  color:'var(--accent)', lineHeight: 1,
                }}>{s.val}</div>
                <div className="label-cap" style={{ marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* SESSION LIST */}
      {sessions === null ? (
        <Section><Card padding={20} style={{ textAlign:'center', color:'var(--txt-2)' }}>Lade Verlauf…</Card></Section>
      ) : sessions.length === 0 ? (
        <Section style={{ marginBottom: 24 }}>
          <Card padding={24} style={{ textAlign:'center' }}>
            <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.55 }}>
              Noch keine Trainings aufgezeichnet — leg los und dein Verlauf erscheint hier.
            </div>
          </Card>
        </Section>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {sessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              expanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
              deltas={deltaMap[s.id] || {}}
            />
          ))}
        </div>
      )}
    </>
  );
}

const navBtnStyle = {
  width: 36, height: 36, borderRadius: 10,
  background:'rgba(var(--accent-rgb),0.10)',
  border:'1px solid rgba(var(--accent-rgb),0.30)',
  color:'var(--accent)', fontSize: 16, fontWeight: 700,
  cursor:'pointer', fontFamily:'inherit',
  display:'flex', alignItems:'center', justifyContent:'center',
};

function SessionCard({ session, expanded, onToggle, deltas }) {
  const dt = new Date(session.started_at);
  const dateLabel = dt.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' });
  const totalSets = (session.muscles || []).reduce((a, m) => a + Number(m.sets), 0);
  const noteSnippet = session.note ? (session.note.length > 80 ? session.note.slice(0,80) + '…' : session.note) : null;

  return (
    <Section style={{ marginBottom: 10 }}>
      <Card padding={14} onClick={onToggle} style={{ cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label-cap" style={{ marginBottom: 8, color:'var(--txt-2)' }}>{dateLabel}</div>

            {/* Muscle pills */}
            {session.muscles && session.muscles.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap: 4, marginBottom: 8 }}>
                {session.muscles.map(m => (
                  <span key={m.id || m.muscle} style={{
                    padding:'3px 9px', borderRadius: 999,
                    background:'rgba(var(--accent-rgb),0.10)',
                    border:'1px solid rgba(var(--accent-rgb),0.25)',
                    color:'var(--accent)', fontSize: 10, fontWeight: 600,
                    fontFamily:'Inter, sans-serif', letterSpacing: 0.4,
                  }}>{MUSCLE_LABEL_DE[m.muscle] || m.muscle}</span>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color:'var(--txt-2)', display:'flex', alignItems:'center', gap: 8 }}>
              <span><span className="ticker" style={{ color:'var(--txt)', fontWeight: 700 }}>{totalSets}</span> Sätze</span>
              {session.mood && <span style={{ fontSize: 16 }}>{session.mood}</span>}
              {session.duration_min && <span>{session.duration_min} min</span>}
            </div>

            {noteSnippet && (
              <div style={{
                fontStyle:'italic', fontSize: 12, color:'var(--txt-3)',
                marginTop: 8, lineHeight: 1.45,
              }}>„{noteSnippet}"</div>
            )}
          </div>
          <div style={{
            flexShrink: 0,
            color:'var(--txt-3)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
          }}>
            <Icon.chevronDown size={16} color="var(--txt-3)"/>
          </div>
        </div>

        {expanded && (
          <div onClick={(e) => e.stopPropagation()} style={{
            marginTop: 14, paddingTop: 14,
            borderTop: '1px solid var(--line)',
            display:'flex', flexDirection:'column', gap: 14,
          }}>
            {/* Muscle breakdown with progression */}
            <div>
              <div className="label-cap" style={{ marginBottom: 8 }}>Muskelgruppen</div>
              <div style={{ display:'grid', gap: 6 }}>
                {(session.muscles || []).map(m => {
                  const d = deltas[m.muscle];
                  const arrowColor = d == null || d === 0 ? 'var(--txt-3)' : (d > 0 ? '#00A878' : '#B86A6A');
                  return (
                    <div key={m.id || m.muscle} style={{
                      display:'flex', alignItems:'center', gap: 10,
                      padding:'8px 10px', borderRadius: 10,
                      background:'rgba(255,255,255,0.02)',
                      border:'1px solid var(--line)',
                    }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{MUSCLE_LABEL_DE[m.muscle] || m.muscle}</div>
                      <div className="ticker" style={{ fontSize: 13, fontWeight: 700, color:'var(--accent)' }}>
                        {m.sets} <span style={{ color:'var(--txt-3)', fontWeight: 500 }}>Sets</span>
                      </div>
                      {d != null && d !== 0 && (
                        <div style={{
                          fontSize: 10, fontWeight: 700,
                          fontFamily:'Inter, sans-serif', letterSpacing: 0.4,
                          color: arrowColor,
                          padding:'3px 8px', borderRadius: 999,
                          background: d > 0 ? 'rgba(0,168,120,0.10)' : 'rgba(184,106,106,0.10)',
                          border: `1px solid ${d > 0 ? 'rgba(0,168,120,0.30)' : 'rgba(184,106,106,0.30)'}`,
                          whiteSpace:'nowrap',
                        }}>
                          {d > 0 ? '↑' : '↓'} {Math.abs(d)} {d > 0 ? 'mehr' : 'weniger'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mood */}
            {session.mood && (
              <div>
                <div className="label-cap" style={{ marginBottom: 8 }}>Stimmung</div>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{session.mood}</div>
              </div>
            )}

            {/* Notiz */}
            {session.note && (
              <div>
                <div className="label-cap" style={{ marginBottom: 8 }}>Notiz</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color:'var(--txt)' }}>{session.note}</div>
              </div>
            )}

            {/* Wins */}
            {session.wins && (
              <div>
                <div className="label-cap" style={{ marginBottom: 8 }}>Was gut lief</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color:'var(--txt)' }}>{session.wins}</div>
              </div>
            )}

            {/* Hard */}
            {session.hard && (
              <div>
                <div className="label-cap" style={{ marginBottom: 8 }}>Was schwer war</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color:'var(--txt)' }}>{session.hard}</div>
              </div>
            )}
          </div>
        )}
      </Card>
    </Section>
  );
}

window.ScreenTraining = ScreenTraining;
