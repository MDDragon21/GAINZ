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

// ─── INTAKE: Tageseingabe (additiv) ────────────────────────────────────────
// Speichert SOFORT beim Antippen in public.daily_intake — unabhaengig vom
// "Speichern"-Button des Trainings. So entsteht an Ruhetagen keine leere
// Trainingssession, nur weil Kreatin abgehakt wurde.
// Rendert nichts, solange die Tabelle fehlt.
function IntakeDay({ user, goal, monday, dayIndex, onSaved }) {
  const dayDate = React.useMemo(() => {
    const d = new Date(monday); d.setDate(d.getDate() + dayIndex); return d;
  }, [monday, dayIndex]);

  // Zeigt, FUER WELCHEN TAG gerade abgehakt wird. Ohne das liest sich der
  // Block immer wie "heute", auch wenn oben ein anderer Tag gewaehlt ist —
  // und Nachtragen wirkt unmoeglich, obwohl es geht.
  const isToday = React.useMemo(() => {
    const n = new Date();
    return dayDate.getFullYear() === n.getFullYear()
        && dayDate.getMonth() === n.getMonth()
        && dayDate.getDate() === n.getDate();
  }, [dayDate]);
  const dayLabel = isToday
    ? 'heute'
    : `${['Mo','Di','Mi','Do','Fr','Sa','So'][(dayDate.getDay() + 6) % 7]}, `
      + `${dayDate.getDate()}. `
      + `${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][dayDate.getMonth()]}`;

  const [row, setRow]   = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr]   = React.useState(null);
  // Letzter Stand, der geschrieben werden soll. Ein laufender Schreibvorgang
  // blockiert neue Eingaben nicht — der zuletzt getippte Wert gewinnt und
  // wird nachgereicht, sobald der vorherige durch ist. Verhindert, dass eine
  // Eingabe still verlorengeht.
  const pendingRef = React.useRef(null);
  const inFlightRef = React.useRef(false);
  const timerRef = React.useRef(null);
  const [toastUntil, setToastUntil] = React.useState(0);
  const [, force] = React.useReducer(x => x + 1, 0);
  const toastVisible = Date.now() < toastUntil;
  React.useEffect(() => {
    if (!toastUntil) return;
    const id = setTimeout(force, Math.max(0, toastUntil - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [toastUntil]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id || !window.gainz?.intake?.available) { if (alive) setRow({ creatine:false, supplements:false, protein_g:0 }); return; }
      const r = await window.gainz.intake.get(user.id, dayDate);
      if (alive) setRow(r || { creatine:false, supplements:false, protein_g:0 });
    })();
    return () => { alive = false; };
  }, [user?.id, dayDate]);

  // Schreibt den aktuellsten Stand aus pendingRef. Laeuft schon einer,
  // wird nach dessen Ende erneut geprueft, ob inzwischen etwas Neueres da ist.
  const flush = React.useCallback(async () => {
    if (inFlightRef.current) return;
    const next = pendingRef.current;
    if (!next) return;
    pendingRef.current = null;
    inFlightRef.current = true;
    setBusy(true);
    try {
      const saved = await window.gainz.intake.set(user.id, dayDate, next);
      if (saved) {
        setErr(null);
        setToastUntil(Date.now() + 1400);
        onSaved?.();          // Wochenraster neu einfaerben
      } else if (window.gainz?.intake?.available) {
        // set() gab null zurueck, obwohl die Tabelle da ist → echter Fehler
        setErr('Konnte nicht gespeichert werden. Nochmal antippen.');
        pendingRef.current = next;   // Wert nicht verwerfen
      }
    } catch (e) {
      setErr(e?.message || 'Konnte nicht gespeichert werden.');
      pendingRef.current = next;
    } finally {
      inFlightRef.current = false;
      setBusy(false);
      if (pendingRef.current) flush();   // Nachzuegler schreiben
    }
  }, [user?.id, dayDate, onSaved]);

  // patch anwenden: sofort im UI, gespeichert entweder direkt (Toggles)
  // oder nach kurzer Ruhe (Tippen im Grammfeld).
  const save = (patch, { debounce = 0 } = {}) => {
    const next = { ...(pendingRef.current || row), ...patch };
    setRow(next);                 // optimistisch
    pendingRef.current = next;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (debounce > 0) {
      timerRef.current = setTimeout(() => { timerRef.current = null; flush(); }, debounce);
    } else {
      flush();
    }
  };

  // Offenen Wert nicht verlieren, wenn der Screen wechselt oder der Tab
  // geschlossen wird.
  React.useEffect(() => {
    const onHide = () => { if (pendingRef.current) flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) flush();
    };
  }, [flush]);

  if (!window.gainz?.intake?.available) return null;
  if (!row) return null;

  const pct = Math.max(0, Math.min(1, goal ? row.protein_g / goal : 0));
  const proteinColor = row.protein_g >= goal ? '#00A878' : 'var(--gold)';

  const Glyph = ({ children }) => (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background:'rgba(var(--accent-rgb),0.06)', border:'1px solid rgba(var(--accent-rgb),0.28)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: 12, fontWeight: 700, fontFamily:'JetBrains Mono, monospace', color:'var(--accent)',
    }}>{children}</div>
  );

  const Check = ({ on, onClick }) => (
    <button onClick={onClick} style={{
      height: 44, padding:'0 16px', display:'inline-flex', alignItems:'center', gap: 7,
      borderRadius: 12, fontSize: 13, fontWeight: 700, whiteSpace:'nowrap', cursor:'pointer',
      fontFamily:'inherit',
      background: on ? 'rgba(var(--accent-rgb),0.20)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${on ? 'rgba(var(--accent-rgb),0.50)' : 'var(--line)'}`,
      color: on ? '#00A878' : 'var(--txt-2)',
      boxShadow: on ? '0 0 18px rgba(var(--accent-bloom-rgb, var(--accent-rgb)),0.20), inset 0 1px 0 rgba(255,255,255,0.10)' : 'none',
      transition:'all .15s',
    }}>
      {on ? <Icon.check size={15} color="currentColor" stroke={2.6}/>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/></svg>}
      {on ? 'Genommen' : 'Abhaken'}
    </button>
  );

  const stepBtn = {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    background:'rgba(255,255,255,0.03)', border:'1px solid var(--line)',
    color:'var(--accent)', fontSize: 20, fontWeight: 700, cursor:'pointer', fontFamily:'inherit',
  };

  return (
    <Section style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
        <div className="label-cap">Intake · {dayLabel}</div>
        <div style={{ fontSize: 10, color:'var(--txt-3)', letterSpacing: 0.5 }}>speichert sofort</div>
      </div>
      <Card padding={16}>
        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>

          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <Glyph>KR</Glyph>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Kreatin</div>
              <div style={{ fontSize: 11, color:'var(--txt-2)', marginTop: 2 }}>
                {dayLabel} · {row.creatine ? 'genommen' : 'offen'}
              </div>
            </div>
            <Check on={!!row.creatine} onClick={() => save({ creatine: !row.creatine })}/>
          </div>

          <div style={{ height: 1, background:'var(--line)' }}/>

          <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <Glyph>SU</Glyph>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Supplements</div>
              <div style={{ fontSize: 11, color:'var(--txt-2)', marginTop: 2 }}>
                {dayLabel} · {row.supplements ? 'genommen' : 'offen'}
              </div>
            </div>
            <Check on={!!row.supplements} onClick={() => save({ supplements: !row.supplements })}/>
          </div>

          <div style={{ height: 1, background:'var(--line)' }}/>

          <div>
            <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
              <Glyph>P</Glyph>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Protein</div>
                <div style={{ fontSize: 11, color:'var(--txt-2)', marginTop: 2 }}>Ziel {goal} g · 100 % Baseline</div>
              </div>
              <div className="ticker serif" style={{ fontSize: 28, fontWeight: 600, fontStyle:'italic', color: proteinColor, lineHeight: 1 }}>
                {row.protein_g}
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 12 }}>
              <button style={stepBtn}
                onClick={() => save({ protein_g: Math.max(0, row.protein_g - 5) })}>−</button>
              <input
                type="number" inputMode="numeric" min={0} max={1000}
                value={row.protein_g}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  save({ protein_g: Number.isFinite(n) ? Math.max(0, Math.min(1000, n)) : 0 }, { debounce: 700 });
                }}
                onBlur={() => { if (pendingRef.current) flush(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                style={{
                  flex: 1, height: 44, padding:'0 12px', textAlign:'center',
                  background:'#1a1a2e', border:'1px solid var(--line)', borderRadius: 10,
                  color:'#FFFFFF', WebkitTextFillColor:'#FFFFFF',
                  fontSize: 20, fontWeight: 700, fontFamily:'inherit',
                  outline:'none', caretColor:'var(--green)',
                  WebkitAppearance:'none', MozAppearance:'textfield',
                }}/>
              <button style={stepBtn}
                onClick={() => save({ protein_g: Math.min(1000, row.protein_g + 5) })}>+</button>
              <span style={{ fontSize: 12, color:'var(--txt-2)', minWidth: 52 }}>g / Tag</span>
            </div>

            <div style={{ height: 8, borderRadius: 8, marginTop: 12, background:'rgba(255,255,255,0.05)', border:'1px solid var(--line)', overflow:'hidden' }}>
              <div style={{
                height:'100%', width: `${pct * 100}%`, borderRadius: 8,
                background: row.protein_g >= goal ? 'var(--grad)' : 'linear-gradient(90deg, var(--gold), rgba(var(--gold-rgb),0.55))',
                boxShadow:'0 0 12px rgba(var(--accent-bloom-rgb, var(--accent-rgb)),0.35)',
                transition:'width .3s ease',
              }}/>
            </div>
          </div>
        </div>
      </Card>
      {err && (
        <div style={{
          marginTop: 10, padding:'10px 12px',
          background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.30)',
          borderRadius: 10, color:'#EF4444', fontSize: 12,
        }}>{err}</div>
      )}
      {toastVisible && (
        <div style={{
          position:'absolute', right: 20, bottom:'calc(100% - 4px)',
          padding:'8px 14px', borderRadius: 999,
          background:'rgba(34,197,94,0.18)', border:'1px solid rgba(34,197,94,0.45)',
          color:'#22C55E', fontSize: 12, fontWeight: 700, letterSpacing: 1,
          boxShadow:'0 6px 18px rgba(34,197,94,0.20)', whiteSpace:'nowrap',
        }}>Gespeichert ✓</div>
      )}
    </Section>
  );
}

// ─── INTAKE: Monatsverlauf (additiv) ───────────────────────────────────────
// Gleiche Optik wie die Trainings-Monatsansicht darueber, gleicher Monat.
function IntakeMonth({ user, goal, monthDate }) {
  const [rows, setRows] = React.useState(null);

  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  React.useEffect(() => {
    let alive = true;
    setRows(null);
    (async () => {
      if (!user?.id || !window.gainz?.intake?.available) { if (alive) setRows([]); return; }
      const from = new Date(year, month, 1);
      const to   = new Date(year, month, daysInMonth);
      const r = await window.gainz.intake.range(user.id, from, to);
      if (alive) setRows(r || []);
    })();
    return () => { alive = false; };
  }, [user?.id, year, month, daysInMonth]);

  if (!window.gainz?.intake?.available) return null;
  if (rows === null) {
    return <Section><Card padding={20} style={{ textAlign:'center', color:'var(--txt-2)' }}>Lade Intake…</Card></Section>;
  }

  const byDay = {};
  rows.forEach(r => { byDay[Number(String(r.day).slice(8, 10))] = r; });

  const protein = Array.from({ length: daysInMonth }, (_, i) => Number(byDay[i + 1]?.protein_g || 0));
  const krea    = Array.from({ length: daysInMonth }, (_, i) => !!byDay[i + 1]?.creatine);
  const supp    = Array.from({ length: daysInMonth }, (_, i) => !!byDay[i + 1]?.supplements);

  const logged  = protein.filter(v => v > 0);
  const avg     = logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0;
  const kDone   = krea.filter(Boolean).length;
  const sDone   = supp.filter(Boolean).length;
  const scale   = Math.max(goal * 1.5, ...protein, 1);
  const goalPct = (goal / scale) * 100;

  if (rows.length === 0) {
    return (
      <Section>
        <div className="label-cap" style={{ marginBottom: 10 }}>Intake</div>
        <Card padding={20} style={{ textAlign:'center' }}>
          <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.55 }}>
            Für diesen Monat ist noch kein Intake eingetragen.
          </div>
        </Card>
      </Section>
    );
  }

  const dots = (arr, color) => (
    <div style={{ flex: 1, display:'flex', gap: 2 }}>
      {arr.map((on, i) => (
        <div key={i} title={`${i + 1}.`} style={{
          flex: 1, minWidth: 2, height: 10, borderRadius: 2,
          background: on ? color : 'rgba(255,255,255,0.06)',
        }}/>
      ))}
    </div>
  );

  // Wochen-Tabelle
  const weeks = [];
  for (let w = 0; w * 7 < daysInMonth; w++) {
    const from = w * 7 + 1, to = Math.min(daysInMonth, from + 6);
    let ps = 0, pn = 0, kd = 0, sd = 0;
    for (let d = from; d <= to; d++) {
      if (protein[d - 1] > 0) { ps += protein[d - 1]; pn++; }
      if (krea[d - 1]) kd++;
      if (supp[d - 1]) sd++;
    }
    weeks.push({ label: `${from}.–${to}.`, avg: pn ? Math.round(ps / pn) : 0, kd, sd, len: to - from + 1 });
  }

  const th = { fontSize: 11, color:'var(--txt-3)', letterSpacing: 1.2, textTransform:'uppercase', fontWeight: 600 };
  const grid = { display:'grid', gridTemplateColumns:'1.2fr 1fr .8fr .8fr', gap: 8 };

  return (
    <>
      <Section>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
          <div className="label-cap">Intake</div>
          <div style={{ fontSize: 11, color:'var(--txt-3)' }}>Ziel {goal} g</div>
        </div>
        <Card padding={16}>
          {/* Protein je Tag */}
          <div style={{ position:'relative', height: 64, marginBottom: 8 }}>
            <div style={{ position:'absolute', left: 0, right: 0, bottom: `${goalPct}%`, borderTop:'1px dashed var(--txt-2)', opacity: .7 }}/>
            <div style={{ display:'flex', alignItems:'flex-end', gap: 2, height:'100%' }}>
              {protein.map((v, i) => (
                <div key={i} title={v > 0 ? `${i + 1}. · ${v} g` : `${i + 1}. · keine`} style={{
                  flex: 1, minWidth: 2,
                  height: v > 0 ? `${Math.min(100, v / scale * 100)}%` : 2,
                  minHeight: v > 0 ? 3 : 2,
                  background: v === 0 ? 'rgba(255,255,255,0.05)' : (v >= goal ? '#00A878' : 'rgba(var(--accent-rgb),0.85)'),
                  borderRadius: 2,
                  boxShadow: v > 0 ? '0 0 6px rgba(var(--accent-bloom-rgb, var(--accent-rgb)),0.25)' : 'none',
                }}/>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 24, flexShrink: 0, fontSize: 9, color:'var(--txt-3)', fontFamily:'JetBrains Mono, monospace' }}>KR</div>
            {dots(krea, '#00A878')}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 24, flexShrink: 0, fontSize: 9, color:'var(--txt-3)', fontFamily:'JetBrains Mono, monospace' }}>SU</div>
            {dots(supp, 'rgba(var(--accent-rgb),0.95)')}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', fontSize: 9, color:'var(--txt-3)', letterSpacing: 0.6, marginBottom: 14 }}>
            <span>1.</span><span>{Math.ceil(daysInMonth / 2)}.</span><span>{daysInMonth}.</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, paddingTop: 12, borderTop:'1px solid var(--line)' }}>
            {[
              { label:'Ø Protein',   val: avg ? `${avg} g` : '—', col:'var(--accent)' },
              { label:'Kreatin',     val: `${Math.round(kDone / daysInMonth * 100)} %`, col:'#00A878' },
              { label:'Supplements', val: `${Math.round(sDone / daysInMonth * 100)} %`, col:'#00A878' },
            ].map(x => (
              <div key={x.label} style={{ textAlign:'center' }}>
                <div className="ticker serif" style={{ fontSize: 22, fontWeight: 600, fontStyle:'italic', color: x.col, lineHeight: 1 }}>{x.val}</div>
                <div className="label-cap" style={{ marginTop: 4 }}>{x.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section>
        <div className="label-cap" style={{ marginBottom: 10 }}>Intake · Wochen im Monat</div>
        <Card padding={16}>
          <div style={{ ...grid, paddingBottom: 9, borderBottom:'1px solid var(--line)' }}>
            <div style={th}>Woche</div>
            <div style={{ ...th, textAlign:'right' }}>Ø Protein</div>
            <div style={{ ...th, textAlign:'right' }}>Krea</div>
            <div style={{ ...th, textAlign:'right' }}>Supps</div>
          </div>
          {weeks.map(w => (
            <div key={w.label} style={{ ...grid, padding:'10px 0', borderBottom:'1px solid var(--line)' }}>
              <div style={{ fontSize: 13, color:'var(--txt-2)' }}>{w.label}</div>
              <div className="ticker" style={{ fontSize: 13, fontWeight: 700, textAlign:'right', color: w.avg >= goal ? '#00A878' : 'var(--txt)' }}>
                {w.avg ? `${w.avg} g` : '—'}
              </div>
              <div className="ticker" style={{ fontSize: 13, textAlign:'right', color: w.kd === w.len ? '#00A878' : 'var(--txt)' }}>{w.kd}/{w.len}</div>
              <div className="ticker" style={{ fontSize: 13, textAlign:'right', color: w.sd === w.len ? '#00A878' : 'var(--txt)' }}>{w.sd}/{w.len}</div>
            </div>
          ))}
          <div style={{ ...grid, paddingTop: 11 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Monat</div>
            <div className="ticker" style={{ fontSize: 13, fontWeight: 700, textAlign:'right' }}>{avg ? `Ø ${avg} g` : '—'}</div>
            <div className="ticker" style={{ fontSize: 13, fontWeight: 700, textAlign:'right', color:'#00A878' }}>{kDone}/{daysInMonth}</div>
            <div className="ticker" style={{ fontSize: 13, fontWeight: 700, textAlign:'right', color:'#00A878' }}>{sDone}/{daysInMonth}</div>
          </div>
        </Card>
      </Section>
    </>
  );
}

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

  // Intake-Status der laufenden Woche, fuer die Marker im Wochenraster.
  // Zeigt auf einen Blick, welche Tage noch Luecken haben — sonst muesste
  // man jeden Tag einzeln aufklappen, um das zu sehen.
  const [weekIntake, setWeekIntake] = React.useState({});
  const [intakeVersion, setIntakeVersion] = React.useState(0);
  const onIntakeSaved = React.useCallback(() => setIntakeVersion(v => v + 1), []);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id || !window.gainz?.intake?.available) { if (alive) setWeekIntake({}); return; }
      const end = new Date(monday); end.setDate(end.getDate() + 6);
      const rows = await window.gainz.intake.range(user.id, monday, end);
      if (!alive) return;
      const map = {};
      (rows || []).forEach(r => {
        const d = new Date(r.day + 'T12:00:00');
        map[(d.getDay() + 6) % 7] = r;
      });
      setWeekIntake(map);
    })();
    return () => { alive = false; };
  }, [user?.id, monday, intakeVersion]);

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
        // wins/hard fields removed in favor of single Notiz field.
        wins: null,
        hard: null,
      });
      // 2) Trained muscle rows
      await window.gainz.sessions.addMuscles(sess.id, trainedMuscles);
      // 3) Finalize
      await window.gainz.sessions.finish(sess.id, { duration_min: null });

      // 4) Profile: streak only.
      // week_done is derived dynamically from distinct training days
      // in the current week (see useGainzData) — never a stored counter.
      // Streak is recomputed from the full session history (consecutive
      // distinct training days ending today/yesterday) so it stays
      // accurate even after manual DB edits or backfills.
      const nextStreak = await window.gainz.sessions.computeStreak(user.id);
      console.log('[training save] computed streak', { from: data.streak, to: nextStreak });
      await window.gainz.profile.update(user.id, { streak: nextStreak });

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
      //    score += sessionSets, workouts += 1 (read existing -> upsert).
      const sessionSets = trainedMuscles.reduce((a, m) => a + Number(m.sets), 0);
      const weekStartISO = ymd(weekStart);
      console.log('[training save] leaderboard call', { userId: user.id, weekStartISO, sessionSets });
      try {
        // Get existing leaderboard row (maybeSingle — no error when absent).
        const { data: existing, error: lbReadErr } = await window.sb
          .from('leaderboard_weekly')
          .select('score, workouts')
          .eq('user_id', user.id)
          .eq('week_start', weekStartISO)
          .maybeSingle();
        if (lbReadErr) console.error('[training save] leaderboard READ error:', lbReadErr);
        console.log('[training save] leaderboard existing row:', existing);

        const newScore    = (Number(existing?.score)    || 0) + sessionSets;
        const newWorkouts = (Number(existing?.workouts) || 0) + 1;

        const { data: lbData, error: lbError } = await window.sb
          .from('leaderboard_weekly')
          .upsert({
            user_id: user.id,
            week_start: weekStartISO,
            score: newScore,
            workouts: newWorkouts,
          }, { onConflict: 'user_id,week_start' })
          .select();
        if (lbError) {
          console.error('[training save] Leaderboard error:', lbError);
          setError(`Leaderboard nicht aktualisiert: ${lbError.message || lbError.code || JSON.stringify(lbError)}`);
        } else {
          console.log('[training save] leaderboard upsert success', { newScore, newWorkouts, returned: lbData });
        }
      } catch (e) {
        console.error('[training save] leaderboard write FAILED', e);
        setError(`Leaderboard nicht aktualisiert: ${e?.message || e}`);
      }

      // 7) Reset form
      setActiveMood(null); setNote('');
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

      {tab === 'history' ? <VerlaufTab user={user} goal={data?.proteinGoal ?? 120}/> : <>

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
                display:'flex', flexDirection:'column', alignItems:'center', gap: 5,
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
                {/* Intake-Marker: voll = alle drei da, halb = teilweise,
                    leer = nichts eingetragen. Nur wenn die Tabelle existiert. */}
                {window.gainz?.intake?.available && (() => {
                  const r = weekIntake[i];
                  const n = r ? (r.creatine ? 1 : 0) + (r.supplements ? 1 : 0) + (Number(r.protein_g) > 0 ? 1 : 0) : 0;
                  const col = n === 3 ? 'var(--accent)' : n > 0 ? 'var(--gold)' : 'rgba(255,255,255,0.10)';
                  return (
                    <div title={`Intake ${n}/3`} style={{
                      width: 16, height: 3, borderRadius: 3, background: col,
                      boxShadow: n > 0 ? `0 0 6px ${n === 3 ? 'rgba(var(--accent-rgb),0.45)' : 'rgba(var(--gold-rgb),0.45)'}` : 'none',
                    }}/>
                  );
                })()}
              </div>
            );
          })}
        </div>
        {window.gainz?.intake?.available && (
          <div style={{ display:'flex', gap: 14, justifyContent:'center', marginTop: 10, flexWrap:'wrap' }}>
            {[['var(--accent)','Intake komplett'], ['var(--gold)','teilweise'], ['rgba(255,255,255,0.10)','nichts']].map(([c, l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <span style={{ width: 14, height: 3, borderRadius: 3, background: c, flexShrink: 0 }}/>
                <span style={{ fontSize: 10, color:'var(--txt-3)', letterSpacing: 0.4 }}>{l}</span>
              </div>
            ))}
          </div>
        )}
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

          {/* INTAKE — Tageseingabe, speichert sofort (additiv) */}
          <IntakeDay user={user} goal={data?.proteinGoal ?? 120} monday={monday} dayIndex={expanded} onSaved={onIntakeSaved}/>

          <Section title="Stimmung">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 6 }}>
              {MOODS.map(m => {
                const on = activeMood === m.emoji;
                return (
                  <button key={m.emoji} onClick={() => setActiveMood(on ? null : m.emoji)} style={{
                    padding: '8px 4px 10px', borderRadius: 14,
                    border: `1px solid ${on ? 'rgba(var(--accent-rgb),0.50)' : 'var(--line)'}`,
                    background: on ? 'rgba(var(--accent-rgb),0.12)' : 'rgba(255,255,255,0.02)',
                    cursor:'pointer',
                    boxShadow: on
                      ? '0 0 18px rgba(var(--accent-bloom-rgb, var(--accent-rgb)),0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : 'none',
                    transition:'all .15s',
                    display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
                    fontFamily:'inherit',
                    color: on ? 'var(--accent)' : 'var(--txt-2)',
                    minWidth: 0,
                  }} title={m.title}>
                    <div style={{ fontSize: 22, lineHeight: 1 }}>{m.emoji}</div>
                    <div style={{
                      fontSize: 9, fontWeight: 600,
                      letterSpacing: 0.4,
                      textAlign:'center', lineHeight: 1.15,
                      color: on ? 'var(--accent)' : 'var(--txt-3)',
                      whiteSpace:'normal', overflowWrap:'anywhere',
                    }}>{m.label}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Notiz zum Training">
            <Card padding={0}>
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0,300))} placeholder="Wie war's? Was ging gut, was war hart, was nimmst du mit?"
                style={{
                  width:'100%', minHeight: 90, padding: 14,
                  background: 'transparent', border: 'none', outline:'none',
                  resize:'none', color: 'var(--txt)', fontSize: 14,
                  fontFamily: 'inherit'
                }}/>
              <div style={{ padding: '0 14px 10px', textAlign:'right', fontSize: 11, color: note.length > 250 ? 'var(--gold)' : 'var(--txt-3)', fontFamily: 'Inter, sans-serif' }}>{note.length}/300</div>
            </Card>
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

// Mood catalogue — ordered worst → best.
const MOODS = [
  { emoji: '🐷', label: 'Schweinehund',     title: 'Hatte keinen Bock, aber hab’s gemacht' },
  { emoji: '😤', label: 'Durchgekämpft',    title: 'War hart, aber ich hab’s durchgezogen' },
  { emoji: '💪', label: 'Solides Training', title: 'Normaler guter Tag' },
  { emoji: '⭐', label: 'Starkes Training', title: 'Richtig gut, alles hat gepasst' },
  { emoji: '🔥', label: 'On Fire',          title: 'Absoluter Ausnahmetag' },
];

// ─── VERLAUF TAB ───────────────────────────────────────────────────────────
const MUSCLE_LABEL_DE = {
  brust: 'Brust', ruecken: 'Rücken', schultern: 'Schultern',
  bizeps: 'Bizeps', trizeps: 'Trizeps', bauch: 'Bauch', beine: 'Beine',
};

function VerlaufTab({ user, goal = 120 }) {
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

      {/* INTAKE — gleicher Monat, gleiche Optik (additiv) */}
      <IntakeMonth user={user} goal={goal} monthDate={monthDate}/>

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

            {/* Legacy wins/hard fields are still rendered for OLD sessions saved
                before the simplification — new sessions only have Notiz. */}
            {session.wins && (
              <div>
                <div className="label-cap" style={{ marginBottom: 8 }}>Was gut lief</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color:'var(--txt)' }}>{session.wins}</div>
              </div>
            )}
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
