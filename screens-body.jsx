// screens-body.jsx — Screen 4: Körper & Fortschritt
function ScreenBody({ data, setData, embedded = false }) {
  const [showSheet, setShowSheet] = React.useState(false);
  const [newWeight, setNewWeight] = React.useState(data.weight);
  const [newHeight, setNewHeight] = React.useState(
    Number.isFinite(data.height) && data.height > 0 ? data.height : NaN
  );
  const [showTargetEdit, setShowTargetEdit] = React.useState(false);
  const [draftTarget, setDraftTarget] = React.useState(
    Number.isFinite(data.targetWeight) && data.targetWeight > 0 ? data.targetWeight : NaN
  );
  React.useEffect(() => {
    if (Number.isFinite(data.targetWeight) && data.targetWeight > 0) setDraftTarget(data.targetWeight);
  }, [data.targetWeight]);

  React.useEffect(() => {
    if (Number.isFinite(data.height) && data.height > 0) setNewHeight(data.height);
  }, [data.height]);

  const previewBmi = (Number.isFinite(newWeight) && Number.isFinite(newHeight) && newHeight > 0)
    ? +(newWeight / Math.pow(newHeight / 100, 2)).toFixed(1)
    : null;

  // Real series from Supabase only — no placeholder data.
  const weightLogs = Array.isArray(data.weightLogs) ? data.weightLogs : [];
  const hasTrend   = weightLogs.length >= 2;
  const weightSeries = weightLogs.map(l => l.weight);
  const heightForBmi = Number.isFinite(data.height) && data.height > 0 ? data.height : null;
  const bmiSeries = heightForBmi
    ? weightLogs.map(l => l.bmi != null ? l.bmi : +(l.weight / Math.pow(heightForBmi/100, 2)).toFixed(1))
    : weightLogs.map(l => l.bmi).filter(v => v != null);
  const hasBmiSeries = bmiSeries.length >= 2;
  const bmiDelta = hasBmiSeries
    ? +(bmiSeries[bmiSeries.length - 1] - bmiSeries[0]).toFixed(1)
    : null;
  // Zielgewicht (target weight) — direction auto-detected from first entry.
  const targetWeight = Number.isFinite(data.targetWeight) && data.targetWeight > 0 ? data.targetWeight : null;
  const startWeight = weightLogs.length ? weightLogs[0].weight : null;
  const currentWeight = Number.isFinite(data.weight) && data.weight > 0 ? data.weight : null;
  const goalDirection = (targetWeight && startWeight)
    ? (startWeight > targetWeight ? 'loss' : (startWeight < targetWeight ? 'gain' : 'maintain'))
    : null;
  const goalReached = (targetWeight && currentWeight && goalDirection)
    ? (goalDirection === 'loss'
        ? currentWeight <= targetWeight
        : goalDirection === 'gain'
          ? currentWeight >= targetWeight
          : Math.abs(currentWeight - targetWeight) < 0.05)
    : false;
  const goalRange = (targetWeight && startWeight) ? Math.abs(startWeight - targetWeight) : 0;
  const goalDone  = (targetWeight && currentWeight && startWeight) ? Math.abs(startWeight - currentWeight) : 0;
  const goalPct   = goalRange > 0 ? Math.max(0, Math.min(1, goalDone / goalRange)) * 100 : (goalReached ? 100 : 0);
  const goalRemaining = (targetWeight && currentWeight) ? +(currentWeight - targetWeight).toFixed(1) : null;

  // BMI label per WHO categories
  const bmiCategory = (b) => {
    if (!Number.isFinite(b) || b <= 0) return null;
    if (b < 18.5) return { label: 'Untergewicht', color: '#FFD700' };
    if (b < 25)   return { label: 'Normal',       color: '#22C55E' };
    if (b < 30)   return { label: 'Übergewicht',  color: '#FFD700' };
    return                { label: 'Adipositas',  color: '#EF4444' };
  };
  const currentBmiCat = bmiCategory(data.bmi);
  const previewBmiCat = bmiCategory(previewBmi);

  // Toast after save (message + visibility)
  const [toastMsg, setToastMsg]     = React.useState('Gespeichert ✓');
  const [toastTone, setToastTone]   = React.useState('ok'); // 'ok' | 'err'
  const [toastUntil, setToastUntil] = React.useState(0);
  const [, forceTick] = React.useReducer(x => x + 1, 0);
  const toastVisible = Date.now() < toastUntil;
  React.useEffect(() => {
    if (!toastUntil) return;
    const id = setTimeout(forceTick, Math.max(0, toastUntil - Date.now()) + 50);
    return () => clearTimeout(id);
  }, [toastUntil]);
  const showToast = (msg, tone = 'ok', ms = 2200) => {
    setToastMsg(msg);
    setToastTone(tone);
    setToastUntil(Date.now() + ms);
  };

  const lastEntryAt = weightLogs.length
    ? new Date(weightLogs[weightLogs.length - 1].logged_at)
    : null;
  const subText = lastEntryAt
    ? 'Letzte Messung: ' + lastEntryAt.toLocaleDateString('de-DE', { day:'2-digit', month:'short' }) +
      ' · ' + lastEntryAt.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' })
    : 'Noch keine Messung erfasst';

  return (
    <div data-screen-label={embedded ? undefined : "04 Körper"} style={{ position:'relative' }}>
      {toastVisible && (
        <div style={{
          position:'absolute', top: 12, left:'50%', transform:'translateX(-50%)',
          zIndex: 95,
          padding:'10px 18px', borderRadius: 999,
          background: toastTone === 'err' ? 'rgba(184,106,106,0.18)' : 'rgba(34,197,94,0.18)',
          border:  `1px solid ${toastTone === 'err' ? 'rgba(184,106,106,0.45)' : 'rgba(34,197,94,0.45)'}`,
          color:   toastTone === 'err' ? '#B86A6A' : '#22C55E',
          fontSize: 13, fontWeight: 700,
          fontFamily:'Inter, sans-serif', letterSpacing: 0.4,
          boxShadow:`0 8px 24px ${toastTone === 'err' ? 'rgba(184,106,106,0.25)' : 'rgba(34,197,94,0.25)'}`,
          maxWidth:'90%', textAlign:'center',
        }}>{toastMsg}</div>
      )}
      {!embedded && <ScreenHeader title="Körper & Fortschritt" sub={subText}/>}

      {/* CURRENT STATS */}
      <Section>
        <Card padding={18}>
          <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontFamily:'Inter, sans-serif', fontWeight: 600 }}>Gewicht</div>
              <div style={{ display:'flex', alignItems:'baseline', gap: 6, marginTop: 4 }}>
                <span className="ticker serif" style={{ fontSize: 48, fontWeight: 600, letterSpacing:-1.5, lineHeight: 1, color:'var(--accent)', fontStyle:'italic' }}>{data.weight}</span>
                <span style={{ fontSize: 16, color:'var(--txt-2)' }}>kg</span>
              </div>
              {hasTrend && data.weightDelta != null && (
                <div style={{
                  display:'flex', alignItems:'center', gap: 5, marginTop: 8,
                  fontSize: 12, fontWeight: 600,
                  color: data.weightDelta < 0 ? 'var(--green)' : (data.weightDelta > 0 ? '#EF4444' : 'var(--txt-2)')
                }}>
                  {data.weightDelta < 0
                    ? <Icon.arrowDown size={12}/>
                    : (data.weightDelta > 0 ? <Icon.arrowDown size={12} style={{ transform:'rotate(180deg)' }}/> : null)}
                  {Math.abs(data.weightDelta).toFixed(1)} kg seit letzter Messung
                </div>
              )}
            </div>
            <div style={{ borderLeft:'1px solid var(--line)', paddingLeft: 16 }}>
              <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontFamily:'Inter, sans-serif', fontWeight: 600 }}>BMI</div>
              <div style={{ display:'flex', alignItems:'baseline', gap: 6, marginTop: 4 }}>
                <span className="ticker serif" style={{ fontSize: 48, fontWeight: 600, letterSpacing:-1.5, lineHeight: 1, color:'var(--accent)', fontStyle:'italic' }}>{data.bmi}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {currentBmiCat ? (
                  <Pill color={currentBmiCat.color} active style={{ padding:'3px 8px', fontSize: 10 }}>{currentBmiCat.label}</Pill>
                ) : (
                  <span style={{ fontSize: 10, color:'var(--txt-3)', fontFamily:'Inter, sans-serif', letterSpacing: 1 }}>—</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* ZIELGEWICHT — only when set, plus inline editor */}
      <Section title="Zielgewicht" right={
        targetWeight && !showTargetEdit ? (
          <button onClick={() => { setDraftTarget(targetWeight); setShowTargetEdit(true); }}
            style={{
              border:'none', background:'transparent',
              color:'var(--green)', fontSize: 11, fontWeight: 600,
              fontFamily:'Inter, sans-serif', letterSpacing: 1,
              textTransform:'uppercase', cursor:'pointer',
            }}>Bearbeiten</button>
        ) : null
      }>
        {showTargetEdit ? (
          <Card padding={16}>
            <label style={{
              display:'block', fontSize: 11, color:'var(--txt-2)',
              fontFamily:'Inter, sans-serif',
              textTransform:'uppercase', letterSpacing: 1.4, fontWeight: 600,
              marginBottom: 8,
            }}>Zielgewicht (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              min={30}
              max={300}
              step={0.1}
              placeholder="z.B. 75.0"
              value={Number.isFinite(draftTarget) ? draftTarget : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(',', '.');
                if (raw === '') { setDraftTarget(NaN); return; }
                const n = parseFloat(raw);
                if (!Number.isNaN(n)) setDraftTarget(n);
              }}
              style={{
                width:'100%', padding:'14px 16px',
                background:'#1a1a2e', border:'1px solid var(--line)', borderRadius: 12,
                color:'#FFFFFF', WebkitTextFillColor:'#FFFFFF',
                fontSize: 18, fontWeight: 600, fontFamily:'inherit',
                outline:'none', caretColor:'var(--green)',
                WebkitAppearance:'none', MozAppearance:'textfield',
                boxSizing:'border-box',
              }}
            />
            <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowTargetEdit(false)} style={{
                flex: 1, padding:'12px',
                background:'transparent', border:'1px solid var(--line)',
                borderRadius: 12, color:'var(--txt-2)', fontSize: 13, fontWeight: 600,
                cursor:'pointer', fontFamily:'inherit',
              }}>Abbrechen</button>
              <button
                disabled={!Number.isFinite(draftTarget)}
                onClick={async () => {
                  if (!Number.isFinite(draftTarget)) return;
                  const clamped = +Math.min(300, Math.max(30, draftTarget)).toFixed(1);
                  try {
                    await setData({ ...data, targetWeight: clamped });
                    setShowTargetEdit(false);
                    showToast('Zielgewicht gespeichert ✓');
                  } catch (e) {
                    showToast('Zielgewicht konnte nicht gespeichert werden · ' + (e?.message || ''), 'err', 3500);
                  }
                }}
                style={{
                  flex: 2, padding:'12px',
                  background: Number.isFinite(draftTarget)
                    ? 'var(--grad)'
                    : 'rgba(var(--accent-rgb),0.3)',
                  border:'none', borderRadius: 12,
                  color:'#fff', fontSize: 13, fontWeight: 700,
                  cursor: Number.isFinite(draftTarget) ? 'pointer' : 'not-allowed',
                  fontFamily:'inherit',
                  boxShadow:'inset 0 1px 0 rgba(255,255,255,0.20)',
                }}>Speichern</button>
            </div>
            {targetWeight && (
              <button
                onClick={async () => {
                  try {
                    await setData({ ...data, targetWeight: null });
                    setDraftTarget(NaN);
                    setShowTargetEdit(false);
                    showToast('Zielgewicht entfernt ✓');
                  } catch (e) {
                    showToast('Konnte nicht entfernen · ' + (e?.message || ''), 'err', 3500);
                  }
                }}
                style={{
                  marginTop: 10, width:'100%', padding:'10px',
                  background:'transparent', border:'none',
                  color:'#EF4444', fontSize: 11, fontWeight: 600,
                  fontFamily:'Inter, sans-serif', letterSpacing: 1,
                  textTransform:'uppercase', cursor:'pointer',
                }}>Zielgewicht entfernen</button>
            )}
          </Card>
        ) : !targetWeight ? (
          <button onClick={() => setShowTargetEdit(true)} style={{
            width:'100%', padding:'14px 16px', borderRadius: 16,
            background:'rgba(var(--accent-rgb),0.05)',
            border:'1px dashed rgba(var(--accent-rgb),0.25)',
            color:'var(--green)', fontSize: 14, fontWeight: 600,
            display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
            cursor:'pointer', fontFamily:'inherit',
          }}>
            <Icon.plus size={18} color="var(--green)"/> Zielgewicht setzen
          </button>
        ) : (
          <Card padding={18}>
            {goalReached ? (
              <div style={{ textAlign:'center', padding:'8px 0' }}>
                <div style={{ fontSize: 38, marginBottom: 6 }}>🎯</div>
                <div className="grad-text" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  Zielgewicht erreicht!
                </div>
                <div style={{ fontSize: 12, color:'var(--txt-2)' }}>
                  {targetWeight.toFixed(1)} kg · {goalDirection === 'loss' ? 'abgenommen' : goalDirection === 'gain' ? 'aufgebaut' : 'gehalten'}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontFamily:'Inter, sans-serif', fontWeight: 600 }}>Aktuell</div>
                    <div className="ticker" style={{ fontSize: 22, fontWeight: 700 }}>
                      {currentWeight ? currentWeight.toFixed(1) : '—'} <span style={{ fontSize: 12, color:'var(--txt-2)' }}>kg</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize: 11, color:'var(--txt-2)', textTransform:'uppercase', letterSpacing:1.4, fontFamily:'Inter, sans-serif', fontWeight: 600 }}>Ziel</div>
                    <div className="ticker grad-text" style={{ fontSize: 22, fontWeight: 700 }}>
                      {targetWeight.toFixed(1)} <span style={{ fontSize: 12, WebkitTextFillColor:'var(--txt-2)' }}>kg</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar — only meaningful with ≥1 weight entry */}
                {weightLogs.length >= 1 && (
                  <>
                    <div style={{
                      position:'relative', height: 8, borderRadius: 999,
                      background:'rgba(255,255,255,0.05)',
                      border:'1px solid var(--line)',
                      overflow:'hidden',
                    }}>
                      <div style={{
                        position:'absolute', top: 0, left: 0, bottom: 0,
                        width: goalPct + '%',
                        background:'var(--grad)',
                        boxShadow:'0 0 12px rgba(var(--accent-rgb),0.45)',
                        transition:'width .3s',
                      }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6, fontSize: 10, color:'var(--txt-3)', fontFamily:'Inter, sans-serif' }}>
                      <span>Start · {startWeight ? startWeight.toFixed(1) : '—'} kg</span>
                      <span>{goalPct.toFixed(0)} %</span>
                      <span>Ziel · {targetWeight.toFixed(1)} kg</span>
                    </div>
                  </>
                )}

                {goalRemaining != null && (
                  <div style={{
                    marginTop: 12, padding:'10px 12px',
                    background:'rgba(var(--accent-rgb),0.08)',
                    border:'1px solid rgba(var(--accent-rgb),0.20)',
                    borderRadius: 10,
                    fontSize: 13, fontWeight: 600,
                    color:'var(--green)',
                    textAlign:'center',
                  }}>
                    {goalDirection === 'loss'
                      ? `Noch ${Math.abs(goalRemaining).toFixed(1)} kg bis Zielgewicht`
                      : goalDirection === 'gain'
                        ? `Noch ${Math.abs(goalRemaining).toFixed(1)} kg bis Zielgewicht`
                        : 'Halte dein Gewicht stabil'}
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </Section>

      {/* WEIGHT CHART — only with ≥ 2 real data points */}
      <Section title="Gewicht · Verlauf">
        {hasTrend ? (
          <Card padding={16}>
            <LineChart data={weightSeries} color="var(--accent)" width={310} height={120}/>
            <div style={{ marginTop: 8, fontSize: 10, color:'var(--txt-3)', fontFamily:'Inter, sans-serif', textAlign:'center' }}>
              {weightSeries.length} Messungen
            </div>
          </Card>
        ) : (
          <Card padding={20} style={{ textAlign:'center' }}>
            <div style={{ fontSize: 13, color:'var(--txt-2)', lineHeight: 1.55 }}>
              Noch zu wenig Daten — trag dein Gewicht regelmäßig ein um deinen Verlauf zu sehen.
            </div>
          </Card>
        )}
      </Section>

      {/* BMI MINI CHART — only with ≥ 2 real BMI points */}
      {hasBmiSeries && Number.isFinite(data.bmi) && data.bmi > 0 && (
        <Section title="BMI · Verlauf">
          <Card padding={14}>
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <LineChart data={bmiSeries} color="var(--accent)" width={210} height={56} dots={false}/>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="ticker" style={{ fontSize: 22, fontWeight: 700 }}>{data.bmi}</div>
                {bmiDelta != null && bmiDelta !== 0 && (
                  <div style={{ fontSize: 10, color: bmiDelta < 0 ? 'var(--green)' : '#EF4444', fontFamily:'Inter, sans-serif', textTransform:'uppercase', letterSpacing: 1 }}>
                    {bmiDelta > 0 ? '+' : ''}{bmiDelta} / {bmiSeries.length}M
                  </div>
                )}
              </div>
            </div>
          </Card>
          <div style={{ fontSize: 11, color:'var(--txt-3)', marginTop: 8, padding:'0 4px', lineHeight: 1.5 }}>
            ⓘ BMI berücksichtigt keine Muskelmasse — nur ein Richtwert.
          </div>
        </Section>
      )}

      {/* NEW MEASUREMENT BUTTON */}
      <Section>
        <button onClick={() => setShowSheet(true)} style={{
          width:'100%', padding:'14px 16px', borderRadius: 16,
          background:'rgba(var(--accent-rgb),0.05)',
          border:'1px dashed rgba(var(--accent-rgb),0.25)',
          color:'var(--accent)', fontSize: 14, fontWeight: 600,
          display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
          cursor:'pointer'
        }}>
          <Icon.plus size={18} color="var(--accent)"/> Neue Messung
        </button>
      </Section>

      {/* Meilensteine entfernt — kein Mock-Content. Wird erst gerendert, wenn echte Achievements verfügbar sind. */}

      {/* BOTTOM SHEET */}
      {showSheet && (
        <div onClick={() => setShowSheet(false)} style={{
          position:'absolute', inset: 0, zIndex: 90,
          background:'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          display:'flex', alignItems:'flex-end', justifyContent:'center'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width:'100%',
            background:'var(--card-2)',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            border:'1px solid var(--line-2)', borderBottom:'none',
            padding: '14px 22px 36px',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background:'var(--line-2)', margin:'0 auto 14px' }}/>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Neue Messung</div>
            <div style={{ fontSize: 12, color:'var(--txt-2)', marginBottom: 18 }}>{new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' })}</div>

            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 4, marginBottom: 22 }}>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                min={30}
                max={300}
                step={0.1}
                value={Number.isFinite(newWeight) ? newWeight : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(',', '.');
                  if (raw === '') { setNewWeight(NaN); return; }
                  const n = parseFloat(raw);
                  if (!Number.isNaN(n)) setNewWeight(n);
                }}
                onBlur={() => {
                  if (!Number.isFinite(newWeight)) { setNewWeight(30); return; }
                  const clamped = Math.min(300, Math.max(30, newWeight));
                  setNewWeight(+clamped.toFixed(1));
                }}
                className="ticker"
                style={{
                  width: '90%',
                  textAlign: 'center',
                  fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2,
                  color: '#FFFFFF',
                  background: '#1a1a2e',
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  outline: 'none',
                  fontFamily: 'inherit',
                  caretColor: 'var(--green)',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield',
                  padding: '14px 12px',
                  WebkitTextFillColor: '#FFFFFF',
                }}
              />
              <div style={{ fontSize: 13, color: 'var(--txt-2)', marginTop: 4 }}>Kilogramm · 30–300</div>
            </div>

            {/* HEIGHT (cm) — pre-filled from profile, saved once */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 11, color: 'var(--txt-2)',
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 600,
                marginBottom: 8,
              }}>Größe (cm)</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={100}
                max={250}
                step={1}
                placeholder="z.B. 178"
                value={Number.isFinite(newHeight) ? newHeight : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { setNewHeight(NaN); return; }
                  const n = parseInt(raw, 10);
                  if (!Number.isNaN(n)) setNewHeight(n);
                }}
                onBlur={() => {
                  if (!Number.isFinite(newHeight)) return;
                  const clamped = Math.min(250, Math.max(100, Math.round(newHeight)));
                  setNewHeight(clamped);
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#1a1a2e',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  color: '#FFFFFF',
                  WebkitTextFillColor: '#FFFFFF',
                  fontSize: 18, fontWeight: 600,
                  fontFamily: 'inherit',
                  outline: 'none',
                  caretColor: 'var(--green)',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield',
                  boxSizing: 'border-box',
                }}
              />
              {previewBmi != null && (
                <div style={{
                  marginTop: 8, fontSize: 11, color: 'var(--txt-3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  display:'flex', alignItems:'center', gap: 8,
                }}>
                  <span>BMI · <span style={{ color:'var(--txt)', fontWeight: 700 }}>{previewBmi}</span></span>
                  {previewBmiCat && (
                    <span style={{
                      padding:'2px 8px', borderRadius: 999,
                      background: previewBmiCat.color + '22',
                      border: `1px solid ${previewBmiCat.color}55`,
                      color: previewBmiCat.color, fontSize: 10, fontWeight: 700,
                      letterSpacing: 0.5, textTransform:'uppercase',
                    }}>{previewBmiCat.label}</span>
                  )}
                </div>
              )}
            </div>

            <Card padding={0} style={{ marginBottom: 16 }}>
              <input placeholder="Notiz (optional) · z.B. nach Cardio, morgens…"
                style={{
                  width:'100%', padding: 14, background:'transparent', border:'none', outline:'none',
                  color:'var(--txt)', fontSize: 13, fontFamily:'inherit'
                }}/>
            </Card>

            <CTA onClick={async () => {
              const h = Number.isFinite(newHeight) && newHeight > 0
                ? Math.min(250, Math.max(100, Math.round(newHeight)))
                : (Number.isFinite(data.height) ? data.height : null);
              const w = Number.isFinite(newWeight) ? +newWeight.toFixed(1) : data.weight;
              const bmi = (h && w) ? +(w / Math.pow(h/100, 2)).toFixed(1) : data.bmi;
              try {
                await setData({ ...data, weight: w, height: h, bmi });
                setShowSheet(false);
                showToast('Gespeichert ✓');
              } catch (e) {
                showToast('Konnte nicht speichern · ' + (e?.message || ''), 'err', 3500);
              }
            }}>Speichern</CTA>
          </div>
        </div>
      )}
    </div>
  );
}

const pickerBtn = {
  width: 56, height: 56, borderRadius: 999,
  background:'rgba(var(--accent-rgb),0.08)', border:'1px solid rgba(var(--accent-rgb),0.25)',
  color:'var(--accent)', fontSize: 26, fontWeight: 600, cursor:'pointer',
};

window.ScreenBody = ScreenBody;
