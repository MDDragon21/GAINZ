// screens-start.jsx — Screen 3: Quick Workout + Guided Workout overlay
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function ScreenStart({ data, setData, onStart }) {
  const [duration, setDuration] = React.useState(30);
  const [selected, setSelected] = React.useState([]);
  const [setsBy, setSetsBy] = React.useState({});
  // Manual offsets layered on top of the auto suggestion (multiples of 5 sec).
  const [workOffset, setWorkOffset] = React.useState(0);
  const [restOffset, setRestOffset] = React.useState(0);

  const muscles = [
    { name: 'Brust', emoji: '🫀' }, { name: 'Rücken', emoji: '🦾' },
    { name: 'Schultern', emoji: '🪨' }, { name: 'Bizeps', emoji: '💪' },
    { name: 'Trizeps', emoji: '🔻' }, { name: 'Bauch', emoji: '⬛' },
    { name: 'Beine', emoji: '🦵' },
  ];

  const toggle = (m) => {
    if (selected.includes(m)) {
      setSelected(selected.filter(x => x !== m));
      const ns = {...setsBy}; delete ns[m]; setSetsBy(ns);
    } else {
      setSelected([...selected, m]);
      setSetsBy({...setsBy, [m]: 3 });
    }
  };

  const totalSets = Object.values(setsBy).reduce((a,b) => a + (Number(b) || 0), 0);

  // ── Interval auto-calculation ────────────────────────────────────────────
  // Total time / set is split 40 % work / 60 % rest, snapped to 5-sec steps,
  // then clamped to safe physiological ranges.
  const totalSec = duration * 60;
  const perSet = totalSets > 0 ? totalSec / totalSets : 0;
  const round5 = (x) => Math.round(x / 5) * 5;
  const suggestedWork = totalSets > 0 ? clamp(round5(perSet * 0.4), 30, 60) : 0;
  const suggestedRest = totalSets > 0 ? clamp(round5(perSet * 0.6), 30, 90) : 0;
  const tooFew  = totalSets > 0 && perSet > 150;
  const tooMany = totalSets > 0 && perSet < 60;
  const intervalReady = totalSets > 0 && !tooFew && !tooMany;

  // Manual adjustment layered on suggestion (clamped to same ranges).
  const work = intervalReady ? clamp(suggestedWork + workOffset, 30, 60) : 0;
  const rest = intervalReady ? clamp(suggestedRest + restOffset, 30, 90) : 0;

  // Reset offsets whenever the inputs change so the suggestion is fresh.
  const resetKey = `${duration}|${selected.join(',')}|${JSON.stringify(setsBy)}`;
  React.useEffect(() => { setWorkOffset(0); setRestOffset(0); }, [resetKey]);

  // Fit check after manual adjustments.
  const requiredSec = totalSets * (work + rest);
  const diffSec = requiredSec - totalSec;
  const fits = diffSec <= 0;
  const overByMin = Math.ceil(diffSec / 60);
  const underByMin = Math.floor(-diffSec / 60);

  return (
    <div data-screen-label="03 Start">
      <ScreenHeader title="Quick Workout" sub="In 4 Schritten startklar"/>

      {/* STEP 1 - TIME */}
      <Section title="① Zeit">
        <div style={{ display:'flex', gap: 8 }}>
          {[15,30,45,60].map(t => (
            <button key={t} onClick={() => setDuration(t)} style={{
              flex: 1, height: 56, borderRadius: 16,
              border: `1px solid ${duration === t ? 'transparent' : 'var(--line)'}`,
              background: duration === t ? 'var(--green)' : 'rgba(140,150,255,0.02)',
              color: duration === t ? '#fff' : 'var(--txt)',
              fontSize: 15, fontWeight: 700,
              cursor:'pointer',
              boxShadow: duration === t ? '0 0 22px rgba(var(--accent-rgb),0.28), 0 0 12px rgba(var(--accent-rgb),0.20)' : 'none',
              transition:'all .15s'
            }}>{t}<span style={{ fontSize: 10, marginLeft: 2, opacity: 0.7 }}>min</span></button>
          ))}
        </div>
      </Section>

      {/* STEP 2 - MUSCLE GROUPS */}
      <Section title="② Muskelgruppen">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
          {muscles.map(m => {
            const on = selected.includes(m.name);
            return (
              <button key={m.name} onClick={() => toggle(m.name)} style={{
                height: 60, borderRadius: 14,
                border: `1px solid ${on ? 'rgba(var(--accent-rgb),0.28)' : 'var(--line)'}`,
                background: on ? 'rgba(var(--accent-rgb),0.08)' : 'var(--card)',
                display:'flex', alignItems:'center', gap: 10, padding: '0 14px',
                cursor:'pointer', textAlign:'left',
                boxShadow: on ? '0 0 14px rgba(var(--accent-rgb),0.16)' : 'none',
                transition:'all .15s'
              }}>
                <MuscleGlyph name={m.name}/>
                <div style={{ flex: 1 }}>
                  <div className={on ? 'grad-text' : ''} style={{ fontSize: 14, fontWeight: 600, color: on ? undefined : 'var(--txt)' }}>{m.name}</div>
                </div>
                {on && <div style={{
                  width: 18, height: 18, borderRadius: 18,
                  background: 'var(--green)',
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}><Icon.check size={11} color="#fff" stroke={3}/></div>}
              </button>
            );
          })}
          {/* odd = 7 -> last spans both cols */}
        </div>
      </Section>

      {/* STEP 3 - SETS */}
      {selected.length > 0 && (
        <Section title="③ Sätze">
          <Card padding={4}>
            {selected.map((m, i) => (
              <div key={m} style={{
                display:'flex', alignItems:'center', gap: 12, padding: '10px 12px',
                borderBottom: i < selected.length - 1 ? '1px solid var(--line)' : 'none'
              }}>
                <MuscleGlyph name={m}/>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m}</div>
                <Stepper value={setsBy[m] || 0} onChange={(v) => setSetsBy({...setsBy, [m]: v })}/>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {/* STEP 4 - INTERVAL — auto-calculated from time + sets */}
      <Section title="④ Intervall (automatisch)">
        <Card padding={16} style={{ background:'var(--card)', borderColor:'rgba(var(--accent-rgb),0.20)' }}>
          {totalSets === 0 ? (
            <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.5 }}>
              Wähle Muskelgruppen und Sätze um die Intervalle zu berechnen.
            </div>
          ) : tooFew ? (
            <div style={{
              padding:'12px 14px', borderRadius: 12,
              background:'rgba(255,215,0,0.08)',
              border:'1px solid rgba(255,215,0,0.30)',
              color:'var(--gold)', fontSize: 13, lineHeight: 1.5,
              display:'flex', gap: 10, alignItems:'flex-start',
            }}>
              <Icon.warning size={16} color="var(--gold)"/>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Zu wenige Sätze für diese Zeit</div>
                <div style={{ color:'var(--txt-2)', fontSize: 12 }}>Reduziere die Zeit oder füge mehr Muskeln/Sätze hinzu.</div>
              </div>
            </div>
          ) : tooMany ? (
            <div style={{
              padding:'12px 14px', borderRadius: 12,
              background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.30)',
              color:'#EF4444', fontSize: 13, lineHeight: 1.5,
              display:'flex', gap: 10, alignItems:'flex-start',
            }}>
              <Icon.warning size={16} color="#EF4444"/>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Zu viele Sätze für diese Zeit</div>
                <div style={{ color:'var(--txt-2)', fontSize: 12 }}>Reduziere Sätze oder wähle mehr Zeit.</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap: 12, alignItems:'flex-start', marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background:'rgba(var(--accent-rgb),0.11)', border:'1px solid rgba(var(--accent-rgb),0.25)',
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}><Icon.bolt size={18} color="#fff"/></div>
                <div style={{ flex: 1, fontSize: 14, lineHeight: 1.45 }}>
                  ⚡ Passt perfekt: <span className="grad-text" style={{ fontWeight: 700 }}>{work} Sek Arbeit / {rest} Sek Pause</span>
                  <div style={{ fontSize: 11, color:'var(--txt-3)', marginTop: 4, fontFamily:'Inter, sans-serif', letterSpacing: 0.5 }}>
                    {duration} Min · {totalSets} Sätze · ~{Math.round((work+rest)) } Sek/Satz
                  </div>
                </div>
              </div>

              {/* Manual ±5 sec adjustments */}
              {[
                { label: 'Arbeitszeit', value: work, offset: workOffset, setOffset: setWorkOffset, lo: 30, hi: 60, sug: suggestedWork },
                { label: 'Pause',       value: rest, offset: restOffset, setOffset: setRestOffset, lo: 30, hi: 90, sug: suggestedRest },
              ].map(r => {
                const canDec = (r.sug + r.offset - 5) >= r.lo;
                const canInc = (r.sug + r.offset + 5) <= r.hi;
                return (
                  <div key={r.label} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 0', borderTop: '1px solid var(--line)',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color:'var(--txt-2)', fontFamily: 'Inter, sans-serif', textTransform:'uppercase', letterSpacing:1 }}>{r.label}</div>
                      <div className="ticker" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                        {r.value} <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>sek</span>
                        {r.offset !== 0 && (
                          <span style={{ marginLeft: 6, fontSize: 10, color:'var(--txt-3)', fontFamily:'Inter, sans-serif' }}>
                            ({r.offset > 0 ? '+' : ''}{r.offset})
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap: 6 }}>
                      <button onClick={() => canDec && r.setOffset(o => o - 5)} disabled={!canDec} style={adjBtn(canDec)}>−5</button>
                      <button onClick={() => canInc && r.setOffset(o => o + 5)} disabled={!canInc} style={adjBtn(canInc)}>+5</button>
                    </div>
                  </div>
                );
              })}

              {/* Fit indicator */}
              <div style={{
                marginTop: 8, padding:'8px 12px', borderRadius: 10,
                background: fits ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${fits ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
                color: fits ? '#22C55E' : '#EF4444',
                fontSize: 12, fontWeight: 700,
                display:'flex', alignItems:'center', gap: 8,
              }}>
                {fits
                  ? `✓ Passt in ${duration} Min${underByMin >= 1 ? ` · ${underByMin} Min Puffer` : ''}`
                  : `⚠️ Überschreitet Zeit um ${overByMin} Min`}
              </div>
            </>
          )}
        </Card>
      </Section>

      <Section style={{ marginBottom: 14 }}>
        <CTA
          onClick={() => intervalReady && onStart({ duration, selected, setsBy, work, rest })}
          icon={<Icon.bolt size={18} color="#fff"/>}
          disabled={!intervalReady}
        >Workout starten</CTA>
        {intervalReady && (
          <div style={{ textAlign:'center', fontSize: 11, color:'var(--txt-3)', marginTop: 10, fontFamily:'Inter, sans-serif' }}>
            {totalSets} SÄTZE · ~{Math.round(totalSets * (work + rest) / 60)} MIN
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── GUIDED WORKOUT FULLSCREEN OVERLAY ──────────────────────
function GuidedWorkout({ session, onExit }) {
  const MUSCLE_LABELS = {
    brust:'BRUST', ruecken:'RÜCKEN', schultern:'SCHULTERN',
    bizeps:'BIZEPS', trizeps:'TRIZEPS', bauch:'BAUCH', beine:'BEINE'
  };

  // Build flat set list in the EXACT order the user selected the muscle groups.
  // Example: selected=['schultern','trizeps'], setsBy={schultern:6,trizeps:8}
  //   -> 14 sets: Schultern 1..6, then Trizeps 1..8.
  const sets = React.useMemo(() => {
    const out = [];
    (session && session.selected ? session.selected : []).forEach(m => {
      const n = Number(session && session.setsBy ? session.setsBy[m] : 0) || 0;
      for (let i = 0; i < n; i++) {
        out.push({ muscle: m, setNum: i + 1, totalForMuscle: n });
      }
    });
    return out;
  }, [session]);

  const totalSets = sets.length;
  const workSec = Math.max(5, Math.min(600, Number(session && session.work) || 40));
  const restSec = Math.max(5, Math.min(600, Number(session && session.rest) || 20));

  const [setIdx, setSetIdx] = React.useState(0);
  const [phase, setPhase] = React.useState('work'); // 'work' | 'rest' | 'done'
  const [tick, setTick] = React.useState(workSec);
  const [paused, setPaused] = React.useState(false);

  const advance = React.useCallback(() => {
    setPhase(p => {
      if (p === 'work') {
        if (setIdx >= totalSets - 1) {
          return 'done';
        }
        setTick(restSec);
        return 'rest';
      }
      if (p === 'rest') {
        setSetIdx(i => i + 1);
        setTick(workSec);
        return 'work';
      }
      return p;
    });
  }, [setIdx, totalSets, workSec, restSec]);

  // Countdown ticker
  React.useEffect(() => {
    if (phase === 'done' || paused) return;
    if (tick <= 0) { advance(); return; }
    const id = setTimeout(() => setTick(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tick, phase, paused, advance]);

  // After completion, auto-close (triggers handleWorkoutExit -> saves session+muscles to Supabase)
  React.useEffect(() => {
    if (phase === 'done') {
      const id = setTimeout(() => { if (onExit) onExit(); }, 1800);
      return () => clearTimeout(id);
    }
  }, [phase, onExit]);

  // ---------- Inline styles ----------
  const overlay = {
    position:'fixed', inset:0, zIndex:999999,
    background:'rgba(0,0,0,0.94)',
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:24,
    paddingTop:'calc(24px + env(safe-area-inset-top, 0px))',
    paddingBottom:'calc(24px + env(safe-area-inset-bottom, 0px))'
  };
  const card = {
    width:'100%', maxWidth:520,
    background:'var(--card)', border:'1px solid var(--line)', borderRadius:20,
    padding:'32px 28px', textAlign:'center', color:'var(--txt)',
    boxShadow:'0 24px 56px rgba(0,0,0,0.5)'
  };
  const primaryBtn = {
    width:'100%', padding:'16px 18px',
    background:'var(--accent)', border:'none', borderRadius:14,
    color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer',
    fontFamily:'inherit', letterSpacing:0.5
  };
  const ghostBtn = {
    flex:1, padding:'10px 14px',
    background:'transparent', border:'1px solid var(--line)', borderRadius:10,
    color:'var(--txt-2)', fontSize:13, fontWeight:600, cursor:'pointer',
    fontFamily:'inherit'
  };

  // ---------- Empty state ----------
  if (totalSets === 0) {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:14 }}>Keine Sätze konfiguriert.</div>
          <button style={primaryBtn} onClick={onExit}>Schließen</button>
        </div>
      </div>
    );
  }

  // ---------- Completion screen ----------
  if (phase === 'done') {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize:11, opacity:0.55, letterSpacing:2, marginBottom:8 }}>FERTIG</div>
          <div style={{ fontSize:32, fontWeight:800, marginBottom:10, color:'var(--accent)' }}>Workout abgeschlossen</div>
          <div style={{ fontSize:14, opacity:0.7 }}>{totalSets} Sets · {Math.round(Number(session && session.duration) || 0)} min</div>
        </div>
      </div>
    );
  }

  // ---------- Active set screen ----------
  const cur = sets[setIdx];
  const muscleLabel = MUSCLE_LABELS[cur.muscle] || ((cur.muscle || '') + '').toUpperCase();
  const isWork = phase === 'work';

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize:11, opacity:0.5, letterSpacing:2, marginBottom:6 }}>MUSKEL</div>
        <div style={{ fontSize:38, fontWeight:800, marginBottom:20, lineHeight:1 }}>{muscleLabel}</div>

        <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Set {cur.setNum} von {cur.totalForMuscle}</div>
        <div style={{ fontSize:12, opacity:0.55, marginBottom:24 }}>{setIdx + 1} von {totalSets} Sets gesamt</div>

        <div style={{ fontSize:13, fontWeight:700, letterSpacing:2, color: isWork ? 'var(--accent)' : 'var(--txt-2)', marginBottom:4 }}>
          {paused ? 'PAUSIERT' : (isWork ? 'ARBEITEN' : 'PAUSE')}
        </div>
        <div style={{ fontSize:96, fontWeight:800, fontVariantNumeric:'tabular-nums', lineHeight:1, marginBottom:28 }}>
          {tick}
        </div>

        <button style={primaryBtn} onClick={advance}>
          {isWork ? 'Set geschafft' : 'Weiter'}
        </button>

        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button style={ghostBtn} onClick={() => setPaused(p => !p)}>{paused ? 'Fortsetzen' : 'Pause'}</button>
          <button style={ghostBtn} onClick={onExit}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

const adjBtn = (enabled) => ({
  width: 44, height: 36, borderRadius: 10,
  background: enabled ? 'rgba(var(--accent-rgb),0.10)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${enabled ? 'rgba(var(--accent-rgb),0.30)' : 'var(--line)'}`,
  color: enabled ? 'var(--green)' : 'var(--txt-3)',
  fontSize: 12, fontWeight: 700,
  fontFamily: 'Inter, sans-serif', letterSpacing: 0.5,
  cursor: enabled ? 'pointer' : 'not-allowed',
});

Object.assign(window, { ScreenStart, GuidedWorkout });
