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
              boxShadow: duration === t ? '0 0 22px rgba(61,128,104,0.28), 0 0 12px rgba(61,128,104,0.20)' : 'none',
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
                border: `1px solid ${on ? 'rgba(61,128,104,0.28)' : 'var(--line)'}`,
                background: on ? 'rgba(61,128,104,0.08)' : 'var(--card)',
                display:'flex', alignItems:'center', gap: 10, padding: '0 14px',
                cursor:'pointer', textAlign:'left',
                boxShadow: on ? '0 0 14px rgba(61,128,104,0.16)' : 'none',
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
        <Card padding={16} style={{ background:'var(--card)', borderColor:'rgba(61,128,104,0.20)' }}>
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
                  background:'rgba(61,128,104,0.11)', border:'1px solid rgba(61,128,104,0.25)',
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}><Icon.bolt size={18} color="#fff"/></div>
                <div style={{ flex: 1, fontSize: 14, lineHeight: 1.45 }}>
                  ⚡ Passt perfekt: <span className="grad-text" style={{ fontWeight: 700 }}>{work} Sek Arbeit / {rest} Sek Pause</span>
                  <div style={{ fontSize: 11, color:'var(--txt-3)', marginTop: 4, fontFamily:'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
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
                      <div style={{ fontSize: 12, color:'var(--txt-2)', fontFamily: 'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing:1 }}>{r.label}</div>
                      <div className="ticker" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                        {r.value} <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>sek</span>
                        {r.offset !== 0 && (
                          <span style={{ marginLeft: 6, fontSize: 10, color:'var(--txt-3)', fontFamily:'JetBrains Mono, monospace' }}>
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
          <div style={{ textAlign:'center', fontSize: 11, color:'var(--txt-3)', marginTop: 10, fontFamily:'JetBrains Mono, monospace' }}>
            {totalSets} SÄTZE · ~{Math.round(totalSets * (work + rest) / 60)} MIN
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── GUIDED WORKOUT FULLSCREEN OVERLAY ──────────────────────
function GuidedWorkout({ session, onExit }) {
  const [phase, setPhase] = React.useState('work'); // 'work' | 'rest'
  const [paused, setPaused] = React.useState(false);
  const [tick, setTick] = React.useState(40);
  const [setIdx, setSetIdx] = React.useState(3);
  const totalSets = 8;
  const exercise = 'Pull-Ups';
  const muscle = 'Rücken';

  // ── Audio (Web Audio API, no external files) ─────────────────────────────
  const [muted, setMuted] = React.useState(false);
  const audioCtxRef = React.useRef(null);
  const ensureCtx = React.useCallback(() => {
    if (muted) return null;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { audioCtxRef.current = new Ctx(); } catch (e) { return null; }
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }, [muted]);
  const playTone = React.useCallback((freq, dur = 0.15, vol = 0.25) => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }, [ensureCtx]);
  const playBeep      = React.useCallback(() => playTone(880, 0.15), [playTone]);
  const playStartTone = React.useCallback(() => playTone(660, 0.30), [playTone]);
  const playRestTone  = React.useCallback(() => playTone(440, 0.30), [playTone]);
  const playFanfare   = React.useCallback(() => {
    [440, 660, 880].forEach((f, i) => setTimeout(() => playTone(f, 0.28, 0.30), i * 180));
  }, [playTone]);

  // Resume the AudioContext on the very first tap inside the overlay so
  // browsers (especially iOS Safari) actually output sound.
  React.useEffect(() => {
    const unlock = () => { ensureCtx(); };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, [ensureCtx]);

  // Beep on the last 3 seconds of either phase.
  React.useEffect(() => {
    if (paused) return;
    if (tick === 3 || tick === 2 || tick === 1) playBeep();
  }, [tick, paused, playBeep]);

  // Phase-transition tones (also fires on initial mount → start tone).
  const lastPhaseRef = React.useRef(null);
  React.useEffect(() => {
    if (lastPhaseRef.current === phase) return;
    if (phase === 'work') playStartTone();
    else                   playRestTone();
    lastPhaseRef.current = phase;
  }, [phase, playStartTone, playRestTone]);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setTick(t => {
        if (t <= 1) {
          setPhase(p => p === 'work' ? 'rest' : 'work');
          return phase === 'work' ? (session?.rest || 60) : (session?.work || 40);
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, phase, session]);

  const totalT = phase === 'work' ? (session?.work || 40) : (session?.rest || 60);
  const pct = 1 - tick / totalT;
  const C = 2 * Math.PI * 130;
  const accent = phase === 'work' ? '#3d8068' : '#3d8068';

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{
      position:'absolute', inset: 0, zIndex: 100,
      background:'#020807', display:'flex', flexDirection:'column',
      paddingTop: 56, // status bar
    }}>
      {/* corner controls */}
      <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 22px', alignItems:'center' }}>
        <button onClick={onExit} style={{ background:'none', border:'none', color:'var(--txt-2)', fontSize: 12, fontWeight: 600, fontFamily:'JetBrains Mono, monospace', cursor:'pointer', textTransform:'uppercase', letterSpacing: 1 }}>Abbrechen</button>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
          <button
            onClick={() => {
              setMuted(m => {
                const next = !m;
                if (next && audioCtxRef.current) { try { audioCtxRef.current.suspend(); } catch (e) {} }
                if (!next && audioCtxRef.current) { try { audioCtxRef.current.resume();  } catch (e) {} }
                return next;
              });
            }}
            aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}
            style={{
              width: 34, height: 34, borderRadius: 999,
              background:'rgba(255,255,255,0.05)',
              border:'1px solid var(--line)',
              color: muted ? 'var(--txt-3)' : 'var(--txt)',
              fontSize: 16, lineHeight: 1, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>{muted ? '🔇' : '🔊'}</button>
          <button onClick={() => setPaused(p => !p)} style={{ display:'flex', alignItems:'center', gap: 6, background:'rgba(255,255,255,0.05)', border:'1px solid var(--line)', color:'var(--txt)', padding:'6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily:'JetBrains Mono, monospace', cursor:'pointer', textTransform:'uppercase', letterSpacing: 1 }}>
            <Icon.pause size={11} color="var(--txt)"/> {paused ? 'Weiter' : 'Pause'}
          </button>
        </div>
      </div>

      {/* main content */}
      <div style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: '0 24px' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 2.4, fontFamily:'JetBrains Mono, monospace',
          color: accent, padding: '6px 14px', borderRadius: 999,
          background: phase === 'work' ? 'rgba(61,128,104,0.08)' : 'rgba(61,128,104,0.11)',
          border: `1px solid ${phase === 'work' ? 'rgba(61,128,104,0.25)' : 'rgba(61,128,104,0.28)'}`,
          textTransform:'uppercase',
          boxShadow: phase === 'work' ? '0 0 18px rgba(61,128,104,0.25)' : '0 0 18px rgba(61,128,104,0.28)',
          animation: paused ? 'none' : 'softPulse 1.6s ease-in-out infinite',
          display:'flex', alignItems:'center', gap: 6,
        }}>
          {phase === 'work' ? 'Arbeiten' : 'Pause'}
          <Icon.speaker size={11} color={accent} style={{ opacity: paused ? 0.3 : 1 }}/>
        </div>

        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 22, letterSpacing:-0.5 }}>{exercise}</div>
        <div style={{ fontSize: 13, color:'var(--txt-2)', marginTop: 4, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing: 1.4 }}>
          Set {setIdx} von {totalSets} · {muscle}
        </div>

        {/* circular timer */}
        <div style={{ position:'relative', marginTop: 36 }}>
          <svg width="290" height="290">
            <circle cx="145" cy="145" r="130" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
            <circle cx="145" cy="145" r="130" fill="none" stroke={accent} strokeWidth="4"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 145 145)" strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 12px ${accent}80)` }}/>
          </svg>
          <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div className="ticker" style={{ fontSize: 76, fontWeight: 700, lineHeight: 1, color: '#fff', letterSpacing:-3 }}>{fmt(tick)}</div>
            <div style={{ fontSize: 11, color:'var(--txt-3)', fontFamily:'JetBrains Mono, monospace', letterSpacing:1.4, textTransform:'uppercase', marginTop: 6 }}>
              von {fmt(totalT)}
            </div>
          </div>
        </div>

        {/* set progress dots */}
        <div style={{ display:'flex', gap: 5, marginTop: 32 }}>
          {Array.from({ length: totalSets }).map((_,i) => (
            <div key={i} style={{
              width: i === setIdx-1 ? 26 : 7, height: 7, borderRadius: 7,
              background: i < setIdx ? 'linear-gradient(135deg, #173a2e 0%, #3d8068 100%)' : '#2a2a3a',
              boxShadow: i === setIdx-1 ? '0 0 8px rgba(61,128,104,0.36)' : 'none',
              transition:'all .3s'
            }}/>
          ))}
        </div>
      </div>

      {/* bottom action */}
      <div style={{ padding: '0 24px 36px' }}>
        <CTA onClick={() => {
          if (setIdx < totalSets) {
            setSetIdx(s => s + 1);
            setPhase('rest');
            setTick(session?.rest || 60);
          } else {
            playFanfare();
            setTimeout(() => onExit(), 800);
          }
        }} icon={<Icon.check size={18} color="#fff"/>}>Set geschafft</CTA>
      </div>
    </div>
  );
}

const adjBtn = (enabled) => ({
  width: 44, height: 36, borderRadius: 10,
  background: enabled ? 'rgba(61,128,104,0.10)' : 'rgba(255,255,255,0.03)',
  border: `1px solid ${enabled ? 'rgba(61,128,104,0.30)' : 'var(--line)'}`,
  color: enabled ? 'var(--green)' : 'var(--txt-3)',
  fontSize: 12, fontWeight: 700,
  fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
  cursor: enabled ? 'pointer' : 'not-allowed',
});

Object.assign(window, { ScreenStart, GuidedWorkout });
