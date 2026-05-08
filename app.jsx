// app.jsx — Main shell with auth gate, Supabase-backed state, bottom nav, screen routing, tweaks panel
const NAV = [
  { id:'overview', label:'Überblick', icon: 'dashboard' },
  { id:'training', label:'Training',  icon: 'calendar'  },
  { id:'body',     label:'Körper',    icon: 'body'      },
  { id:'leaderboard', label:'Rangliste', icon: 'trophy'  },
  { id:'profile',  label:'Profil',    icon: 'user'      },
];

// Palettes — each: [accent-light, accent-deep, bg, card, line]
const PALETTES = {
  forest:  ['#3d8068', '#173a2e', '#020805', '#061410', '#0d2018'],
  indigo:  ['#4c2bb0', '#1d1a5e', '#050510', '#0a0a18', '#161635'],
  matrix:  ['#00CC33', '#007722', '#040605', '#0a0e0c', '#101a14'],
  amber:   ['#d4761a', '#7a2710', '#100805', '#1a100a', '#28180e'],
  cobalt:  ['#2a6bd6', '#0e2566', '#04081a', '#0a1230', '#152545'],
};

function paletteKeyFromTuple(tuple) {
  const s = JSON.stringify(tuple);
  for (const [k, v] of Object.entries(PALETTES)) if (JSON.stringify(v) === s) return k;
  return 'forest';
}

function mix(hex, target, amt) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const tr = target === 'white' ? 255 : 0;
  const m = (c) => Math.round(c + (tr - c) * amt);
  const toHex = (n) => n.toString(16).padStart(2,'0');
  return '#' + toHex(m(r)) + toHex(m(g)) + toHex(m(b));
}
function hexRgb(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)].join(',');
}

// Top-level: auth gate
function App() {
  const { user, loading } = window.useAuth();
  if (loading) return <SplashLoader label="Lade…"/>;
  if (!user)   return <AuthScreen/>;
  return <AppShell key={user.id} user={user}/>;
}

function SplashLoader({ label }) {
  return (
    <div style={{
      minHeight: '100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#061410', color:'#8fa89d', fontFamily:'JetBrains Mono, monospace',
      fontSize: 12, letterSpacing: 2, textTransform:'uppercase'
    }}>{label}</div>
  );
}

// Authenticated app shell — pulls all state from Supabase via useGainzData
function AppShell({ user }) {
  const { data: srv, reload, loading } = window.useGainzData(user);
  const [local, setLocal] = React.useState(null);
  const [workoutSession, setWorkoutSession] = React.useState(null);

  // Hydrate local mirror from server state
  React.useEffect(() => { if (srv) setLocal(srv); }, [srv]);

  const profile = local?._profile;
  const paletteKey = profile?.palette || 'forest';
  const paletteTuple = PALETTES[paletteKey] || PALETTES.forest;

  const t = profile ? {
    screen:           profile.active_screen || 'overview',
    palette:          paletteTuple,
    showLossAvoid:    profile.show_loss_avoid,
    showCoachInsight: profile.show_coach_insight,
    showFrame:        profile.show_frame,
    grain:            profile.grain,
  } : null;

  const [screen, setScreen] = React.useState('overview');
  React.useEffect(() => { if (t?.screen) setScreen(t.screen); }, [t?.screen]);

  // Apply palette → CSS variables
  React.useEffect(() => {
    if (!t) return;
    const [light, deep, bg, card, line] = t.palette;
    const r = document.documentElement.style;
    r.setProperty('--g1', deep);
    r.setProperty('--g2', light);
    r.setProperty('--grad', `linear-gradient(135deg, ${deep} 0%, ${light} 100%)`);
    r.setProperty('--grad-soft', `linear-gradient(135deg, rgba(${hexRgb(deep)},0.18), rgba(${hexRgb(light)},0.18))`);
    r.setProperty('--green', light);
    r.setProperty('--green-deep', deep);
    r.setProperty('--green-soft', `rgba(${hexRgb(light)},0.14)`);
    r.setProperty('--green-glow', `rgba(${hexRgb(light)},0.40)`);
    r.setProperty('--bg', bg);
    r.setProperty('--bg-deep', mix(bg, 'black', 0.4));
    r.setProperty('--card', card);
    r.setProperty('--card-2', mix(card, 'white', 0.06));
    r.setProperty('--line', line);
    r.setProperty('--line-2', mix(line, 'white', 0.20));
    r.setProperty('--inactive', line);
    document.body.style.background = mix(bg, 'black', 0.4);
  }, [paletteKey]);

  // Persisting setData wrapper passed to screens — DB writes for relevant fields,
  // local-only for transient UI state.
  const setData = React.useCallback(async (next) => {
    if (!local) return;
    const computed = typeof next === 'function' ? next(local) : { ...local, ...next };

    // Height changed → persist to profile (must run before weight so reload has fresh value)
    if (typeof computed.height === 'number' && computed.height !== local.height) {
      try { await window.gainz.profile.update(user.id, { height_cm: computed.height }); }
      catch (e) { console.error('height save failed', e); }
    }

    // Target weight changed → persist to profile (best-effort: tolerate stale schema cache)
    if (computed.targetWeight !== local.targetWeight) {
      try {
        await window.gainz.profile.update(user.id, {
          target_weight: (typeof computed.targetWeight === 'number' && Number.isFinite(computed.targetWeight))
            ? computed.targetWeight : null,
        });
        await reload();
        return;
      } catch (e) {
        console.warn('target_weight save skipped (schema cache?):', e?.message || e);
        // Still mirror locally so UI reflects intent until cache refreshes.
        setLocal(d => d ? ({ ...d, targetWeight: computed.targetWeight }) : d);
      }
    }

    // Weight changed → log to weight_logs + reload from server
    if (typeof computed.weight === 'number' && computed.weight !== local.weight) {
      try {
        const bmi = typeof computed.bmi === 'number' && Number.isFinite(computed.bmi) ? computed.bmi : null;
        await window.gainz.weight.add(user.id, computed.weight, bmi);
        await reload();
        return;
      } catch (e) { console.error('weight save failed', e); }
    }

    // Persist simple profile fields if they changed
    const profilePatch = {};
    if (computed.name !== local.name) profilePatch.display_name = computed.name;
    if (computed.streak !== local.streak) profilePatch.streak = computed.streak;
    if (computed.weekDone !== local.weekDone) profilePatch.week_done = computed.weekDone;
    if (computed.weekGoal !== local.weekGoal) profilePatch.week_goal = computed.weekGoal;
    if (JSON.stringify(computed.muscleTargets || {}) !== JSON.stringify(local.muscleTargets || {})) {
      profilePatch.muscle_targets = computed.muscleTargets;
    }
    if (Object.keys(profilePatch).length) {
      try { await window.gainz.profile.update(user.id, profilePatch); } catch (e) { console.error(e); }
    }

    setLocal(computed);
  }, [local, user, reload]);

  // Tweaks setter persists to profile
  const setTweak = React.useCallback(async (keyOrEdits, val) => {
    if (!profile) return;
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    const fieldMap = {
      screen: 'active_screen',
      palette: 'palette',
      showLossAvoid: 'show_loss_avoid',
      showCoachInsight: 'show_coach_insight',
      showFrame: 'show_frame',
      grain: 'grain',
    };
    const patch = {};
    for (const [k, v] of Object.entries(edits)) {
      const f = fieldMap[k];
      if (!f) continue;
      patch[f] = (k === 'palette') ? paletteKeyFromTuple(v) : v;
    }
    setLocal(d => d ? ({ ...d, _profile: { ...d._profile, ...patch } }) : d);
    if (edits.screen) setScreen(edits.screen);
    try { await window.gainz.profile.update(user.id, patch); } catch (e) { console.error(e); }
  }, [profile, user]);

  // Persist a workout session when guided overlay closes
  const handleWorkoutExit = async () => {
    const session = workoutSession;
    setWorkoutSession(null);
    if (!session || !user) return;
    try {
      const sess = await window.gainz.sessions.start(user.id, {
        duration_min: session.duration,
        work_sec: session.work,
        rest_sec: session.rest,
      });
      const muscles = (session.selected || []).map(name => ({
        muscle: name.toLowerCase(),
        sets: (session.setsBy && session.setsBy[name]) || 3,
        tracking: 'reps',
      }));
      await window.gainz.sessions.addMuscles(sess.id, muscles);
      await window.gainz.sessions.finish(sess.id, { duration_min: session.duration });
      // bump streak/week_done locally then persist
      const nextWeek = (local?.weekDone ?? 0) + 1;
      await window.gainz.profile.update(user.id, { week_done: nextWeek });
      await reload();
    } catch (e) { console.error('session save failed', e); }
  };

  if (loading || !local || !t) return <SplashLoader label="Sync…"/>;

  const data = local;

  const screenContent = (
    <>
      {screen === 'overview'    && <ScreenOverview data={data} setData={setData} user={user} openCoach={() => goToScreen('start')} openProfile={() => goToScreen('profile')}/>}
      {screen === 'training'    && <ScreenTraining data={data} setData={setData} user={user} reload={reload}/>}
      {screen === 'start'       && <ScreenStart data={data} setData={setData} onStart={s => setWorkoutSession(s)}/>}
      {screen === 'body'        && <ScreenBody data={data} setData={setData}/>}
      {screen === 'leaderboard' && <ScreenLeaderboard data={data} user={user}/>}
      {screen === 'profile'     && <ScreenProfile data={data} setData={setData} user={user} reload={reload}/>}
    </>
  );

  const goToScreen = (id) => {
    setScreen(id);
    setTweak('screen', id);
  };

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        color: 'var(--txt)',
        overflow: 'hidden',
      }}>
        <div className={t.grain ? 'grain' : ''} style={{
          position:'absolute', inset: 0, overflow:'hidden', pointerEvents:'none',
          background:
            'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(61,128,104,0.04), transparent 60%),' +
            'radial-gradient(ellipse 60% 30% at 100% 100%, rgba(255,215,0,0.04), transparent 70%),' +
            'var(--bg)',
        }}/>
        <div className="screen-scroll" style={{
          position:'absolute', inset: 0,
          zIndex: 2,
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          paddingTop:    'calc(env(safe-area-inset-top, 0px) + 16px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
          paddingLeft:   'env(safe-area-inset-left, 0px)',
          paddingRight:  'env(safe-area-inset-right, 0px)',
        }}>
          {screenContent}
        </div>

        <BottomNav active={screen} onChange={goToScreen}/>

        {workoutSession && <GuidedWorkout session={workoutSession} onExit={handleWorkoutExit}/>}
      </div>

      <Tweaks t={t} setTweak={setTweak}/>
    </>
  );
}

function BottomNav({ active, onChange }) {
  const renderItem = (n) => {
    const isActive = active === n.id;
    const I = Icon[n.icon];
    return (
      <button key={n.id} onClick={() => onChange(n.id)} style={{
        flex: 1, border:'none', background:'transparent',
        display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
        padding: '6px 0', cursor:'pointer', position:'relative', minWidth: 0,
      }}>
        {isActive && <div style={{
          position:'absolute', top:-2, width: 4, height: 4, borderRadius: 4,
          background:'var(--grad)', boxShadow:'0 0 6px rgba(61,128,104,0.45)'
        }}/>}
        {isActive ? (
          <span style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width: 26, height: 26,
            background:'var(--grad)',
            borderRadius: 8,
            boxShadow:'0 0 14px rgba(61,128,104,0.28)',
          }}>
            <I size={18} color="#fff"/>
          </span>
        ) : <I size={20} color="var(--txt-3)"/>}
        <div className={isActive ? 'grad-text' : ''} style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.4, fontFamily:'JetBrains Mono, monospace', textTransform:'uppercase', color: isActive ? undefined : 'var(--txt-3)', whiteSpace:'nowrap' }}>{n.label}</div>
      </button>
    );
  };

  return (
    <div style={{
      position:'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      paddingTop: 10,
      paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
      paddingLeft:  'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
      background:'linear-gradient(180deg, transparent 0%, rgba(8,8,8,0.85) 30%, rgba(8,8,8,0.95) 100%)',
      backdropFilter:'blur(14px)',
      WebkitBackdropFilter:'blur(14px)',
    }}>
      <div style={{
        margin:'0 14px',
        background:'rgba(13,31,26,0.85)',
        border:'1px solid var(--line)',
        borderRadius: 24,
        padding: '8px 6px',
        display:'flex', alignItems:'center',
        boxShadow:'0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
      }}>
        {NAV.map(renderItem)}
      </div>
    </div>
  );
}

function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Demo">
        <TweakSelect label="Aktiver Screen" value={t.screen} onChange={(v) => setTweak('screen', v)}
          options={[
            { value:'overview', label:'1 · Überblick' },
            { value:'training', label:'2 · Training' },
            { value:'body', label:'3 · Körper' },
            { value:'leaderboard', label:'4 · Rangliste' },
            { value:'profile', label:'5 · Profil' },
            { value:'start', label:'→ Quick Workout' },
          ]}/>
      </TweakSection>
      <TweakSection label="Farbschema">
        <TweakColor label="Palette" value={t.palette} onChange={(v) => setTweak('palette', v)}
          options={[ PALETTES.forest, PALETTES.indigo, PALETTES.matrix, PALETTES.amber, PALETTES.cobalt ]}/>
      </TweakSection>
      <TweakSection label="Look">
        <TweakToggle label="Korn-Textur" value={t.grain} onChange={(v) => setTweak('grain', v)}/>
      </TweakSection>
      <TweakSection label="Inhalt">
        <TweakToggle label="Loss-Avoidance Banner" value={t.showLossAvoid} onChange={(v) => setTweak('showLossAvoid', v)}/>
        <TweakToggle label="Coach Insight" value={t.showCoachInsight} onChange={(v) => setTweak('showCoachInsight', v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
