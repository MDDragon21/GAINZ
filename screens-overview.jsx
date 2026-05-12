// screens-overview.jsx — Screen 1: Überblick (Dashboard)
function ScreenOverview({ data, setData, user, openCoach, openProfile }) {
  // Onboarding banner: shown until user customizes their display name.
  const emailPrefix = user?.email ? user.email.split('@')[0] : null;
  const namePending = data?.name && emailPrefix && data.name.trim().toLowerCase() === emailPrefix.toLowerCase();
  const { streak, weekDone, weekGoal, weight, weightDelta, bmi, name, dailyQuote, lossAvoidance, heatmap } = data;
  const [view, setView] = React.useState('front');
  const [period, setPeriod] = React.useState('7d');

  // Per-muscle weekly target sets — sourced from profiles.muscle_targets.
  const weeklyGoals = data.muscleTargets || {
    brust: 0, ruecken: 0, schultern: 0, bizeps: 0, trizeps: 0, bauch: 0, beine: 0,
  };
  // Real sets logged per muscle in the last 7 days from Supabase (no mock).
  const realSets7d = data.muscleSets7d || {};
  const setsLast7d = {
    brust: realSets7d.brust || 0,
    ruecken: realSets7d.ruecken || 0,
    schultern: realSets7d.schultern || 0,
    bizeps: realSets7d.bizeps || 0,
    trizeps: realSets7d.trizeps || 0,
    bauch: realSets7d.bauch || 0,
    beine: realSets7d.beine || 0,
  };  // Period-specific actual sets fetched from Supabase when period > 7d.
  // 7d uses the data prop's pre-fetched last-7-days data.
  const [periodSets, setPeriodSets] = React.useState(null);
  React.useEffect(() => {
    if (period === '7d') { setPeriodSets(null); return; }
    let alive = true;
    (async () => {
      try {
        const days = period === 'mo' ? 30 : period === 'qtr' ? 91 : period === 'yr' ? 365 : 7;
        const from = new Date();
        from.setDate(from.getDate() - days);
        const fromISO = from.toISOString().slice(0, 10);
        const { data: sessions, error: e1 } = await window.sb
          .from('workout_sessions')
          .select('id')
          .eq('user_id', user?.id)
          .eq('status', 'done')
          .gte('started_at', fromISO);
        if (e1) throw e1;
        const ids = (sessions || []).map(s => s.id);
        const sums = { brust:0, ruecken:0, schultern:0, bizeps:0, trizeps:0, bauch:0, beine:0 };
        if (ids.length) {
          const { data: rows, error: e2 } = await window.sb
            .from('workout_session_muscles')
            .select('muscle, sets')
            .in('session_id', ids);
          if (e2) throw e2;
          (rows || []).forEach(r => {
            const m = r.muscle;
            if (sums[m] !== undefined) sums[m] += Number(r.sets || 0);
          });
        }
        if (alive) setPeriodSets(sums);
      } catch (e) {
        console.error('[heatmap] period fetch failed', e);
        if (alive) setPeriodSets({});
      }
    })();
    return () => { alive = false; };
  }, [period, user?.id]);


  const sessionsCount = data.sessionsCount || 0;
  const totalSetsLogged = Object.values(setsLast7d).reduce((a,b) => a+b, 0);
  const hasMuscleData = totalSetsLogged > 0;

  const PERIODS = [
    { id: '7d',   label: '7 Tage',  mult: 1 },
    { id: 'mo',   label: 'Monat',   mult: 4 },
    { id: 'qtr',  label: 'Quartal', mult: 13 },
    { id: 'yr',   label: 'Jahr',    mult: 52 },
  ];
  const periodCfg = PERIODS.find(p => p.id === period);
  // Per-period actual sets:
  //   '7d'             -> data prop's last-7-days fetch
  //   'mo' | 'qtr' | 'yr' -> real Supabase fetch in useEffect above
  // Fallback while loading: scale 7d sets by mult so the UI is not blank.
  const actualByPeriod = period === '7d'
    ? setsLast7d
    : (periodSets || Object.fromEntries(Object.entries(setsLast7d).map(([k,v]) => [k, Math.round(v * periodCfg.mult)])));

  const goalByPeriod   = Object.fromEntries(Object.entries(weeklyGoals).map(([k,v]) => [k, v * periodCfg.mult]));

  // Muscle-status colors are SEMANTIC and fixed across all themes.
  // Never resolve to var(--accent) or var(--gold) — these mean
  // "goal reached / partial / under" and must read identically
  // regardless of which theme accent is active.
  const STATUS_COLOR = {
    full:    '#00A878', // 100%+ erreicht
    partial: '#C9A84C', // 50–99% erreicht
    under:   '#8B1A1A', // < 50%
    zero:    '#1a1a1a', // 0 Sets / kein Ziel
  };
  const colorFor = (k) => {
    const goal = goalByPeriod[k];
    const actual = actualByPeriod[k] || 0;
    if (!goal || actual <= 0) return STATUS_COLOR.zero;
    const pct = actual / goal;
    if (pct >= 1)   return STATUS_COLOR.full;
    if (pct >= 0.5) return STATUS_COLOR.partial;
    return STATUS_COLOR.under;
  };
  const heatColors = Object.fromEntries(Object.keys(weeklyGoals).map(k => [k, colorFor(k)]));

  const muscleLabels = { brust: 'Brust', ruecken: 'Rücken', schultern: 'Schultern', bizeps: 'Bizeps', trizeps: 'Trizeps', bauch: 'Bauch', beine: 'Beine' };
  // Which muscles are visible front vs back (for the per-side legend / focus).
  const FRONT_MUSCLES = ['brust','schultern','bizeps','bauch','beine'];
  const BACK_MUSCLES  = ['ruecken','schultern','trizeps','beine'];

  return (
    <div data-screen-label="01 Überblick">
      <ScreenHeader
        title={<>Hallo, <span className="grad-text">{name}</span>.</>}
        sub={new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' })}
      />

      {/* ONBOARDING — set display name */}
      {namePending && (
        <Section>
          <button onClick={openProfile} style={{
            width:'100%', textAlign:'left', cursor:'pointer',
            padding:'14px 16px', borderRadius: 14,
            background:'rgba(var(--accent-rgb),0.08)',
            border:'1px solid rgba(var(--accent-rgb),0.30)',
            color:'var(--txt)', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background:'rgba(var(--accent-rgb),0.14)', border:'1px solid rgba(var(--accent-rgb),0.30)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 18,
            }}>👋</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color:'var(--txt)' }}>Leg deinen Anzeigenamen fest</div>
              <div style={{ fontSize: 11, color:'var(--txt-2)', marginTop: 2 }}>So sehen dich andere auf der Rangliste.</div>
            </div>
            <Icon.chevronRight size={16} color="var(--txt-2)"/>
          </button>
        </Section>
      )}

      {/* PRIMARY CTA — Workout starten */}
      <Section>
        <button onClick={openCoach} className="cta-glow" style={{
          width: '100%', border: 'none', cursor: 'pointer',
          padding: '20px 22px',
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.55) 0%, rgba(var(--accent-rgb),1) 100%)',
          display: 'flex', alignItems: 'center', gap: 14,
          textAlign: 'left', color: '#fff',
          position: 'relative', overflow: 'hidden',
        }}>
          <span className="cta-shine"/>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <Icon.bolt size={26} color="#fff"/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>Workout starten</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, opacity: 0.85, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Bereit wenn du es bist</div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 999, flexShrink: 0,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.chevronRight size={16} color="#fff" stroke={2.5}/>
          </div>
        </button>
      </Section>

      {/* DAILY QUOTE */}
      <Section>
        <Card padding={16} style={{ borderLeft: '3px solid var(--green)', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}>
          <div style={{ display:'flex', gap: 10, alignItems:'flex-start' }}>
            <div style={{ color: 'var(--green)', marginTop: 2 }}><Icon.quote size={16}/></div>
            <div>
              <div style={{ fontStyle:'italic', fontSize: 14, lineHeight: 1.5, color: 'var(--txt)' }}>{dailyQuote.text}</div>
              <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: 1 }}>— {dailyQuote.author}</div>
            </div>
          </div>
        </Card>
      </Section>

      {/* STREAK + WEEKLY GOAL — twin tile */}
      <Section>
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap: 10 }}>
          {(() => {
            // Flame is gold when streak is alive, dark red (dormant) when 0 — never grey.
            const streakActive = (Number(streak) || 0) >= 1;
            const flameColor = streakActive ? 'var(--gold)' : '#8B1A1A';
            const numColor   = streakActive ? 'var(--gold)' : 'var(--txt-2)';
            return (
              <Card padding={16} gold={streakActive} style={{
                position:'relative', overflow:'hidden',
              }}>
                {/* Premium decorative flame — sits inside the card, top-right.
                    Warm gold→orange→red gradient, soft outer glow, animated. */}
                <div aria-hidden="true" style={{
                  position:'absolute', right: 10, top: 10,
                  width: 56, height: 72,
                  pointerEvents:'none',
                  filter: streakActive
                    ? 'drop-shadow(0 0 14px rgba(255,140,0,0.45)) drop-shadow(0 0 6px rgba(255,69,0,0.30))'
                    : 'drop-shadow(0 0 8px rgba(139,26,26,0.35))',
                  opacity: streakActive ? 0.95 : 0.55,
                  animation: 'flameFlicker 2.4s ease-in-out infinite',
                }}>
                  <svg viewBox="0 0 56 72" width="56" height="72" style={{ display:'block' }}>
                    <defs>
                      <linearGradient id="flame-grad-active" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%"  stopColor="#FF4500"/>
                        <stop offset="55%" stopColor="#FF8C00"/>
                        <stop offset="100%" stopColor="#C9A84C"/>
                      </linearGradient>
                      <linearGradient id="flame-grad-inner" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%"  stopColor="rgba(255,200,80,0.35)"/>
                        <stop offset="60%" stopColor="rgba(255,235,150,0.85)"/>
                        <stop offset="100%" stopColor="rgba(255,255,220,0.95)"/>
                      </linearGradient>
                      <linearGradient id="flame-grad-dormant" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%"  stopColor="#3a0a0a"/>
                        <stop offset="100%" stopColor="#8B1A1A"/>
                      </linearGradient>
                    </defs>
                    {/* Outer flame body */}
                    <path
                      d="M28 4
                         C 22 16, 12 22, 16 36
                         C 8 32, 8 46, 18 54
                         C 12 50, 14 64, 28 68
                         C 42 64, 44 50, 38 54
                         C 48 46, 48 32, 40 36
                         C 44 22, 34 16, 28 4 Z"
                      fill={streakActive ? 'url(#flame-grad-active)' : 'url(#flame-grad-dormant)'}
                    />
                    {/* Inner core — only on active state */}
                    {streakActive && (
                      <path
                        d="M28 22
                           C 25 30, 20 34, 22 44
                           C 18 42, 19 50, 24 54
                           C 22 52, 24 60, 28 62
                           C 32 60, 34 52, 32 54
                           C 37 50, 38 42, 34 44
                           C 36 34, 31 30, 28 22 Z"
                        fill="url(#flame-grad-inner)"
                      />
                    )}
                  </svg>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, color: flameColor, fontSize:11, fontWeight:600, letterSpacing:1.4, textTransform:'uppercase', fontFamily:'Inter, sans-serif' }}>
                  <Icon.flame size={14} color={flameColor} style={{ animation:'flameFlicker 1.6s ease-in-out infinite' }}/>
                  Streak
                </div>
                <div className="ticker serif" style={{ fontSize: 64, fontWeight: 600, lineHeight: 1, marginTop: 6, color: numColor, letterSpacing:-1.5, fontStyle:'italic', position:'relative' }}>
                  {streak}
                  <span style={{
                    position:'absolute', inset:-6, borderRadius:20,
                    background: streakActive
                      ? 'radial-gradient(circle, rgba(var(--gold-rgb),0.15), transparent 70%)'
                      : 'radial-gradient(circle, rgba(139,26,26,0.10), transparent 70%)',
                    animation:'softPulse 2s ease-in-out infinite', zIndex:-1
                  }}/>
                </div>
                <div style={{ fontSize: 12, color:'var(--txt-2)', marginTop: 4, fontWeight: 500 }}>
                  {streakActive ? 'Tage am Stück' : 'Trainiere heute, um zu starten'}
                </div>
              </Card>
            );
          })()}
          <Card padding={16}>
            <div className="label-cap">Wochenziel</div>
            <div className="ticker serif" style={{ fontSize: 36, fontWeight: 600, marginTop: 12, lineHeight: 1, color:'var(--accent)', fontStyle:'italic' }}>
              {weekDone}<span style={{ color:'var(--txt-3)', fontSize: 22, fontStyle:'normal' }}> / {weekGoal}</span>
            </div>
            <div style={{ fontSize: 11, color:'var(--txt-2)', marginTop: 4, marginBottom: 14 }}>Tage diese Woche</div>
            {weekGoal > 0 ? (
              <div style={{ display:'flex', gap: 4 }}>
                {Array.from({ length: weekGoal }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 8, borderRadius: 8,
                    background: i < weekDone ? 'var(--grad)' : '#2a2a3a',
                    boxShadow: i < weekDone ? '0 0 10px rgba(var(--accent-rgb),0.28)' : 'none',
                    transition:'background .3s'
                  }}/>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color:'var(--txt-3)', fontFamily:'Inter, sans-serif', letterSpacing: 1 }}>
                Setze ein Wochenziel im Profil
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* MUSCLE BALANCE — period filter + dual body view + goal-relative coloring */}
      <Section>
        <Card padding={16}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.4, textTransform:'uppercase', color:'var(--txt-2)', fontFamily:'Inter, sans-serif' }}>Muskelbalance</div>
              <div style={{ fontSize: 14, marginTop: 4, color:'var(--txt)' }}>Relativ zu deinem Ziel</div>
            </div>
          </div>

          {/* PERIOD FILTER PILLS */}
          <div style={{ display:'flex', gap: 6, marginBottom: 14, padding: 4, background:'rgba(255,255,255,0.03)', borderRadius: 12, border:'1px solid var(--line)' }}>
            {PERIODS.map(p => {
              const on = period === p.id;
              return (
                <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                  flex: 1, border:'none', padding:'8px 6px', borderRadius: 9,
                  background: on ? 'var(--green)' : 'transparent',
                  color: on ? '#fff' : 'var(--txt-2)',
                  fontSize: 11, fontWeight: 700, cursor:'pointer',
                  fontFamily: 'JetBrains Mono, monospace', textTransform:'uppercase', letterSpacing: 0.8,
                  boxShadow: on ? '0 0 14px rgba(var(--accent-rgb),0.25), 0 0 10px rgba(var(--accent-rgb),0.16)' : 'none',
                  transition:'all .15s'
                }}>{p.label}</button>
              );
            })}
          </div>

          {/* DUAL BODY VIEW — both clickable to toggle focus */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[{ id:'front', label:'Vorne' }, { id:'back', label:'Hinten' }].map(b => {
              const active = view === b.id;
              return (
                <button key={b.id} onClick={() => setView(b.id)} style={{
                  padding: '10px 8px 12px', borderRadius: 14, cursor: 'pointer',
                  border: active ? '1px solid rgba(var(--accent-rgb),0.28)' : '1px solid var(--line)',
                  background: active ? 'rgba(var(--accent-rgb),0.03)' : 'rgba(255,255,255,0.02)',
                  boxShadow: active ? '0 0 18px rgba(var(--accent-rgb),0.16)' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all .15s',
                }}>
                  <BodyHeatmap groups={heatColors} view={b.id} size={0.95}/>
                  <div className={active ? 'grad-text' : ''} style={{
                    fontSize: 10, fontWeight: 700, fontFamily:'Inter, sans-serif',
                    textTransform:'uppercase', letterSpacing: 1.4,
                    color: active ? undefined : 'var(--txt-3)'
                  }}>{b.label}</div>
                </button>
              );
            })}
          </div>

          {/* LEGEND — color key */}
          <div style={{ display:'flex', gap: 12, justifyContent:'center', marginBottom: 12, flexWrap:'wrap' }}>
            {[
              { c: STATUS_COLOR.full,    glow: 'rgba(0, 168, 120, 0.55)',  label: '100%+' },
              { c: STATUS_COLOR.partial, glow: 'rgba(201, 168, 76, 0.55)', label: '50–99%' },
              { c: STATUS_COLOR.under,   glow: 'rgba(139, 26, 26, 0.55)',  label: '< 50%' },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{
                  display:'inline-block',
                  width: 10, height: 10, borderRadius: '50%',
                  background: l.c,
                  opacity: 1,
                  boxShadow: `0 0 8px ${l.glow}`,
                  flexShrink: 0,
                }}/>
                <div style={{ fontSize: 10, color:'var(--txt-3)', fontFamily:'Inter, sans-serif', letterSpacing: 0.6 }}>{l.label}</div>
              </div>
            ))}
          </div>

          {/* MUSCLE LIST — sets vs goal for current period */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6 }}>
            {Object.keys(weeklyGoals).map(k => {
              const actual = actualByPeriod[k];
              const goal = goalByPeriod[k];
              const pct = Math.min(1.5, actual / goal);
              const col = colorFor(k);
              return (
                <div key={k} style={{
                  display:'flex', alignItems:'center', gap: 8,
                  padding:'7px 8px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.02)', border:'1px solid var(--line)',
                }}>
                  <div style={{ width: 6, height: 22, borderRadius: 3, background: col, boxShadow: `0 0 6px ${col}80`, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color:'var(--txt)', fontWeight: 600 }}>{muscleLabels[k]}</div>
                    <div style={{ fontSize: 9, color:'var(--txt-3)', fontFamily:'Inter, sans-serif', marginTop: 1 }}>
                      <span style={{ color: col, fontWeight: 700 }}>{actual}</span> / {goal} Sätze
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </Section>

      {/* COACH INSIGHT — only when there's at least one session to derive from */}
      {sessionsCount > 0 && hasMuscleData && (
        <Section>
          <Card padding={16} accent style={{ background:'var(--card)' }}>
            <div style={{ display:'flex', gap: 12, alignItems:'flex-start' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background:'rgba(var(--accent-rgb),0.08)', border:'1px solid rgba(var(--accent-rgb),0.20)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: '0 0 20px rgba(var(--accent-rgb),0.12)'
              }}>
                <Icon.spark size={20} color="var(--green)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color:'var(--green)', fontWeight:700, letterSpacing:1.4, textTransform:'uppercase', fontFamily:'Inter, sans-serif' }}>Coach Insight</div>
                <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.45, color:'var(--txt)' }}>
                  Du hast diese Woche <b>{totalSetsLogged}</b> Sätze geloggt. Bleib dran!
                </div>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {/* LOSS-AVOIDANCE BANNER — only when there's a streak worth defending */}
      {lossAvoidance && streak > 0 && (
        <Section>
          <Card padding={14} style={{
            background:'rgba(239,68,68,0.06)',
            borderColor:'rgba(var(--accent-rgb),0.25)',
            boxShadow:'0 0 22px rgba(var(--accent-rgb),0.11)'
          }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background:'rgba(var(--accent-rgb),0.12)', border:'1px solid rgba(var(--accent-rgb),0.25)',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <Icon.warning size={18} color="#EF4444"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 600 }}>Halte deinen {streak}-Tage-Streak.</div>
                <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 2 }}>Heute trainieren um die Serie zu sichern.</div>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {/* WEIGHT + BMI — only show what we actually have */}
      {(weight > 0 || bmi > 0) && (
        <Section style={{ marginBottom: 24 }}>
          <Card padding={16}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1px 1fr', gap: 16, alignItems:'center' }}>
              <div>
                <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontWeight:600, fontFamily:'Inter, sans-serif' }}>Gewicht</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop: 6 }}>
                  <span className="ticker" style={{ fontSize: 28, fontWeight: 700 }}>{weight > 0 ? weight : '—'}</span>
                  {weight > 0 && <span style={{ fontSize: 14, color:'var(--txt-2)' }}>kg</span>}
                  {weightDelta != null && weightDelta !== 0 && (
                    <span style={{ marginLeft: 4, display:'inline-flex', alignItems:'center', gap: 2, color: weightDelta < 0 ? 'var(--green)' : '#EF4444', fontSize: 12, fontWeight: 600 }}>
                      {weightDelta < 0 ? <Icon.arrowDown size={12}/> : <Icon.arrowUp size={12}/>}
                      {Math.abs(weightDelta).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: 36, background:'var(--line-2)' }}/>
              <div>
                <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontWeight:600, fontFamily:'Inter, sans-serif' }}>BMI</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop: 6 }}>
                  <span className="ticker" style={{ fontSize: 28, fontWeight: 700 }}>{bmi > 0 ? bmi : '—'}</span>
                  {bmi > 0 && (
                    <span style={{ fontSize: 12, color:'var(--green)', fontWeight:600 }}>
                      {bmi < 18.5 ? 'Untergewicht' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Übergewicht' : 'Adipositas'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}

window.ScreenOverview = ScreenOverview;
