import React from 'react'

// All SVGs use viewBox="0 0 680 680", center at (340,340).
// stroke="currentColor" so each circle picks up its parent's color.
// transform-origin 340px 340px = center of the SVG.

const O = '340px 340px' // shared transform-origin shorthand

function s(dur: number, dir: 'cw' | 'ccw'): React.CSSProperties {
  return { transformOrigin: O, animation: `mc-${dir} ${dur}s linear infinite` }
}

// ── Shared rune band (24 glyphs at every 15°) ─────────────────────
function RuneBand({ r = 274, gap = 10 }: { r?: number; gap?: number }) {
  const glyphs = [
    // Each glyph: array of [x1,y1,x2,y2] line segments, at rotate(0) pointing up
    [[0,-r,0,-(r-gap)],[0,-r,-6,-(r-4)],[0,-(r-5),-6,-(r-9)]],          // 0°
    [[0,-r,0,-(r-gap)],[-4,-r,4,-(r-gap)]],                              // 15°
    [[0,-r,0,-(r-gap)],[0,-r,6,-(r-4)],[0,-(r-5),6,-(r-9)]],            // 30°
    [[-3,-r,3,-(r-gap)],[3,-r,-3,-(r-gap)]],                             // 45°
    [[0,-r,0,-(r-gap)],[0,-r,-6,-(r-4)]],                                // 60°
    [[0,-r,0,-(r-gap)],[-5,-(r-3),5,-(r-3)]],                           // 75°
    [[0,-r,0,-(r-gap)],[0,-r,6,-(r-8)],[0,-(r-8),6,-(r-16)]],          // 90°
    [[-3,-r,0,-(r-gap)],[3,-r,0,-(r-gap)]],                              // 105°
    [[0,-r,0,-(r-gap)],[-5,-r,5,-(r-gap)]],                              // 120°
    [[0,-r,0,-(r-gap)],[0,-(r-4),-5,-(r-8)],[0,-(r-4),5,-(r-8)]],     // 135°
    [[0,-r,0,-(r-gap)],[0,-r,-6,-(r-7)]],                               // 150°
    [[-4,-(r-2),4,-(r-2)],[0,-r,0,-(r-gap)]],                           // 165°
    [[0,-r,0,-(r-gap)],[0,-r,6,-(r-4)],[0,-(r-5),6,-(r-9)]],           // 180°
    [[-3,-r,3,-(r-gap)],[3,-r,-3,-(r-gap)]],                             // 195°
    [[0,-r,0,-(r-gap)],[0,-r,-6,-(r-4)],[0,-(r-5),-6,-(r-9)]],         // 210°
    [[-3,-r,0,-(r-gap)],[3,-r,0,-(r-gap)]],                              // 225°
    [[0,-r,0,-(r-gap)],[0,-r,6,-(r-4)]],                                // 240°
    [[0,-r,0,-(r-gap)],[-5,-(r-3),5,-(r-3)]],                           // 255°
    [[0,-r,0,-(r-gap)],[0,-r,-6,-(r-8)],[0,-(r-8),-6,-(r-16)]],        // 270°
    [[-3,-r,3,-(r-gap)],[3,-r,-3,-(r-gap)]],                             // 285°
    [[0,-r,0,-(r-gap)],[-5,-r,5,-(r-gap)]],                              // 300°
    [[0,-r,0,-(r-gap)],[0,-(r-4),-5,-(r-8)],[0,-(r-4),5,-(r-8)]],     // 315°
    [[0,-r,0,-(r-gap)],[0,-r,6,-(r-7)]],                                // 330°
    [[-4,-(r-2),4,-(r-2)],[0,-r,0,-(r-gap)]],                           // 345°
  ]
  return (
    <g stroke="currentColor" fill="none" strokeWidth="1" opacity="0.85" strokeLinecap="round">
      {glyphs.map((segs, i) => (
        <g key={i} transform={`rotate(${i * 15})`}>
          {segs.map((seg, j) => (
            <line key={j} x1={seg[0]} y1={seg[1]} x2={seg[2]} y2={seg[3]} />
          ))}
        </g>
      ))}
    </g>
  )
}

// ── Shared medallion ring (6 positions, each with a unique symbol) ─
function MedallionRing({ r = 240, mr = 18 }: { r?: number; mr?: number }) {
  const symbols = [
    // cross
    (cx: number, cy: number) => <>
      <line x1={cx-8} y1={cy} x2={cx+8} y2={cy} strokeWidth="1.2"/>
      <line x1={cx} y1={cy-8} x2={cx} y2={cy+8} strokeWidth="1.2"/>
    </>,
    // upward triangle
    (cx: number, cy: number) => <path d={`M${cx},${cy-6} L${cx+6},${cy+4} L${cx-6},${cy+4}Z`} strokeWidth="1.2" fill="none"/>,
    // fork / trident
    (cx: number, cy: number) => <>
      <line x1={cx} y1={cy-6} x2={cx} y2={cy+5} strokeWidth="1.2"/>
      <line x1={cx} y1={cy-6} x2={cx+5} y2={cy} strokeWidth="1.2"/>
    </>,
    // wave / S
    (cx: number, cy: number) => <path d={`M${cx-5},${cy-5} Q${cx},${cy-10} ${cx+5},${cy-5} M${cx-5},${cy+5} Q${cx},${cy+10} ${cx+5},${cy+5}`} strokeWidth="1.2" fill="none"/>,
    // dot + underline
    (cx: number, cy: number) => <>
      <circle cx={cx} cy={cy-3} r="3.5" fill="currentColor"/>
      <line x1={cx-6} y1={cy+4} x2={cx+6} y2={cy+4} strokeWidth="1.2"/>
    </>,
    // downward triangle
    (cx: number, cy: number) => <path d={`M${cx-6},${cy-4} L${cx+6},${cy-4} L${cx},${cy+6}Z`} strokeWidth="1.2" fill="none"/>,
  ]
  return (
    <g stroke="currentColor" fill="none" strokeWidth="1.2" opacity="0.9">
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const cx = r * Math.sin(rad), cy = -r * Math.cos(rad)
        return (
          <g key={deg} transform={`rotate(${deg})`}>
            <circle cx={0} cy={-r} r={mr} strokeWidth="1.2"/>
            <circle cx={0} cy={-r} r={mr * 0.67} strokeWidth="0.7" opacity="0.6"/>
            {symbols[i](0, -r)}
          </g>
        )
        void cx; void cy // suppress unused warning
      })}
    </g>
  )
}

// ── Hexagram (Star of David) at given radius ──────────────────────
function Hexagram({ r, sw = 1.8, op = 0.95 }: { r: number; sw?: number; op?: number }) {
  const p = (d: number) => `${r * Math.sin((d * Math.PI) / 180)},${-r * Math.cos((d * Math.PI) / 180)}`
  return (
    <g stroke="currentColor" fill="none" strokeWidth={sw} opacity={op}>
      <polygon points={`${p(0)} ${p(120)} ${p(240)}`}/>
      <polygon points={`${p(60)} ${p(180)} ${p(300)}`}/>
    </g>
  )
}

// ── Center Sun — full 10-layer design from reference ─────────────
function CenterSun() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Outer ring */}
      <g style={s(60, 'cw')} transform="translate(340,340)">
        <circle r="306" strokeWidth="1.5"/>
        <circle r="300" strokeWidth="0.5" opacity="0.4"/>
        <circle r="293" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6"/>
        <g strokeWidth="0.6" opacity="0.4">
          {[0,30,60,90,120,150].map(d => <line key={d} x1="0" y1="-306" x2="0" y2="306" transform={`rotate(${d})`}/>)}
        </g>
        <g strokeWidth="1.5" opacity="0.8">
          {[0,60,120,180,240,300].map(d => <line key={d} x1="0" y1="-306" x2="0" y2="-260" transform={`rotate(${d})`}/>)}
        </g>
      </g>
      {/* Rune band */}
      <g style={s(40, 'ccw')} transform="translate(340,340)">
        <circle r="278" strokeWidth="2"/>
        <circle r="270" strokeWidth="0.5" opacity="0.4"/>
        <circle r="262" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.5"/>
        <RuneBand r={274} gap={10}/>
      </g>
      {/* Mid ring 1 + medallions */}
      <g style={s(30, 'cw')} transform="translate(340,340)">
        <circle r="248" strokeWidth="1.8"/>
        <circle r="240" strokeWidth="0.6" opacity="0.5"/>
        <circle r="232" strokeWidth="0.8" strokeDasharray="5 3" opacity="0.5"/>
        <MedallionRing r={240} mr={18}/>
      </g>
      {/* Star layer 1 */}
      <g style={s(20, 'ccw')} transform="translate(340,340)">
        <circle r="218" strokeWidth="1.2"/>
        <circle r="210" strokeWidth="0.6" strokeDasharray="4 3" opacity="0.6"/>
        <Hexagram r={204} sw={1.8}/>
        <circle r="196" strokeWidth="0.8"/>
      </g>
      {/* Mid ring 2 */}
      <g style={s(25, 'cw')} transform="translate(340,340)">
        <circle r="182" strokeWidth="1.5"/>
        <circle r="174" strokeWidth="0.6" strokeDasharray="5 4" opacity="0.6"/>
        <Hexagram r={170} sw={1.3} op={0.85}/>
        <circle r="162" strokeWidth="0.7" opacity="0.6"/>
      </g>
      {/* Star layer 2 */}
      <g style={s(15, 'ccw')} transform="translate(340,340)">
        <circle r="150" strokeWidth="2"/>
        <circle r="142" strokeWidth="0.6" strokeDasharray="4 3" opacity="0.6"/>
        <Hexagram r={138} sw={2}/>
        <circle r="126" strokeWidth="1"/>
      </g>
      {/* Squares / octagram */}
      <g style={s(18, 'cw')} transform="translate(340,340)">
        <circle r="114" strokeWidth="1.2"/>
        <g strokeWidth="1.2" opacity="0.7">
          <rect x="-88" y="-88" width="176" height="176"/>
          <rect x="-88" y="-88" width="176" height="176" transform="rotate(45)"/>
        </g>
        <circle r="100" strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6"/>
        <Hexagram r={96} sw={1} op={0.6}/>
      </g>
      {/* Inner flower petals */}
      <g style={s(10, 'ccw')} transform="translate(340,340)">
        <circle r="86" strokeWidth="1.8"/>
        <circle r="78" strokeWidth="0.6" opacity="0.5"/>
        <g strokeWidth="1.5" opacity="0.9">
          {[[0,-62],[53.7,31],[-53.7,31],[0,62],[53.7,-31],[-53.7,-31]].map(([cx,cy],i) =>
            <circle key={i} cx={cx} cy={cy} r="10"/>
          )}
        </g>
        <Hexagram r={70} sw={1.5} op={0.85}/>
      </g>
      {/* Core */}
      <g style={s(7, 'cw')} transform="translate(340,340)">
        <circle r="44" strokeWidth="1.5"/>
        <circle r="36" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7"/>
        <Hexagram r={32} sw={1.8} op={0.95}/>
      </g>
      {/* Center gem */}
      <g style={s(5, 'ccw')} transform="translate(340,340)">
        <circle r="20" strokeWidth="2"/>
        <circle r="13" fill="rgba(240,234,214,0.85)" strokeWidth="1.5"/>
        <circle r="8"  fill="currentColor" opacity="0.4" stroke="none"/>
        <circle r="4"  fill="currentColor" opacity="0.85" stroke="none"/>
        <circle r="1.5" fill="white" opacity="0.9" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet A — outer ring + rune band + hexagrams (no medallions) ─
function PlanetA() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={s(55, 'cw')} transform="translate(340,340)">
        <circle r="306" strokeWidth="1.5"/>
        <circle r="293" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6"/>
        <g strokeWidth="1.5" opacity="0.8">
          {[0,60,120,180,240,300].map(d => <line key={d} x1="0" y1="-306" x2="0" y2="-268" transform={`rotate(${d})`}/>)}
        </g>
      </g>
      <g style={s(38, 'ccw')} transform="translate(340,340)">
        <circle r="278" strokeWidth="2"/>
        <circle r="262" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.5"/>
        <RuneBand r={274} gap={10}/>
      </g>
      <g style={s(22, 'cw')} transform="translate(340,340)">
        <circle r="218" strokeWidth="1.2"/>
        <Hexagram r={204} sw={1.8}/>
        <circle r="196" strokeWidth="0.8"/>
      </g>
      <g style={s(14, 'ccw')} transform="translate(340,340)">
        <circle r="150" strokeWidth="2"/>
        <Hexagram r={138} sw={2}/>
        <circle r="126" strokeWidth="1"/>
      </g>
      <g style={s(8, 'cw')} transform="translate(340,340)">
        <circle r="86" strokeWidth="1.8"/>
        <Hexagram r={70} sw={1.5} op={0.85}/>
      </g>
      <g style={s(5, 'ccw')} transform="translate(340,340)">
        <circle r="44" strokeWidth="1.5"/>
        <circle r="36" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7"/>
        <Hexagram r={32} sw={1.8}/>
      </g>
      <g style={s(4, 'cw')} transform="translate(340,340)">
        <circle r="20" strokeWidth="2"/>
        <circle r="8" fill="currentColor" opacity="0.4" stroke="none"/>
        <circle r="4" fill="currentColor" opacity="0.85" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet B — mid rings + medallions + squares ───────────────────
function PlanetB() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={s(65, 'ccw')} transform="translate(340,340)">
        <circle r="306" strokeWidth="1.5"/>
        <circle r="293" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5"/>
      </g>
      <g style={s(32, 'cw')} transform="translate(340,340)">
        <circle r="248" strokeWidth="1.8"/>
        <circle r="232" strokeWidth="0.8" strokeDasharray="5 3" opacity="0.5"/>
        <MedallionRing r={240} mr={18}/>
      </g>
      <g style={s(20, 'ccw')} transform="translate(340,340)">
        <circle r="182" strokeWidth="1.5"/>
        <Hexagram r={170} sw={1.5} op={0.9}/>
        <circle r="162" strokeWidth="0.7" opacity="0.6"/>
      </g>
      <g style={s(16, 'cw')} transform="translate(340,340)">
        <circle r="114" strokeWidth="1.2"/>
        <g strokeWidth="1.2" opacity="0.7">
          <rect x="-88" y="-88" width="176" height="176"/>
          <rect x="-88" y="-88" width="176" height="176" transform="rotate(45)"/>
        </g>
        <circle r="100" strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6"/>
      </g>
      <g style={s(8, 'ccw')} transform="translate(340,340)">
        <circle r="44" strokeWidth="1.5"/>
        <Hexagram r={32} sw={1.8}/>
      </g>
      <g style={s(4, 'cw')} transform="translate(340,340)">
        <circle r="20" strokeWidth="2"/>
        <circle r="8" fill="currentColor" opacity="0.4" stroke="none"/>
        <circle r="4" fill="currentColor" opacity="0.85" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet C — flower petals + star layers only ───────────────────
function PlanetC() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={s(70, 'cw')} transform="translate(340,340)">
        <circle r="306" strokeWidth="1.5"/>
        <g strokeWidth="0.6" opacity="0.4">
          {[0,30,60,90,120,150].map(d => <line key={d} x1="0" y1="-306" x2="0" y2="306" transform={`rotate(${d})`}/>)}
        </g>
      </g>
      <g style={s(28, 'ccw')} transform="translate(340,340)">
        <circle r="218" strokeWidth="1.2"/>
        <Hexagram r={204} sw={1.8}/>
        <circle r="196" strokeWidth="0.8"/>
      </g>
      <g style={s(18, 'cw')} transform="translate(340,340)">
        <circle r="150" strokeWidth="2"/>
        <Hexagram r={138} sw={2}/>
      </g>
      <g style={s(11, 'ccw')} transform="translate(340,340)">
        <circle r="86" strokeWidth="1.8"/>
        <circle r="78" strokeWidth="0.6" opacity="0.5"/>
        <g strokeWidth="1.5" opacity="0.9">
          {[[0,-62],[53.7,31],[-53.7,31],[0,62],[53.7,-31],[-53.7,-31]].map(([cx,cy],i) =>
            <circle key={i} cx={cx} cy={cy} r="10"/>
          )}
        </g>
        <Hexagram r={70} sw={1.5} op={0.85}/>
      </g>
      <g style={s(6, 'cw')} transform="translate(340,340)">
        <circle r="44" strokeWidth="1.5"/>
        <Hexagram r={32} sw={1.8}/>
      </g>
      <g style={s(3, 'ccw')} transform="translate(340,340)">
        <circle r="20" strokeWidth="2"/>
        <circle r="8" fill="currentColor" opacity="0.4" stroke="none"/>
        <circle r="4" fill="currentColor" opacity="0.85" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet D — octagram focus + rune ring ─────────────────────────
function PlanetD() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={s(60, 'ccw')} transform="translate(340,340)">
        <circle r="306" strokeWidth="1.5"/>
        <circle r="293" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6"/>
        <g strokeWidth="1.5" opacity="0.8">
          {[0,60,120,180,240,300].map(d => <line key={d} x1="0" y1="-306" x2="0" y2="-268" transform={`rotate(${d})`}/>)}
        </g>
      </g>
      <g style={s(35, 'cw')} transform="translate(340,340)">
        <circle r="278" strokeWidth="2"/>
        <circle r="262" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.5"/>
        <RuneBand r={274} gap={10}/>
      </g>
      <g style={s(17, 'ccw')} transform="translate(340,340)">
        <circle r="114" strokeWidth="1.2"/>
        <g strokeWidth="1.4" opacity="0.75">
          <rect x="-88" y="-88" width="176" height="176"/>
          <rect x="-88" y="-88" width="176" height="176" transform="rotate(45)"/>
        </g>
        <circle r="100" strokeWidth="0.7" strokeDasharray="4 3" opacity="0.6"/>
        <Hexagram r={96} sw={1} op={0.65}/>
      </g>
      <g style={s(9, 'cw')} transform="translate(340,340)">
        <circle r="86" strokeWidth="1.8"/>
        <Hexagram r={70} sw={1.5} op={0.85}/>
      </g>
      <g style={s(5, 'ccw')} transform="translate(340,340)">
        <circle r="44" strokeWidth="1.5"/>
        <circle r="36" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7"/>
        <Hexagram r={32} sw={1.8}/>
      </g>
      <g style={s(3, 'cw')} transform="translate(340,340)">
        <circle r="20" strokeWidth="2"/>
        <circle r="8" fill="currentColor" opacity="0.4" stroke="none"/>
        <circle r="4" fill="currentColor" opacity="0.85" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet E — medallions + full star stack ───────────────────────
function PlanetE() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={s(50, 'cw')} transform="translate(340,340)">
        <circle r="306" strokeWidth="1.5"/>
        <circle r="293" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.6"/>
      </g>
      <g style={s(30, 'ccw')} transform="translate(340,340)">
        <circle r="248" strokeWidth="1.8"/>
        <circle r="232" strokeWidth="0.8" strokeDasharray="5 3" opacity="0.5"/>
        <MedallionRing r={240} mr={18}/>
      </g>
      <g style={s(22, 'cw')} transform="translate(340,340)">
        <circle r="218" strokeWidth="1.2"/>
        <Hexagram r={204} sw={1.8}/>
        <circle r="196" strokeWidth="0.8"/>
      </g>
      <g style={s(13, 'ccw')} transform="translate(340,340)">
        <circle r="150" strokeWidth="2"/>
        <Hexagram r={138} sw={2}/>
        <circle r="126" strokeWidth="1"/>
      </g>
      <g style={s(7, 'cw')} transform="translate(340,340)">
        <circle r="44" strokeWidth="1.5"/>
        <circle r="36" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.7"/>
        <Hexagram r={32} sw={1.8}/>
      </g>
      <g style={s(4, 'ccw')} transform="translate(340,340)">
        <circle r="20" strokeWidth="2"/>
        <circle r="13" fill="rgba(240,234,214,0.85)" strokeWidth="1.5"/>
        <circle r="8"  fill="currentColor" opacity="0.4" stroke="none"/>
        <circle r="4"  fill="currentColor" opacity="0.85" stroke="none"/>
        <circle r="1.5" fill="white" opacity="0.9" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Orbit config ──────────────────────────────────────────────────

interface Planet {
  orbitR: number; size: number; period: number
  startAngle: number; dir: 'cw' | 'ccw'
  color: string; opacity: number
  Component: React.FC
}

const ORBIT_RADII = [185, 310, 450]

const PLANETS: Planet[] = [
  { orbitR: 185, size: 180, period: 22, startAngle: 50,  dir: 'cw',  color: '#5a1a8a', opacity: 0.88, Component: PlanetA },
  { orbitR: 310, size: 160, period: 38, startAngle: 140, dir: 'ccw', color: '#0a6878', opacity: 0.85, Component: PlanetB },
  { orbitR: 310, size: 155, period: 38, startAngle: 310, dir: 'ccw', color: '#8a1848', opacity: 0.85, Component: PlanetC },
  { orbitR: 450, size: 140, period: 62, startAngle: 80,  dir: 'cw',  color: '#1a6838', opacity: 0.82, Component: PlanetD },
  { orbitR: 450, size: 130, period: 62, startAngle: 250, dir: 'cw',  color: '#1a3888', opacity: 0.80, Component: PlanetE },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2, borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.18)',
        }} />
      ))}

      {/* Center Sun */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300, height: 300, color: '#c8900a', opacity: 0.88,
      }}>
        <CenterSun />
      </div>

      {PLANETS.map((p, i) => {
        const delay = -((p.startAngle / 360) * p.period)
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 0, height: 0,
            animation: `mc-${p.dir} ${p.period}s linear infinite`,
            animationDelay: `${delay}s`,
            transformOrigin: '0 0',
          }}>
            <div style={{
              position: 'absolute',
              left: p.orbitR - p.size / 2, top: -p.size / 2,
              width: p.size, height: p.size,
              color: p.color, opacity: p.opacity,
              animation: `mc-${p.dir === 'cw' ? 'ccw' : 'cw'} ${p.period}s linear infinite`,
              animationDelay: `${delay}s`,
              transformOrigin: 'center',
            }}>
              <p.Component />
            </div>
          </div>
        )
      })}
    </div>
  )
}
