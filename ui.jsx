// ui.jsx — Shared UI primitives + icon set for GAINZ
const { useState, useEffect, useRef, useMemo } = React;

// ─── ICONS ─────────────────────────────────────────────
// Stroke-style minimal SVGs. All accept size + color via props.
const ic = (paths, vb = 24) => ({ size = 22, color = 'currentColor', stroke = 1.8, fill = 'none', style }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {paths}
  </svg>
);

const Icon = {
  // nav
  dashboard: ic(<>
    <rect x="3" y="3" width="7" height="9" rx="1.5"/>
    <rect x="14" y="3" width="7" height="5" rx="1.5"/>
    <rect x="14" y="12" width="7" height="9" rx="1.5"/>
    <rect x="3" y="16" width="7" height="5" rx="1.5"/>
  </>),
  calendar: ic(<>
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 9h18M8 3v4M16 3v4"/>
    <circle cx="8" cy="14" r="0.8" fill="currentColor"/>
    <circle cx="12" cy="14" r="0.8" fill="currentColor"/>
    <circle cx="16" cy="14" r="0.8" fill="currentColor"/>
  </>),
  bolt: ic(<path d="M13 2 L4 14 h7 L10 22 l9-12 h-7 z" fill="currentColor" stroke="none"/>),
  body: ic(<>
    <circle cx="12" cy="4.5" r="2"/>
    <path d="M12 7v5M9 8.5 4 11M15 8.5 20 11M9.5 12 8 21M14.5 12 16 21"/>
  </>),
  trophy: ic(<>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/>
    <path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3"/>
    <path d="M9 13v2.5c0 1 .5 1.5 1.5 1.5h3c1 0 1.5-.5 1.5-1.5V13"/>
    <path d="M7 21h10M10 17v4M14 17v4"/>
  </>),
  user: ic(<>
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>
  </>),
  // misc
  flame: ic(<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 1-6 1-9z" fill="currentColor" stroke="none"/>),
  quote: ic(<>
    <path d="M7 7H4v6h3a2 2 0 0 0 2-2V7zM18 7h-3v6h3a2 2 0 0 0 2-2V7z"/>
  </>),
  arrowUp: ic(<path d="M5 12l7-7 7 7M12 5v15"/>),
  arrowDown: ic(<path d="M5 12l7 7 7-7M12 5v14"/>),
  plus: ic(<path d="M12 5v14M5 12h14"/>),
  minus: ic(<path d="M5 12h14"/>),
  check: ic(<path d="M4 12l5 5L20 6"/>),
  x: ic(<path d="M5 5l14 14M19 5L5 19"/>),
  warning: ic(<>
    <path d="M12 3 2 21h20L12 3z"/>
    <path d="M12 10v5M12 18v0.1"/>
  </>),
  spark: ic(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>),
  chevronRight: ic(<path d="M9 6l6 6-6 6"/>),
  chevronDown: ic(<path d="M6 9l6 6 6-6"/>),
  pause: ic(<><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/></>),
  speaker: ic(<>
    <path d="M5 9h3l5-4v14l-5-4H5z" fill="currentColor"/>
    <path d="M16 8a4 4 0 0 1 0 8M19 5a8 8 0 0 1 0 14" fill="none"/>
  </>),
  target: ic(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>),
  medal: ic(<>
    <circle cx="12" cy="14" r="6"/>
    <path d="M9 4l3 6 3-6"/>
    <path d="M12 11.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6L8.2 14.3l2.6-.4z" fill="currentColor" stroke="none"/>
  </>),
  lock: ic(<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>),
  settings: ic(<>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9 1.7 1.7 0 0 0 4.3 7.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
  </>),
  edit: ic(<path d="M3 21h4l11-11-4-4L3 17v4zM14 6l4 4"/>),
  search: ic(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>),
  bell: ic(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5h-15z"/><path d="M10 21h4"/></>),
};

// ─── PRIMITIVES ───────────────────────────────────────
function Card({ children, style, glow, gold, accent, onClick, padding = 16, radius = 18 }) {
  // `accent` kept for back-compat; `gold` opts into glass-gold variant.
  const cls = `glass${gold ? ' glass-gold' : ''}`;
  return (
    <div onClick={onClick} className={cls} style={{
      borderRadius: radius,
      padding,
      boxShadow: glow
        ? '0 0 36px rgba(var(--accent-rgb),0.22), 0 1px 0 rgba(255,255,255,0.10) inset, 0 18px 40px rgba(0,0,0,0.50)'
        : undefined,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

function ScreenHeader({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 22px 18px' }}>
      <div>
        <div className="serif" style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.0, fontStyle: 'italic' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 6, letterSpacing: 0.2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Pill({ children, color = 'var(--green)', bg, dim, style, onClick, active }) {
  const fg = dim ? 'var(--txt-2)' : color;
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
      background: bg ?? (active ? 'var(--green-soft)' : 'rgba(255,255,255,0.04)'),
      color: fg,
      border: `1px solid ${active ? 'rgba(var(--accent-rgb),0.22)' : 'var(--line)'}`,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</span>
  );
}

function Stepper({ value, onChange, min = 0, max = 99, accent = 'var(--green)' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0,
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
      borderRadius: 12, overflow: 'hidden', height: 36 }}>
      <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, value - 1)); }}
        style={btn(accent)}>–</button>
      <div className="ticker" style={{ minWidth: 32, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{value}</div>
      <button onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)); }}
        style={btn(accent)}>+</button>
    </div>
  );
}
function btn(accent) {
  return {
    width: 36, height: 36, border: 'none', background: 'transparent',
    color: accent, fontSize: 18, fontWeight: 700, cursor: 'pointer',
  };
}

function ProgressBar({ value, max, gradient = true, color, height = 8, showLabel = true }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const fill = gradient && !color
    ? 'var(--grad)'
    : `linear-gradient(90deg, ${color}, ${color}cc)`;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height, borderRadius: height, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%',
          background: fill,
          borderRadius: height,
          boxShadow: '0 0 12px rgba(var(--accent-rgb),0.35), 0 0 8px rgba(var(--accent-rgb),0.40)',
          transition: 'width .35s ease',
        }} />
      </div>
    </div>
  );
}

function Section({ title, right, children, style }) {
  return (
    <div style={{ padding: '0 20px', marginBottom: 18, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="label-cap">{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function CTA({ children, onClick, gradient = true, color, dark = '#FFFFFF', size = 'lg', icon, style }) {
  const h = size === 'lg' ? 56 : 44;
  const bg = gradient && !color
    ? 'var(--green)'
    : (color || 'var(--green)');
  return (
    <button onClick={onClick} style={{
      width: '100%', height: h,
      borderRadius: 24, border: 'none',
      background: bg,
      backgroundSize: '200% 200%',
      animation: gradient ? 'gradShift 6s ease infinite' : 'none',
      color: gradient ? '#fff' : dark,
      fontSize: size === 'lg' ? 17 : 15, fontWeight: 700, letterSpacing: 0.2,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      cursor: 'pointer',
      boxShadow: '0 0 32px rgba(var(--accent-rgb),0.30), 0 0 24px rgba(var(--accent-rgb),0.18), 0 12px 30px rgba(0,0,0,0.55)',
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

// Mini sparkline for heatmap / line charts
function LineChart({ data, color = 'var(--green)', width = 320, height = 100, fill = true, dots = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pad = 8;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [pad + i * stepX, height - pad - ((v - min) / span) * (height - pad * 2)]);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = `${path} L${points[points.length-1][0]},${height-pad} L${points[0][0]},${height-pad} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`ag-${color.replace(/[^a-z0-9]/gi,'')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#ag-${color.replace(/[^a-z0-9]/gi,'')})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {dots && points.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 4 : 2.5} fill={color} stroke="var(--bg)" strokeWidth="2" />
      ))}
    </svg>
  );
}

// Small body silhouette w/ heatmap (deep jewel tones, volumetric "wet anatomy" look).
// `groups` maps muscle key -> hex color OR status keyword ('green'|'yellow'|'red'|'grey').
function BodyHeatmap({ groups, view = 'front', size = 1 }) {
  const STATUS = {
    green:  '#006B4D', // 100%+ → deep forest emerald
    yellow: '#8C7233', // 50–99% → deep antique gold
    red:    '#5C0F0F', // <50%  → deep burgundy
    grey:   '#1F4A6E', // dormant → cool anatomical blue
  };
  const GLOW = {
    green:  'rgba(0,255,170,0.85)',
    yellow: 'rgba(230,190,90,0.75)',
    red:    'rgba(220,40,40,0.70)',
    grey:   'rgba(31,74,110,0)',
  };
  const g = (k) => {
    const v = groups[k];
    if (!v) return GLOW.grey;
    if (typeof v === 'string' && v.startsWith('#')) return 'rgba(255,255,255,0.15)';
    return GLOW[v] || GLOW.grey;
  };
  const c = (k) => {
    const v = groups[k];
    if (!v) return STATUS.grey;
    if (typeof v === 'string' && v.startsWith('#')) return v;
    return STATUS[v] || STATUS.grey;
  };
  const W = 130 * size, H = 230 * size;
  const uid = view + '-' + (Math.random()*1e6|0);
  return (
    <svg width={W} height={H} viewBox="0 0 130 230" style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.55))' }}>
      <defs>
        {['brust','ruecken','schultern','bizeps','trizeps','bauch','beine'].map((mg) => (
          <React.Fragment key={mg}>
            <radialGradient id={`m-${uid}-${mg}`} cx="50%" cy="35%" r="65%">
              <stop offset="0%"  stopColor={c(mg)} stopOpacity="1"/>
              <stop offset="55%" stopColor={c(mg)} stopOpacity="0.92"/>
              <stop offset="100%" stopColor="#000" stopOpacity="0.55"/>
            </radialGradient>
            <filter id={`gl-${uid}-${mg}`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4.2" result="b"/>
              <feFlood floodColor={g(mg).replace(/rgba\(([^)]+)\)/, 'rgb($1)').replace(/,[^,]+\)/, ')')} floodOpacity="1"/>
              <feComposite in2="b" operator="in" result="glow"/>
              <feMerge><feMergeNode in="glow"/><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </React.Fragment>
        ))}
        <linearGradient id={`skin-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1a3a5c"/>
          <stop offset="100%" stopColor="#0a1a2c"/>
        </linearGradient>
        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="rgba(120,180,230,0.45)"/>
          <stop offset="50%" stopColor="rgba(120,180,230,0)"/>
          <stop offset="100%" stopColor="rgba(120,180,230,0.35)"/>
        </linearGradient>
        <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6"/>
        </filter>
      </defs>

      {/* HEAD */}
      <ellipse cx="65" cy="20" rx="13" ry="15" fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.30)" strokeWidth="0.6"/>
      <ellipse cx="65" cy="20" rx="13" ry="15" fill={`url(#rim-${uid})`} opacity="0.6"/>
      <path d="M58 33 L58 40 Q65 43 72 40 L72 33 Z" fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.25)" strokeWidth="0.5"/>

      {/* TORSO */}
      <path d="M38 44 Q44 41 54 40 L76 40 Q86 41 92 44 L96 60 Q98 80 96 100 L94 120 L92 138 L86 158 L82 178 L78 200 L74 218 L70 222 L66 222 L65 200 Q63 200 63 200 L62 222 L58 222 L54 218 L50 200 L46 178 L42 158 L38 138 L36 120 L34 100 Q32 80 34 60 Z"
        fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.30)" strokeWidth="0.7"/>
      <path d="M38 44 Q44 41 54 40 L76 40 Q86 41 92 44 L96 60 Q98 80 96 100" fill="none" stroke="rgba(140,200,240,0.28)" strokeWidth="0.5"/>

      {/* ARMS */}
      <path d="M34 48 Q26 60 22 80 L18 110 Q17 128 22 142 L26 144 Q30 130 30 112 L34 86 Z"
        fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.30)" strokeWidth="0.6"/>
      <path d="M96 48 Q104 60 108 80 L112 110 Q113 128 108 142 L104 144 Q100 130 100 112 L96 86 Z"
        fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.30)" strokeWidth="0.6"/>
      <ellipse cx="24" cy="150" rx="4.5" ry="6" fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.25)" strokeWidth="0.5"/>
      <ellipse cx="106" cy="150" rx="4.5" ry="6" fill={`url(#skin-${uid})`} stroke="rgba(120,180,230,0.25)" strokeWidth="0.5"/>

      {view === 'front' ? <>
        {/* DELTOIDS */}
        <g>
          <path d="M36 46 Q30 52 30 64 Q34 66 42 60 Q44 52 42 46 Z" fill={`url(#m-${uid}-schultern)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M94 46 Q100 52 100 64 Q96 66 88 60 Q86 52 88 46 Z" fill={`url(#m-${uid}-schultern)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
        </g>
        {/* PECS */}
        <g>
          <path d="M44 48 Q54 50 63 52 L63 78 Q60 80 52 78 Q44 76 41 70 Q40 58 44 48 Z" fill={`url(#m-${uid}-brust)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M86 48 Q76 50 67 52 L67 78 Q70 80 78 78 Q86 76 89 70 Q90 58 86 48 Z" fill={`url(#m-${uid}-brust)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
        </g>
        {/* BICEPS */}
        <g>
          <ellipse cx="27" cy="74" rx="7.5" ry="18" fill={`url(#m-${uid}-bizeps)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
          <ellipse cx="103" cy="74" rx="7.5" ry="18" fill={`url(#m-${uid}-bizeps)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
        </g>
        <ellipse cx="22" cy="118" rx="5" ry="14" fill="rgba(120,60,60,0.35)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3"/>
        <ellipse cx="108" cy="118" rx="5" ry="14" fill="rgba(120,60,60,0.35)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3"/>
        {/* ABS */}
        <g>
          <path d="M52 82 L78 82 L78 96 L52 96 Z" fill={`url(#m-${uid}-bauch)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M52 98 L78 98 L78 112 L52 112 Z" fill={`url(#m-${uid}-bauch)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M52 114 L78 114 L78 128 L52 128 Z" fill={`url(#m-${uid}-bauch)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <line x1="65" y1="82" x2="65" y2="128" stroke="rgba(0,0,0,0.40)" strokeWidth="0.5"/>
          <path d="M44 90 L48 124 L52 124 L52 88 Z" fill={`url(#m-${uid}-bauch)`} opacity="0.55"/>
          <path d="M86 90 L82 124 L78 124 L78 88 Z" fill={`url(#m-${uid}-bauch)`} opacity="0.55"/>
        </g>
        {/* QUADS */}
        <g>
          <path d="M46 138 Q44 168 50 200 L56 218 L62 218 L63 198 L62 162 L56 138 Z" fill={`url(#m-${uid}-beine)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
          <path d="M84 138 Q86 168 80 200 L74 218 L68 218 L67 198 L68 162 L74 138 Z" fill={`url(#m-${uid}-beine)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
        </g>
        <ellipse cx="56" cy="195" rx="5" ry="3" fill="rgba(0,0,0,0.30)"/>
        <ellipse cx="74" cy="195" rx="5" ry="3" fill="rgba(0,0,0,0.30)"/>
      </> : <>
        {/* BACK */}
        <g>
          <path d="M48 44 Q55 42 65 42 Q75 42 82 44 L82 60 Q72 64 65 64 Q58 64 48 60 Z" fill={`url(#m-${uid}-ruecken)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M40 60 Q44 78 50 96 L60 100 L60 64 Q52 62 46 60 Z" fill={`url(#m-${uid}-ruecken)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M90 60 Q86 78 80 96 L70 100 L70 64 Q78 62 84 60 Z" fill={`url(#m-${uid}-ruecken)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M60 64 L60 110 L65 114 L70 110 L70 64 Z" fill={`url(#m-${uid}-ruecken)`} opacity="0.85" stroke="rgba(0,0,0,0.35)" strokeWidth="0.3"/>
          <line x1="65" y1="44" x2="65" y2="130" stroke="rgba(0,0,0,0.40)" strokeWidth="0.5"/>
        </g>
        {/* DELTS rear */}
        <g>
          <path d="M36 46 Q30 52 30 64 Q34 66 42 60 Q44 52 42 46 Z" fill={`url(#m-${uid}-schultern)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M94 46 Q100 52 100 64 Q96 66 88 60 Q86 52 88 46 Z" fill={`url(#m-${uid}-schultern)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
        </g>
        {/* TRICEPS */}
        <g>
          <ellipse cx="25" cy="74" rx="7.5" ry="18" fill={`url(#m-${uid}-trizeps)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
          <ellipse cx="105" cy="74" rx="7.5" ry="18" fill={`url(#m-${uid}-trizeps)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
        </g>
        {/* GLUTES */}
        <g>
          <path d="M48 116 Q44 130 52 142 L62 144 L64 116 Z" fill={`url(#m-${uid}-beine)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
          <path d="M82 116 Q86 130 78 142 L68 144 L66 116 Z" fill={`url(#m-${uid}-beine)`} stroke="rgba(0,0,0,0.35)" strokeWidth="0.4"/>
        </g>
        {/* HAMS + CALVES */}
        <g>
          <path d="M50 146 Q48 174 54 200 L60 218 L64 218 L64 200 L62 170 L56 146 Z" fill={`url(#m-${uid}-beine)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
          <path d="M80 146 Q82 174 76 200 L70 218 L66 218 L66 200 L68 170 L74 146 Z" fill={`url(#m-${uid}-beine)`} stroke="rgba(0,0,0,0.30)" strokeWidth="0.4"/>
          <ellipse cx="56" cy="190" rx="4.5" ry="10" fill={`url(#m-${uid}-beine)`} opacity="0.85"/>
          <ellipse cx="74" cy="190" rx="4.5" ry="10" fill={`url(#m-${uid}-beine)`} opacity="0.85"/>
        </g>
      </>}

      <path d="M38 44 Q44 41 54 40 L76 40 Q86 41 92 44 L96 60 Q98 80 96 100 L94 120 L92 138 L86 158 L82 178 L78 200 L74 218 L70 222 L66 222 L65 200 Q63 200 63 200 L62 222 L58 222 L54 218 L50 200 L46 178 L42 158 L38 138 L36 120 L34 100 Q32 80 34 60 Z"
        fill="none" stroke="rgba(140,200,240,0.20)" strokeWidth="0.6" filter={`url(#glow-${uid})`}/>
    </svg>
  );
}

// muscle group glyph (small rounded square w/ icon initials)
function MuscleGlyph({ name, color = 'var(--green)' }) {
  const map = { Brust: 'B', Rücken: 'R', Schultern: 'S', Bizeps: 'BZ', Trizeps: 'TZ', Bauch: 'BA', Beine: 'BN' };
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: 'rgba(var(--accent-rgb),0.06)', border: '1px solid rgba(var(--accent-rgb),0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
    }}><span className="grad-text">{map[name] || name.slice(0,2).toUpperCase()}</span></div>
  );
}

Object.assign(window, {
  Icon, Card, Pill, ScreenHeader, Stepper, ProgressBar, Section, CTA, LineChart, BodyHeatmap, MuscleGlyph,
});
