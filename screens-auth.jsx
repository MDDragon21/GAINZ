// screens-auth.jsx — Email/password login + signup gate.
// No data stored in localStorage (Supabase handles secure session in its own
// internal store via persistSession). Renders standalone — no app context.

function AuthScreen() {
  const [mode, setMode]     = React.useState('login'); // 'login' | 'signup'
  const [email, setEmail]   = React.useState('');
  const [password, setPwd]  = React.useState('');
  const [name, setName]     = React.useState('');
  const [busy, setBusy]     = React.useState(false);
  const [err, setErr]       = React.useState(null);
  const [info, setInfo]     = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await window.gainzAuth.signUp(email.trim(), password, name.trim() || null);
        if (error) throw error;
        setInfo('Konto erstellt. Bitte E-Mail bestätigen, falls vom Server angefordert. Du kannst dich jetzt anmelden.');
        setMode('login');
      } else {
        const { error } = await window.gainzAuth.signIn(email.trim(), password);
        if (error) throw error;
        // useAuth listener swaps the screen automatically.
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    color: 'var(--txt)',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    marginBottom: 10,
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      background: '#061410',
    }}>
      <div style={{
        width: 360, maxWidth: '100%',
        background: 'var(--card, #143028)',
        border: '1px solid var(--line, #1f4035)',
        borderRadius: 24,
        padding: 28,
        boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="grad-text" style={{
            fontSize: 38, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1,
          }}>GAINZ</div>
          <div style={{
            fontSize: 11, color: 'var(--txt-2, #8fa89d)', marginTop: 6,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2,
            textTransform: 'uppercase',
          }}>Fitness · Tracker</div>
        </div>

        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12, border: '1px solid var(--line, #1f4035)',
          marginBottom: 18,
        }}>
          {[['login','Anmelden'], ['signup','Registrieren']].map(([k,l]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setErr(null); setInfo(null); }}
              style={{
                flex: 1, padding: '10px',
                border: 'none', borderRadius: 9,
                background: mode === k ? 'var(--card-2, #1a3a30)' : 'transparent',
                color: mode === k ? 'var(--txt, #fff)' : 'var(--txt-2, #8fa89d)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <input style={inputStyle} type="text" placeholder="Anzeigename (optional)"
              value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname"/>
          )}
          <input style={inputStyle} type="email" required placeholder="E-Mail"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"/>
          <input style={inputStyle} type="password" required placeholder="Passwort (min. 6 Zeichen)"
            value={password} onChange={(e) => setPwd(e.target.value)} minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/>

          {err && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.30)',
              color: '#EF4444', fontSize: 12, marginBottom: 10,
            }}>{err}</div>
          )}
          {info && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(61,128,104,0.10)',
              border: '1px solid rgba(61,128,104,0.30)',
              color: 'var(--green, #3d8068)', fontSize: 12, marginBottom: 10,
            }}>{info}</div>
          )}

          <button type="submit" disabled={busy} style={{
            width: '100%', padding: '14px 16px',
            border: 'none', borderRadius: 14,
            background: busy ? 'rgba(61,128,104,0.4)' : 'var(--grad, linear-gradient(135deg, #173a2e 0%, #3d8068 100%))',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 8px 22px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.20)',
          }}>{busy ? '…' : (mode === 'signup' ? 'Konto erstellen' : 'Anmelden')}</button>
        </form>

        <div style={{
          marginTop: 18, textAlign: 'center',
          fontSize: 11, color: 'var(--txt-3, #4a6b5e)',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1,
        }}>
          Daten verschlüsselt · Supabase
        </div>
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
