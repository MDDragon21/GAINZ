// screens-social.jsx — Screen 5 (Rangliste) + Screen 6 (Profil)

function ScreenLeaderboard({ data, user }) {
  const [tab, setTab] = React.useState('week');
  const [rows, setRows] = React.useState(null);

  // Current week's Monday in local time as YYYY-MM-DD
  const weekStartISO = React.useMemo(() => {
    const d = new Date();
    const idx = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - idx);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }, []);

  const weekRangeLabel = React.useMemo(() => {
    const start = new Date(weekStartISO + 'T00:00:00');
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('de-DE', { day:'numeric', month:'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [weekStartISO]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await window.gainz.leaderboard.week(weekStartISO);
        if (alive) setRows(r || []);
      } catch (e) { console.error(e); if (alive) setRows([]); }
    })();
    return () => { alive = false; };
  }, [weekStartISO]);

  // Real ranked list: sort by score desc, assign ranks.
  const ranked = (rows || [])
    .map(r => ({
      user_id: r.user_id,
      name: (r.profiles && r.profiles.display_name) || 'Athlet',
      score: r.score || 0,
      streak: 0, // streak isn't stored per-week — leave 0 to avoid faking it
      isMe: r.user_id === user?.id,
    }))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const me = ranked.find(r => r.isMe);

  const Row = ({ u, highlight }) => (
    <div style={{
      display:'flex', alignItems:'center', gap: 12,
      padding: '12px 14px',
      borderRadius: 14,
      background: highlight ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
      border: highlight ? '1px solid rgba(var(--accent-rgb),0.32)' : '1px solid transparent',
      borderBottom: highlight ? '1px solid rgba(var(--accent-rgb),0.32)' : '1px solid var(--line)',
      boxShadow: highlight ? '0 0 24px rgba(var(--accent-rgb),0.20), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
      position: 'relative'
    }}>
      <div className="ticker" style={{
        width: 28, textAlign:'center', fontSize: 16, fontWeight: 700,
        color: u.rank <= 3 ? 'var(--gold)' : 'var(--txt-2)',
        fontFamily:'Inter, sans-serif'
      }}>{u.rank}</div>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        background: highlight ? 'var(--green)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${highlight ? 'rgba(var(--accent-rgb),0.32)' : 'var(--line)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: 13, fontWeight: 700, color: highlight ? '#fff' : 'var(--txt-2)'
      }}>{u.name.slice(0,2).toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          <span className={highlight ? 'grad-text' : ''} style={{ fontSize: 14, fontWeight: 600, color: highlight ? undefined : 'var(--txt)' }}>{u.name}</span>
          {highlight && <span className="grad-text" style={{ fontSize: 9, fontWeight: 700, padding:'2px 6px', borderRadius:6, background:'rgba(var(--accent-rgb),0.16)', border:'1px solid rgba(var(--accent-rgb),0.28)', fontFamily:'Inter, sans-serif', letterSpacing: 1 }}>DU</span>}
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className={highlight ? 'ticker grad-text' : 'ticker'} style={{ fontSize: 16, fontWeight: 700, color: highlight ? undefined : 'var(--txt)' }}>{u.score.toLocaleString('de-DE')}</div>
        <div style={{ fontSize: 9, color:'var(--txt-3)', textTransform:'uppercase', fontFamily:'Inter, sans-serif', letterSpacing: 1 }}>XP</div>
      </div>
    </div>
  );

  return (
    <div data-screen-label="05 Rangliste">
      <ScreenHeader title="Rangliste" sub={weekRangeLabel}/>

      {/* ME CARD — only show when user has an entry this week */}
      {me && (
        <Section>
          <Row u={me} highlight/>
        </Section>
      )}

      {/* LIST */}
      {rows === null ? (
        <Section><Card padding={20} style={{ textAlign:'center', color:'var(--txt-2)' }}>Lade Rangliste…</Card></Section>
      ) : ranked.length === 0 ? (
        <Section>
          <Card padding={24} style={{ textAlign:'center' }}>
            <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.55 }}>
              Diese Woche noch keine Einträge.<br/>
              Schließe ein Workout ab um auf der Rangliste zu erscheinen.
            </div>
          </Card>
        </Section>
      ) : (
        <Section title={`Top ${ranked.length}`}>
          <Card padding={4}>
            {ranked.filter(u => !u.isMe).map(u => <Row key={u.user_id} u={u}/>)}
          </Card>
          <div style={{ fontSize: 11, color:'var(--txt-3)', marginTop: 12, padding:'0 4px', textAlign:'center', lineHeight: 1.5 }}>
            🔒 Nur Score sichtbar — Trainingsdaten bleiben privat.
          </div>
        </Section>
      )}
      <div style={{ height: 24 }}/>
    </div>
  );
}

function ScreenProfile({ data, setData, user, reload }) {
  const accountEmail = user?.email || '—';
  const handleLogout = async () => {
    try { await window.gainzAuth.signOut(); }
    catch (e) { console.error('logout failed', e); }
  };

  const sessionsTotal = data.sessionsCount || 0;
  const streakRecord  = data.streak || 0;
  const prsTotal      = 0; // No PRs table yet — never fake.

  // Earned states derived from real metrics. New user → all locked.
  const badges = [
    { name: 'Erster Schritt',   icon: '🥾', earned: sessionsTotal >= 1 },
    { name: '7 Tage am Stück',  icon: '🔥', earned: streakRecord >= 7 },
    { name: '30 Tage Krieger',  icon: '⚔️', earned: streakRecord >= 30 },
    { name: '100 Sessions',     icon: '💯', earned: sessionsTotal >= 100 },
    { name: 'Leg Day Survivor', icon: '🦵', earned: false },
    { name: 'PR König',         icon: '👑', earned: false },
  ];
  const earnedCount = badges.filter(b => b.earned).length;
  const prs = []; // empty until PR tracking exists

  const joinedLabel = (() => {
    const iso = user?.created_at;
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  })();

  const handle = (data.name || 'athlet').toLowerCase().replace(/\s+/g, '_');

  // ── Trainingsziele (Wochenziel + per-Muskel Sets) ─────────────────────────
  const DEFAULT_TARGETS = { brust:20, ruecken:20, schultern:20, bizeps:20, trizeps:20, bauch:20, beine:20 };
  const MUSCLES = [
    { key:'brust', label:'Brust' },
    { key:'ruecken', label:'Rücken' },
    { key:'schultern', label:'Schultern' },
    { key:'bizeps', label:'Bizeps' },
    { key:'trizeps', label:'Trizeps' },
    { key:'bauch', label:'Bauch' },
    { key:'beine', label:'Beine' },
  ];
  const [draftWeekGoal, setDraftWeekGoal] = React.useState(Number(data.weekGoal) || 0);
  const [draftTargets,  setDraftTargets]  = React.useState(() => ({ ...DEFAULT_TARGETS, ...(data.muscleTargets || {}) }));
  React.useEffect(() => { setDraftWeekGoal(Number(data.weekGoal) || 0); }, [data.weekGoal]);
  React.useEffect(() => { setDraftTargets({ ...DEFAULT_TARGETS, ...(data.muscleTargets || {}) }); }, [data.muscleTargets]);
  const goalsDirty = draftWeekGoal !== (Number(data.weekGoal) || 0) ||
    JSON.stringify(draftTargets) !== JSON.stringify({ ...DEFAULT_TARGETS, ...(data.muscleTargets || {}) });
  const [toastUntil, setToastUntil] = React.useState(0);
  const [, force] = React.useReducer(x => x + 1, 0);
  const toastVisible = Date.now() < toastUntil;
  React.useEffect(() => {
    if (!toastUntil) return;
    const id = setTimeout(force, Math.max(0, toastUntil - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [toastUntil]);
  const onSaveGoals = async () => {
    const cleanedTargets = {};
    for (const m of MUSCLES) {
      const v = parseInt(draftTargets[m.key], 10);
      cleanedTargets[m.key] = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
    }
    const wg = Math.max(1, Math.min(7, parseInt(draftWeekGoal, 10) || 0));
    setDraftWeekGoal(wg);
    setDraftTargets(cleanedTargets);
    await setData({ ...data, weekGoal: wg, muscleTargets: cleanedTargets });
    setToastUntil(Date.now() + 2000);
  };

  // Reset-all-data flow
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const [resetError, setResetError] = React.useState(null);
  const [resetToastUntil, setResetToastUntil] = React.useState(0);
  const [, forceTick] = React.useReducer(x => x + 1, 0);
  const resetToastVisible = Date.now() < resetToastUntil;
  React.useEffect(() => {
    if (!resetToastUntil) return;
    const id = setTimeout(forceTick, Math.max(0, resetToastUntil - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [resetToastUntil]);
  const handleResetAll = async () => {
    if (!user || resetting) return;
    setResetError(null);
    setResetting(true);
    try {
      await window.gainz.danger.resetAllData(user.id);
      if (typeof reload === 'function') await reload();
      setShowResetDialog(false);
      setResetToastUntil(Date.now() + 2600);
    } catch (e) {
      console.error('reset failed', e);
      setResetError(e.message || String(e));
    } finally {
      setResetting(false);
    }
  };

  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(data.name || '');
  React.useEffect(() => { if (!editingName) setDraftName(data.name || ''); }, [data.name, editingName]);
  const beginEditName = () => { setDraftName(data.name || ''); setEditingName(true); };
  const cancelName    = () => { setDraftName(data.name || ''); setEditingName(false); };
  const saveName      = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === (data.name || '').trim()) return;
    await setData({ ...data, name: trimmed });
    setEditingName(false);
  };

  return (
    <div data-screen-label="05 Profil">
      <ScreenHeader title="Profil" right={
        <div style={{ width: 38, height: 38, borderRadius: 12, background:'rgba(255,255,255,0.04)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon.edit size={16} color="var(--txt-2)"/>
        </div>
      }/>

      {/* AVATAR + IDENTITY — display name editable, real account data only */}
      <Section>
        <Card padding={20} style={{ background:'var(--card)' }}>
          <div style={{ display:'flex', gap: 16, alignItems:'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: 999,
              background:'var(--green)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 28, fontWeight: 700, color:'#fff',
              boxShadow:'0 0 28px rgba(var(--accent-rgb),0.32), 0 0 18px rgba(var(--accent-rgb),0.20), inset 0 1px 0 rgba(255,255,255,0.30)',
              fontFamily:'Inter, sans-serif',
              flexShrink: 0,
            }}>{(data.name || 'A').slice(0,2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={draftName}
                    placeholder="Anzeigename"
                    maxLength={40}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName();
                      if (e.key === 'Escape') cancelName();
                    }}
                    style={{
                      width:'100%',
                      padding:'10px 12px',
                      background:'#1a1a2e',
                      border:'1px solid var(--line)',
                      borderRadius: 10,
                      color:'#FFFFFF', WebkitTextFillColor:'#FFFFFF',
                      fontSize: 16, fontWeight: 600,
                      fontFamily:'inherit',
                      outline:'none',
                      caretColor:'var(--green)',
                      boxSizing:'border-box',
                    }}
                  />
                  <div style={{ display:'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={cancelName} style={{
                      flex: 1, padding:'8px 10px',
                      background:'transparent', border:'1px solid var(--line)',
                      borderRadius: 8, color:'var(--txt-2)', fontSize: 12, fontWeight: 600,
                      cursor:'pointer', fontFamily:'inherit',
                    }}>Abbrechen</button>
                    <button
                      onClick={saveName}
                      disabled={!draftName.trim() || draftName.trim() === (data.name || '').trim()}
                      style={{
                        flex: 2, padding:'8px 10px',
                        background: (!draftName.trim() || draftName.trim() === (data.name || '').trim())
                          ? 'rgba(var(--accent-rgb),0.3)' : 'var(--grad)',
                        border:'none', borderRadius: 8,
                        color:'#fff', fontSize: 12, fontWeight: 700,
                        cursor: (!draftName.trim() || draftName.trim() === (data.name || '').trim()) ? 'not-allowed' : 'pointer',
                        fontFamily:'inherit',
                      }}>Speichern</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.1, color:'#FFFFFF', wordBreak:'break-word' }}>
                      {data.name || 'Athlet'}
                    </div>
                    <button onClick={beginEditName} style={{
                      padding:'4px 10px',
                      background:'rgba(var(--accent-rgb),0.10)',
                      border:'1px solid rgba(var(--accent-rgb),0.30)',
                      borderRadius: 999,
                      color:'var(--green)', fontSize: 10, fontWeight: 700,
                      cursor:'pointer', fontFamily:'Inter, sans-serif',
                      letterSpacing: 1, textTransform:'uppercase',
                    }}>Bearbeiten</button>
                  </div>
                  <div style={{ fontSize: 12, color:'var(--txt-2)', marginTop: 4 }}>@{handle}</div>
                  {joinedLabel && (
                    <div style={{ fontSize: 11, color:'var(--txt-3)', marginTop: 6, fontFamily:'Inter, sans-serif', letterSpacing: 1 }}>
                      Beigetreten · {joinedLabel}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </Section>

      {/* STATS ROW — real values from Supabase, zero by default */}
      <Section>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
          {[
            { label:'Sessions', val: sessionsTotal, sub:'gesamt' },
            { label:'Streak', val: streakRecord, sub:'rekord', color: streakRecord > 0 ? 'var(--gold)' : 'var(--txt)' },
            { label:'PRs', val: prsTotal, sub:'gesetzt' },
          ].map(s => (
            <Card key={s.label} padding={14}>
              <div style={{ fontSize: 10, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontWeight: 600, fontFamily:'Inter, sans-serif' }}>{s.label}</div>
              <div className="ticker serif" style={{ fontSize: 34, fontWeight: 600, marginTop: 6, color: s.color || 'var(--accent)', lineHeight: 1, fontStyle:'italic' }}>{s.val}</div>
              <div style={{ fontSize: 10, color:'var(--txt-3)', marginTop: 2, fontFamily:'Inter, sans-serif', textTransform:'uppercase' }}>{s.sub}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* BADGES */}
      <Section title="Meine Abzeichen" right={<span style={{ fontSize: 11, color:'var(--txt-3)', fontFamily:'Inter, sans-serif' }}>{earnedCount} / {badges.length}</span>}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 8 }}>
          {badges.map(b => (
            <div key={b.name} style={{
              padding: 14, borderRadius: 14,
              background: 'var(--card)',
              border: `1px solid ${b.earned ? 'rgba(255,215,0,0.25)' : 'var(--line)'}`,
              textAlign:'center',
              opacity: b.earned ? 1 : 0.45,
              position:'relative'
            }}>
              <div style={{ fontSize: 28, marginBottom: 4, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, color: b.earned ? 'var(--txt)' : 'var(--txt-3)' }}>{b.name}</div>
              {!b.earned && <div style={{ position:'absolute', top: 8, right: 8 }}><Icon.lock size={11} color="var(--txt-3)"/></div>}
            </div>
          ))}
        </div>
      </Section>

      {/* PRs — only real records; empty state otherwise */}
      <Section title="Personal Records">
        {prs.length > 0 ? (
          <Card padding={4}>
            {prs.map((p, i) => (
              <div key={p.ex} style={{
                display:'flex', alignItems:'center', gap: 12,
                padding: '12px 14px',
                borderBottom: i < prs.length - 1 ? '1px solid var(--line)' : 'none'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255,215,0,0.10)', border: '1px solid rgba(255,215,0,0.20)',
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}><Icon.medal size={16} color="var(--gold)"/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.ex}</div>
                  <div style={{ fontSize: 10, color:'var(--txt-3)', marginTop: 2, fontFamily:'Inter, sans-serif' }}>{p.date}</div>
                </div>
                <div className="ticker" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{p.v}</div>
              </div>
            ))}
          </Card>
        ) : (
          <Card padding={20} style={{ textAlign:'center' }}>
            <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.55 }}>
              Noch keine Personal Records — fang an mit Workouts loggen.
            </div>
          </Card>
        )}
      </Section>

      {/* TRAININGSZIELE — Wochenziel (Tage) + per-Muskel Sets/Woche */}
      <Section title="Trainingsziele">
        <Card padding={18}>
          <div style={{ fontSize: 13, color:'var(--txt)', fontWeight: 600, marginBottom: 6 }}>
            Wie viele Tage pro Woche möchtest du trainieren?
          </div>
          <div style={{ fontSize: 11, color:'var(--txt-3)', marginBottom: 12, fontFamily:'Inter, sans-serif', letterSpacing: 0.5 }}>
            100 % Baseline für den Wochenfortschritt
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <button onClick={() => setDraftWeekGoal(v => Math.max(1, (v||1) - 1))} style={stepBtn}>−</button>
            <input
              type="number" inputMode="numeric" pattern="[0-9]*"
              min={1} max={7} step={1}
              value={Number.isFinite(draftWeekGoal) && draftWeekGoal > 0 ? draftWeekGoal : ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) { setDraftWeekGoal(0); return; }
                setDraftWeekGoal(Math.max(1, Math.min(7, n)));
              }}
              style={{
                flex: 1, padding:'12px 14px', textAlign:'center',
                background:'#1a1a2e', border:'1px solid var(--line)', borderRadius: 10,
                color:'#FFFFFF', WebkitTextFillColor:'#FFFFFF',
                fontSize: 22, fontWeight: 700, fontFamily:'inherit',
                outline:'none', caretColor:'var(--green)',
                WebkitAppearance:'none', MozAppearance:'textfield',
                boxSizing:'border-box',
              }}
            />
            <button onClick={() => setDraftWeekGoal(v => Math.min(7, (v||0) + 1))} style={stepBtn}>+</button>
            <span style={{ fontSize: 12, color:'var(--txt-2)', minWidth: 44 }}>/ 7 Tage</span>
          </div>
        </Card>

        <div style={{ height: 12 }}/>

        <Card padding={18}>
          <div style={{ fontSize: 13, color:'var(--txt)', fontWeight: 600, marginBottom: 6 }}>
            Sets pro Muskelgruppe
          </div>
          <div style={{ fontSize: 11, color:'var(--txt-3)', marginBottom: 12, fontFamily:'Inter, sans-serif', letterSpacing: 0.5 }}>
            Wie viele Sets pro Woche? (Ziel · 100 %)
          </div>
          <div style={{ display:'grid', gap: 8 }}>
            {MUSCLES.map(m => (
              <div key={m.key} style={{
                display:'flex', alignItems:'center', gap: 10,
                padding:'8px 10px', borderRadius: 10,
                background:'rgba(255,255,255,0.02)', border:'1px solid var(--line)',
              }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.label}</div>
                <input
                  type="number" inputMode="numeric" pattern="[0-9]*"
                  min={0} max={100} step={1}
                  value={draftTargets[m.key] ?? 0}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setDraftTargets(t => ({ ...t, [m.key]: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0 }));
                  }}
                  style={{
                    width: 76, padding:'8px 10px', textAlign:'center',
                    background:'#1a1a2e', border:'1px solid var(--line)', borderRadius: 8,
                    color:'#FFFFFF', WebkitTextFillColor:'#FFFFFF',
                    fontSize: 15, fontWeight: 700, fontFamily:'inherit',
                    outline:'none', caretColor:'var(--green)',
                    WebkitAppearance:'none', MozAppearance:'textfield',
                  }}
                />
                <span style={{ fontSize: 11, color:'var(--txt-3)', fontFamily:'Inter, sans-serif', minWidth: 56 }}>Sets/W</span>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ marginTop: 12, display:'flex', alignItems:'center', gap: 10, position:'relative' }}>
          <button
            onClick={onSaveGoals}
            disabled={!goalsDirty}
            style={{
              flex: 1, padding:'14px 16px',
              background: goalsDirty ? 'var(--grad)' : 'rgba(var(--accent-rgb),0.25)',
              border:'none', borderRadius: 14,
              color:'#fff', fontSize: 14, fontWeight: 700,
              cursor: goalsDirty ? 'pointer' : 'not-allowed',
              fontFamily:'inherit',
              boxShadow: goalsDirty ? '0 8px 22px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.20)' : 'none',
              transition:'all .15s',
            }}>Speichern</button>
          {toastVisible && (
            <div style={{
              position:'absolute', right: 0, bottom: 'calc(100% + 8px)',
              padding:'8px 14px', borderRadius: 999,
              background:'rgba(34,197,94,0.18)',
              border:'1px solid rgba(34,197,94,0.45)',
              color:'#22C55E', fontSize: 12, fontWeight: 700,
              fontFamily:'Inter, sans-serif', letterSpacing: 1,
              boxShadow:'0 6px 18px rgba(34,197,94,0.20)',
              whiteSpace:'nowrap',
            }}>Gespeichert ✓</div>
          )}
        </div>
      </Section>

      {/* TOAST after reset */}
      {resetToastVisible && (
        <div style={{
          position:'absolute', top: 12, left:'50%', transform:'translateX(-50%)',
          zIndex: 95,
          padding:'10px 18px', borderRadius: 999,
          background:'rgba(34,197,94,0.18)',
          border:'1px solid rgba(34,197,94,0.45)',
          color:'#22C55E', fontSize: 13, fontWeight: 700,
          fontFamily:'Inter, sans-serif', letterSpacing: 0.6,
          boxShadow:'0 8px 24px rgba(34,197,94,0.25)',
          whiteSpace:'nowrap',
        }}>Alle Daten wurden zurückgesetzt.</div>
      )}

      {/* THEME PICKER — Forest / Ocean / Rose */}
      <Section title="Theme">
        <Card padding={18}>
          <div style={{ fontSize: 12, color:'var(--txt-2)', marginBottom: 12, lineHeight: 1.45 }}>
            Wähle dein Farbschema. Wirkt sofort überall.
          </div>
          <div style={{ display:'flex', gap: 14, justifyContent:'flex-start' }}>
            {(window.GAINZ_THEME_KEYS || ['forest','ocean','rose']).map((key) => {
              const T = (window.GAINZ_THEMES || {})[key];
              if (!T) return null;
              const active = (data.palette || 'forest') === key;
              return (
                <button
                  key={key}
                  onClick={() => setData({ ...data, palette: key })}
                  aria-label={`Theme ${T.label}`}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap: 6,
                    background:'transparent', border:'none', cursor:'pointer',
                    padding: 0, fontFamily:'inherit',
                  }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 999,
                    background: `linear-gradient(135deg, rgba(${T.accentRgb},0.85) 0%, rgba(${T.accentRgb},0.55) 100%)`,
                    boxShadow: active
                      ? `0 0 0 3px rgba(255,255,255,0.92), 0 0 22px rgba(${T.accentRgb},0.55)`
                      : `0 0 16px rgba(${T.accentRgb},0.35)`,
                    transition: 'box-shadow .18s, transform .18s',
                    transform: active ? 'scale(1.04)' : 'scale(1)',
                  }}/>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: active ? 'var(--txt)' : 'var(--txt-2)',
                    fontFamily:'Inter, sans-serif',
                    textTransform:'uppercase', letterSpacing: 1,
                  }}>{T.label}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </Section>

      {/* SETTINGS — kontoseitig */}
      <Section title="Einstellungen">
        <Card padding={4}>
          {[
            { label: 'Konto', val: accountEmail },
            { label: 'Abmelden', val: '', danger: true, onClick: handleLogout },
          ].map((s, i, arr) => (
            <div key={s.label} onClick={s.onClick} style={{
              display:'flex', alignItems:'center', gap: 12,
              padding: '14px 14px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
              cursor:'pointer'
            }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: s.danger ? '#EF4444' : 'var(--txt)' }}>{s.label}</div>
              {s.val && <div style={{ fontSize: 12, color:'var(--txt-3)', fontFamily:'Inter, sans-serif' }}>{s.val}</div>}
              {!s.danger && <Icon.chevronRight size={14} color="var(--txt-3)"/>}
            </div>
          ))}
        </Card>
      </Section>

      {/* DANGER ZONE — clearly separated, bottom of screen */}
      <Section style={{ marginTop: 12, marginBottom: 28 }}>
        <div style={{
          padding: '16px',
          borderRadius: 16,
          background: 'rgba(239,68,68,0.04)',
          border: '1px dashed rgba(239,68,68,0.30)',
        }}>
          <div style={{
            fontSize: 11, color: '#EF4444',
            fontFamily:'Inter, sans-serif',
            textTransform:'uppercase', letterSpacing: 1.4, fontWeight: 700,
            marginBottom: 6,
          }}>Gefahrenzone</div>
          <div style={{ fontSize: 12, color:'var(--txt-2)', lineHeight: 1.5, marginBottom: 12 }}>
            Setzt alle Trainingsdaten, Messungen, Abzeichen und Streak unwiderruflich zurück.
          </div>
          <button onClick={() => { setResetError(null); setShowResetDialog(true); }} style={{
            width: '100%', padding: '12px 14px',
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.45)',
            borderRadius: 12,
            color: '#EF4444', fontSize: 13, fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            letterSpacing: 0.3,
          }}>Alle Daten zurücksetzen</button>
        </div>
      </Section>

      {/* RESET CONFIRMATION DIALOG */}
      {showResetDialog && (
        <div onClick={() => !resetting && setShowResetDialog(false)} style={{
          position:'absolute', inset: 0, zIndex: 90,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding: '24px',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width:'100%', maxWidth: 340,
            background:'var(--card-2)',
            border:'1px solid var(--line-2)',
            borderRadius: 22,
            padding: '22px 22px 18px',
            boxShadow:'0 30px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background:'rgba(239,68,68,0.12)',
              border:'1px solid rgba(239,68,68,0.30)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom: 14,
            }}>
              <Icon.warning size={22} color="#EF4444"/>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Wirklich zurücksetzen?</div>
            <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.55, marginBottom: 18 }}>
              Alle deine Trainingsdaten, Messungen, Abzeichen und Streak werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </div>
            {resetError && (
              <div style={{
                padding:'10px 12px', borderRadius: 10,
                background:'rgba(239,68,68,0.10)',
                border:'1px solid rgba(239,68,68,0.30)',
                color:'#EF4444', fontSize: 12, marginBottom: 12,
              }}>{resetError}</div>
            )}
            <div style={{ display:'flex', gap: 8 }}>
              <button onClick={() => setShowResetDialog(false)} disabled={resetting} style={{
                flex: 1, padding:'12px 14px',
                background:'transparent', border:'1px solid var(--line)',
                borderRadius: 12, color:'var(--txt)', fontSize: 13, fontWeight: 600,
                cursor: resetting ? 'wait' : 'pointer', fontFamily:'inherit',
              }}>Abbrechen</button>
              <button onClick={handleResetAll} disabled={resetting} style={{
                flex: 1.4, padding:'12px 14px',
                background: resetting ? 'rgba(239,68,68,0.5)' : '#EF4444',
                border:'none', borderRadius: 12,
                color:'#fff', fontSize: 13, fontWeight: 700,
                cursor: resetting ? 'wait' : 'pointer', fontFamily:'inherit',
                boxShadow:'0 8px 22px rgba(239,68,68,0.30)',
              }}>{resetting ? 'Lösche…' : 'Ja, alles löschen'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Render the reset section + dialog. Mounted via ProfileResetSection at end of ScreenProfile JSX.
// We append the section after the Einstellungen card by wrapping the existing JSX above —
// kept inline below the function so all behavior lives next to ScreenProfile state.

const stepBtn = {
  width: 40, height: 40, borderRadius: 10,
  background:'rgba(var(--accent-rgb),0.10)',
  border:'1px solid rgba(var(--accent-rgb),0.30)',
  color:'var(--green)', fontSize: 20, fontWeight: 700,
  cursor:'pointer', fontFamily:'inherit',
  display:'flex', alignItems:'center', justifyContent:'center',
};

Object.assign(window, { ScreenLeaderboard, ScreenProfile });
