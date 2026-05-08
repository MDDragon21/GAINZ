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
function Card({ children, style, glow, accent, onClick, padding = 16, radius = 16 }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)',
      border: `1px solid ${accent ? 'rgba(61,128,104,0.16)' : 'var(--line)'}`,
      borderRadius: radius,
      padding,
      position: 'relative',
      boxShadow: glow ? '0 0 24px rgba(61,128,104,0.06), 0 1px 0 rgba(255,255,255,0.04) inset' : '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

function ScreenHeader({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 20px 18px' }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--txt-2)', marginTop: 4 }}>{sub}</div>}
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
      border: `1px solid ${active ? 'rgba(61,128,104,0.22)' : 'var(--line)'}`,
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
    ? 'linear-gradient(135deg, #173a2e 0%, #3d8068 100%)'
    : `linear-gradient(90deg, ${color}, ${color}cc)`;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height, borderRadius: height, background: 'rgba(140,150,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%',
          background: fill,
          borderRadius: height,
          boxShadow: '0 0 12px rgba(61,128,104,0.35), 0 0 8px rgba(78,169,137,0.4)',
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
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: 1.4 }}>{title}</div>
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
      boxShadow: '0 0 32px rgba(61,128,104,0.28), 0 0 24px rgba(61,128,104,0.16), 0 8px 20px rgba(0,0,0,0.5)',
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

// Small body silhouette w/ heatmap.
// `groups` can map muscle key -> hex color (e.g. '#3d8068') OR a status keyword
// ('green'|'yellow'|'red'|'grey') which falls back to the goal-progress palette.
function BodyHeatmap({ groups, view = 'front', size = 1 }) {
  const STATUS = { green: '#22C55E', yellow: '#FFD700', red: '#EF4444', grey: 'rgba(255,255,255,0.12)' };
  const c = (k) => {
    const v = groups[k];
    if (!v) return STATUS.grey;
    if (typeof v === 'string' && v.startsWith('#')) return v;
    return STATUS[v] || STATUS.grey;
  };
  const W = 110 * size, H = 200 * size;
  return (
    <svg width={W} height={H} viewBox="0 0 110 200">
      {/* head */}
      <circle cx="55" cy="18" r="11" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
      {/* torso outline */}
      <path d="M30 38 Q35 35 45 34 L65 34 Q75 35 80 38 L82 70 Q83 90 80 110 L78 130 L76 150 L70 170 L62 195 L58 195 L56 175 L54 175 L52 195 L48 195 L40 170 L34 150 L32 130 L30 110 Q27 90 28 70 Z"
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      {/* arms */}
      <path d="M28 42 L20 80 L18 110 L22 130 L26 130 L26 110 L30 80 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>
      <path d="M82 42 L90 80 L92 110 L88 130 L84 130 L84 110 L80 80 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>
      {view === 'front' ? <>
        {/* schultern */}
        <ellipse cx="36" cy="44" rx="9" ry="5" fill={c('schultern')} opacity="0.85"/>
        <ellipse cx="74" cy="44" rx="9" ry="5" fill={c('schultern')} opacity="0.85"/>
        {/* brust */}
        <path d="M37 50 Q55 56 73 50 L70 70 Q55 76 40 70 Z" fill={c('brust')} opacity="0.85"/>
        {/* bizeps */}
        <ellipse cx="24" cy="65" rx="5" ry="11" fill={c('bizeps')} opacity="0.85"/>
        <ellipse cx="86" cy="65" rx="5" ry="11" fill={c('bizeps')} opacity="0.85"/>
        {/* bauch */}
        <rect x="44" y="76" width="22" height="32" rx="4" fill={c('bauch')} opacity="0.85"/>
        {/* beine */}
        <path d="M40 112 L36 170 L42 170 L48 112 Z" fill={c('beine')} opacity="0.85"/>
        <path d="M70 112 L74 170 L68 170 L62 112 Z" fill={c('beine')} opacity="0.85"/>
      </> : <>
        {/* rücken */}
        <path d="M37 44 Q55 40 73 44 L78 90 Q55 95 32 90 Z" fill={c('ruecken')} opacity="0.85"/>
        {/* trizeps */}
        <ellipse cx="22" cy="65" rx="5" ry="11" fill={c('trizeps')} opacity="0.85"/>
        <ellipse cx="88" cy="65" rx="5" ry="11" fill={c('trizeps')} opacity="0.85"/>
        {/* lower back / glutes */}
        <ellipse cx="46" cy="106" rx="9" ry="8" fill={c('beine')} opacity="0.7"/>
        <ellipse cx="64" cy="106" rx="9" ry="8" fill={c('beine')} opacity="0.7"/>
        {/* legs back */}
        <path d="M40 116 L36 170 L42 170 L48 116 Z" fill={c('beine')} opacity="0.85"/>
        <path d="M70 116 L74 170 L68 170 L62 116 Z" fill={c('beine')} opacity="0.85"/>
      </>}
    </svg>
  );
}

// muscle group glyph (small rounded square w/ icon initials)
function MuscleGlyph({ name, color = 'var(--green)' }) {
  const map = { Brust: 'B', Rücken: 'R', Schultern: 'S', Bizeps: 'BZ', Trizeps: 'TZ', Bauch: 'BA', Beine: 'BN' };
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: 'rgba(61,128,104,0.06)', border: '1px solid rgba(78,169,137,0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
    }}><span className="grad-text">{map[name] || name.slice(0,2).toUpperCase()}</span></div>
  );
}

Object.assign(window, {
  Icon, Card, Pill, ScreenHeader, Stepper, ProgressBar, Section, CTA, LineChart, BodyHeatmap, MuscleGlyph,
});
