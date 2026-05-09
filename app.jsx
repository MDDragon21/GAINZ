// app.jsx — Main shell with auth gate, Supabase-backed state, bottom nav, screen routing, tweaks panel
const NAV = [
  { id:'overview', label:'Überblick', icon: 'dashboard' },
  { id:'training', label:'Training',  icon: 'calendar'  },
  { id:'body',     label:'Körper',    icon: 'body'      },
  { id:'leaderboard', label:'Rangliste', icon: 'trophy'  },
  { id:'profile',  label:'Profil',    icon: 'user'      },
];

// Themes — three options, applied to CSS vars on :root.
// New shape (post jade-glass refresh):
//   accent     — solid hex (also drives gradient via accentRgb)
//   accentRgb  — "r, g, b" string for rgba() composition
//   cardRgb    — "r, g, b" string used for semi-transparent glass card layers
//   bg         — page bg (subtle wash above bgDeep)
//   bgDeep     — outermost background (under glass)
const THEMES = {
  forest: {
    label: 'Forest',
    bg: '#060d09', bgDeep: '#030806',
    accent: '#006B4D', accentRgb: '0, 107, 77',
    cardRgb: '20, 40, 25',
    // Bright emerald used only for subtle bloom/glow (not solid fills).
    glowRgb: '0, 255, 170', glowAlpha: 0.08,
  },
  ocean: {
    label: 'Ocean',
    bg: '#080d18', bgDeep: '#04060d',
    accent: '#6B7AC4', accentRgb: '107, 122, 196',
    cardRgb: '20, 26, 50',
  },
  rose: {
    label: 'Rose',
    bg: '#180a0e', bgDeep: '#0d0307',
    accent: '#C97A95', accentRgb: '201, 122, 149',
    cardRgb: '50, 22, 32',
  },
  gold: {
    label: 'Gold',
    bg: '#0a0800', bgDeep: '#060500',
    accent: '#B8860B', accentRgb: '184, 134, 11',
    cardRgb: '40, 30, 5',
    // Warm amber bloom (NOT the reward --gold #C9A84C, which is reserved
    // for streaks/badges and stays the same across all themes).
    glowRgb: '255, 200, 50', glowAlpha: 0.08,
  },
};
const THEME_KEYS = Object.keys(THEMES);
function resolveTheme(key) { return THEMES[key] ? key : 'forest'; }

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
  const themeKey = resolveTheme(local?.palette);

  const t = profile ? {
    screen:           profile.active_screen || 'overview',
    theme:            themeKey,
    showLossAvoid:    profile.show_loss_avoid,
    showCoachInsight: profile.show_coach_insight,
    grain:            profile.grain,
  } : null;

  const [screen, setScreen] = React.useState('overview');
  React.useEffect(() => { if (t?.screen) setScreen(t.screen); }, [t?.screen]);

  // Apply theme → CSS variables (root). All components read from these
  // — never hardcoded colors — so switching theme repaints instantly.
  // The :root sheet already declares legacy aliases that reference these
  // canonical names (e.g. --green: var(--accent)) so updates cascade.
  React.useEffect(() => {
    const T = THEMES[themeKey];
    const r = document.documentElement.style;

    // Canonical jade-glass tokens
    r.setProperty('--bg',          T.bg);
    r.setProperty('--bg-deep',     T.bgDeep);
    r.setProperty('--accent',      T.accent);
    r.setProperty('--accent-rgb',  T.accentRgb);
    r.setProperty('--accent-soft', `rgba(${T.accentRgb}, 0.14)`);
    r.setProperty('--accent-glow', `rgba(${T.accentRgb}, 0.40)`);
    // Bright bloom used by glass card rim + CTA halo. Falls back to accent
    // when a theme doesn't define a separate bloom hue.
    if (T.glowRgb) {
      r.setProperty('--accent-bloom-rgb', T.glowRgb);
      r.setProperty('--accent-bloom', `rgba(${T.glowRgb}, ${T.glowAlpha ?? 0.08})`);
    } else {
      r.setProperty('--accent-bloom-rgb', T.accentRgb);
      r.setProperty('--accent-bloom', `rgba(${T.accentRgb}, 0.18)`);
    }
    r.setProperty('--card-rgb',    T.cardRgb);
    r.setProperty('--card',        `rgba(${T.cardRgb}, 0.55)`);
    r.setProperty('--card-2',      `rgba(${T.cardRgb}, 0.65)`);
    r.setProperty('--card-3',      `rgba(${T.cardRgb}, 0.75)`);

    // Legacy aliases — kept in sync explicitly for rules that resolve
    // var() in inline JS strings (e.g. components built before the
    // jade refresh that read --green / --grad directly).
    r.setProperty('--green',       T.accent);
    r.setProperty('--green-deep',  T.accent);
    r.setProperty('--green-soft',  `rgba(${T.accentRgb}, 0.14)`);
    r.setProperty('--green-glow',  `rgba(${T.accentRgb}, 0.40)`);
    r.setProperty('--grad',        `linear-gradient(135deg, rgba(${T.accentRgb},0.85) 0%, rgba(${T.accentRgb},0.55) 100%)`);
    r.setProperty('--grad-soft',   `linear-gradient(135deg, rgba(${T.accentRgb},0.18), rgba(${T.accentRgb},0.06))`);
    r.setProperty('--g1',          T.accent);
    r.setProperty('--g2',          T.accent);
    r.setProperty('--inactive',    'rgba(255,255,255,0.06)');

    document.body.style.background = T.bgDeep;
  }, [themeKey]);

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

    // Target weight changed → persist + verify by reading back.
    // Surfaces real errors (column missing / RLS / schema cache stale).
    if (computed.targetWeight !== local.targetWeight) {
      const target = (typeof computed.targetWeight === 'number' && Number.isFinite(computed.targetWeight))
        ? computed.targetWeight : null;
      console.log('[target_weight] save attempt:', target, 'for user', user.id);

      const { error: upErr } = await window.sb.from('profiles')
        .update({ target_weight: target }).eq('user_id', user.id);
      if (upErr) {
        console.error('[target_weight] update error:', upErr);
        throw new Error(`DB-Fehler: ${upErr.message}. Spalte target_weight existiert? SQL: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_weight numeric(5,2);`);
      }

      // Read back to verify the row actually changed.
      const { data: row, error: selErr } = await window.sb.from('profiles')
        .select('target_weight').eq('user_id', user.id).single();
      if (selErr) { console.error('[target_weight] readback error:', selErr); throw selErr; }
      console.log('[target_weight] DB row after save:', row);

      const dbVal = row?.target_weight;
      if (target === null) {
        if (dbVal != null) {
          throw new Error(`Konnte Zielgewicht nicht entfernen (DB-Wert ist immer noch ${dbVal}).`);
        }
      } else {
        if (dbVal == null) {
          throw new Error('Update lief durch, aber DB-Wert ist NULL. Schema-Cache veraltet? Supabase → Settings → API → "Reload schema cache" klicken.');
        }
        if (Math.abs(Number(dbVal) - target) > 0.01) {
          throw new Error(`DB-Wert (${dbVal}) weicht vom gespeicherten Wert (${target}) ab.`);
        }
      }

      await reload();
      return;
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
    if (computed.palette !== local.palette && THEMES[computed.palette]) {
      profilePatch.palette = computed.palette;
    }
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
      grain: 'grain',
    };
    const patch = {};
    for (const [k, v] of Object.entries(edits)) {
      const f = fieldMap[k];
      if (!f) continue;
      patch[f] = v;
    }
    setLocal(d => {
      if (!d) return d;
      const next = { ...d, _profile: { ...d._profile, ...patch } };
      if (patch.palette) next.palette = patch.palette;
      return next;
    });
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
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--txt)',
      }}>
        {/* CINEMATIC GYM ATMOSPHERE — amber light streaks + deep teal pools + theme halo */}
        <div style={{
          position:'absolute', inset: 0, overflow:'hidden', pointerEvents:'none',
          background: '#050706',
        }}>
          {/* DIAGONAL AMBER LIGHT STREAK — overhead gym spots hitting steel */}
          <div style={{
            position:'absolute', top: '-30%', left: '-20%', right: '-20%', height: '70%',
            background: 'linear-gradient(118deg, transparent 0%, transparent 30%, rgba(218,170,90,0.45) 45%, rgba(232,190,110,0.55) 50%, rgba(218,170,90,0.35) 55%, transparent 72%, transparent 100%)',
            filter: 'blur(28px)',
            opacity: 0.85,
            mixBlendMode: 'screen',
          }}/>
          {/* second softer amber streak */}
          <div style={{
            position:'absolute', top: '-10%', left: '-30%', right: '-10%', height: '60%',
            background: 'linear-gradient(135deg, transparent 35%, rgba(180,135,70,0.30) 50%, transparent 65%)',
            filter: 'blur(40px)',
            mixBlendMode: 'screen',
          }}/>
          {/* deep teal pool bottom-left */}
          <div style={{
            position:'absolute', bottom: '-25%', left: '-25%', width: 480, height: 480, borderRadius:'50%',
            background: 'radial-gradient(circle, rgba(40, 90, 95, 0.55) 0%, rgba(40, 90, 95, 0.18) 40%, transparent 70%)',
            filter: 'blur(70px)',
          }}/>
          {/* deep teal pool top-left */}
          <div style={{
            position:'absolute', top: '-15%', left: '-30%', width: 420, height: 420, borderRadius:'50%',
            background: 'radial-gradient(circle, rgba(28, 70, 80, 0.50) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}/>
          {/* theme accent halo mid-right */}
          <div style={{
            position:'absolute', top: '40%', right: '-15%', width: 360, height: 360, borderRadius:'50%',
            background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.30) 0%, transparent 65%)',
            filter: 'blur(60px)',
            mixBlendMode: 'screen',
          }}/>
          {/* warm floor glow */}
          <div style={{
            position:'absolute', bottom: '-10%', right: '5%', width: 320, height: 220, borderRadius:'50%',
            background: 'radial-gradient(ellipse, rgba(200, 130, 70, 0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
            mixBlendMode: 'screen',
          }}/>
          {/* dark overlay — keeps content readable */}
          <div style={{
            position:'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(5,7,6,0.55) 0%, rgba(5,7,6,0.72) 100%)',
          }}/>
          {/* film grain on top */}
          {t.grain && <div className="grain" style={{ position:'absolute', inset: 0 }}/>}
        </div>
        <div className="screen-scroll" style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingTop:    'calc(env(safe-area-inset-top, 0px) + 16px)',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
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
        display:'flex', flexDirection:'column', alignItems:'center', gap: 5,
        padding: '6px 0', cursor:'pointer', position:'relative', minWidth: 0,
      }}>
        {isActive ? (
          <span style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width: 30, height: 30,
            background:'rgba(var(--accent-rgb),0.20)',
            border:'1px solid rgba(var(--accent-rgb),0.45)',
            borderTopColor:'rgba(255,255,255,0.30)',
            borderLeftColor:'rgba(255,255,255,0.20)',
            borderRadius: 10,
            boxShadow:'0 0 18px rgba(var(--accent-rgb),0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}>
            <I size={16} color="var(--accent)"/>
          </span>
        ) : <I size={18} color="var(--txt-3)"/>}
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: 1.5, fontFamily:'Inter, sans-serif',
          textTransform:'uppercase',
          color: isActive ? 'var(--accent)' : 'var(--txt-3)',
          whiteSpace:'nowrap',
        }}>{n.label}</div>
      </button>
    );
  };

  return (
    <div style={{
      position:'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
      paddingTop: 10,
      paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      paddingLeft:  'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
      background:'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.7) 100%)',
      pointerEvents: 'auto',
    }}>
      <div className="glass" style={{
        margin:'0 14px',
        borderRadius: 22,
        padding: '10px 6px',
        display:'flex', alignItems:'center',
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
        <TweakSelect label="Theme" value={t.theme} onChange={(v) => setTweak('palette', v)}
          options={THEME_KEYS.map(k => ({ value: k, label: THEMES[k].label }))}/>
      </TweakSection>
      <TweakSection label="Look">
        <TweakToggle label="Korn-Textur" value={t.grain} onChange={(v) => setTweak('grain', v)}/>
      </TweakSection>
      {/* Expose theme registry on window so screens can render the picker. */}
      <TweakSection label="Inhalt">
        <TweakToggle label="Loss-Avoidance Banner" value={t.showLossAvoid} onChange={(v) => setTweak('showLossAvoid', v)}/>
        <TweakToggle label="Coach Insight" value={t.showCoachInsight} onChange={(v) => setTweak('showCoachInsight', v)}/>
      </TweakSection>
    </TweaksPanel>
  );
}

// Expose theme registry to other screens (Profile picker reads from it).
window.GAINZ_THEMES = THEMES;
window.GAINZ_THEME_KEYS = THEME_KEYS;

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
