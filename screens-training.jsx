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

      // 4) Profile: week_done + streak
      // last_trained is derived from workout_sessions, not a profile column.
      // We query the most recent done session BEFORE this insert to decide:
      //   priorDate === today     → keep streak (multi-saves same day)
      //   priorDate === yesterday → streak + 1
      //   otherwise               → reset streak to 1
      const todayYMD = ymd(new Date());
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yestYMD = ymd(yest);
      const priorDate = priorLastTrained; // captured before insert
      let nextStreak = Number(data.streak) || 0;
      if (priorDate === todayYMD) {
        if (nextStreak === 0) nextStreak = 1;
      } else if (priorDate === yestYMD) {
        nextStreak = nextStreak + 1;
      } else {
        nextStreak = 1;
      }
      await window.gainz.profile.update(user.id, {
        week_done: (Number(data.weekDone) || 0) + 1,
        streak: nextStreak,
      });

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

      // 6) Leaderboard: simple score = total sets logged this week × 10
      try {
        const totalSets = Object.values(sums).reduce((a,b) => a+b, 0);
        const weekStartISO = ymd(weekStart);
        await window.gainz.leaderboard.upsertMine(user.id, weekStartISO, totalSets * 10, doneIds.length);
      } catch (e) { console.error('leaderboard upsert failed', e); }

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
      <ScreenHeader title="Trainingsplan" sub={headerSub}/>

      {/* WEEK GRID */}
      <Section>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 6 }}>
          {week.map((d, i) => {
            const dot = { done: 'var(--green)', today: 'var(--green)', empty: 'rgba(255,255,255,0.10)' }[d.state];
            const isOpen = expanded === i;
            const isToday = d.state === 'today';
            return (
              <div key={i} onClick={() => setExpanded(isOpen ? -1 : i)} style={{
                background: isOpen ? 'rgba(61,128,104,0.09)' : isToday ? 'rgba(61,128,104,0.05)' : 'var(--card)',
                border: `1px solid ${isOpen || isToday ? 'rgba(61,128,104,0.25)' : 'var(--line)'}`,
                borderRadius: 12, padding: '10px 4px',
                display:'flex', flexDirection:'column', alignItems:'center', gap: 6,
                cursor:'pointer',
                boxShadow: isOpen ? '0 0 18px rgba(61,128,104,0.20)' : 'none',
                transition:'all .2s'
              }}>
                <div style={{ fontSize: 10, color:'var(--txt-2)', fontWeight: 600, letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>{d.day}</div>
                <div className={isToday ? 'ticker grad-text' : 'ticker'} style={{ fontSize: 17, fontWeight: 700, color: isToday ? undefined : 'var(--txt)' }}>{d.date}</div>
                <div style={{
                  width: 7, height: 7, borderRadius: 7, background: dot,
                  boxShadow: d.state === 'done' || d.state === 'today' ? '0 0 8px rgba(61,128,104,0.35)' : 'none',
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
                <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontFamily:'JetBrains Mono, monospace', fontWeight:600 }}>
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
                            fontSize: 10, fontWeight: 600, fontFamily:'JetBrains Mono, monospace', letterSpacing: 0.5,
                            background: mode === t ? 'rgba(61,128,104,0.11)' : 'transparent',
                            color: mode === t ? '#3d8068' : 'var(--txt-3)',
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
                  border: `1px solid ${activeMood === e ? 'rgba(61,128,104,0.28)' : 'var(--line)'}`,
                  background: activeMood === e ? 'rgba(61,128,104,0.09)' : 'rgba(140,150,255,0.02)',
                  fontSize: 22, cursor:'pointer',
                  boxShadow: activeMood === e ? '0 0 16px rgba(61,128,104,0.20)' : 'none',
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
              <div style={{ padding: '0 14px 10px', textAlign:'right', fontSize: 11, color: note.length > 250 ? 'var(--gold)' : 'var(--txt-3)', fontFamily: 'JetBrains Mono, monospace' }}>{note.length}/300</div>
            </Card>
          </Section>

          <Section title="Reflexion">
            <div style={{ display:'grid', gap: 10 }}>
              {[{ label:'Was gut lief', value: wins, set: setWins, ph: 'PRs, Form, Energie…' },
                { label:'Was schwer war', value: hard, set: setHard, ph: 'Knie, Atem, Konzentration…' }].map(f => (
                <Card key={f.label} padding={12}>
                  <div style={{ fontSize: 11, color: 'var(--txt-2)', fontWeight: 600, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:1.2 }}>{f.label}</div>
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
                fontFamily:'JetBrains Mono, monospace', letterSpacing: 0.6,
                boxShadow:'0 8px 24px rgba(34,197,94,0.25)',
                whiteSpace:'nowrap',
              }}>Training gespeichert! 💪</div>
            )}
          </Section>
        </>
      )}


    </div>
  );
}

window.ScreenTraining = ScreenTraining;
