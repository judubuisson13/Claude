import { motion, useReducedMotion } from 'motion/react';
import type { Look } from '../lib/profile';

type Mood = 'idle' | 'talk' | 'cheer' | 'listen';

/** Personnage vectoriel paramétrable : teint, coiffure, couleur de style, accessoire. */
export function Avatar({ look, color, size = 120, mood = 'idle', level }: { look: Look; color: string; size?: number; mood?: Mood; level?: number }) {
  const reduce = useReducedMotion();
  const bob = reduce ? {} : mood === 'cheer' ? { y: [0, -14, 0], rotate: [0, -4, 4, 0] } : { y: [0, -3, 0] };
  const dur = mood === 'cheer' ? 0.7 : 3.2;
  return (
    <motion.svg viewBox="0 0 120 140" width={size} height={size * 140 / 120} role="img" aria-label="Ton personnage" animate={bob} transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }} style={{ overflow: 'visible' }}>
      <ellipse cx="60" cy="134" rx="30" ry="5" fill="rgba(0,0,0,.12)" />
      {/* corps */}
      <path d="M26 132 C26 104 40 92 60 92 C80 92 94 104 94 132 Z" fill={color} />
      <path d="M50 93 L60 106 L70 93" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="3" strokeLinecap="round" />
      {look.accessory === 'scarf' && <path d="M42 96 Q60 108 78 96 L80 102 Q60 116 40 102 Z" fill="#fff" opacity=".9" />}
      {/* bras qui saluent quand on fête */}
      <motion.g style={{ originX: '30px', originY: '104px' }} animate={mood === 'cheer' && !reduce ? { rotate: [0, -50, -30, -50, 0] } : { rotate: 0 }} transition={{ duration: 1.2, repeat: mood === 'cheer' ? Infinity : 0 }}>
        <path d="M30 104 Q20 116 22 128" stroke={color} strokeWidth="11" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="128" r="6" fill={look.skin} />
      </motion.g>
      <path d="M90 104 Q100 116 98 128" stroke={color} strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="98" cy="128" r="6" fill={look.skin} />
      {/* cou + tête */}
      <rect x="53" y="80" width="14" height="14" rx="6" fill={look.skin} />
      {look.hairStyle === 'long' && <path d="M28 52 C28 22 92 22 92 52 L94 92 Q60 100 26 92 Z" fill={look.hair} />}
      <circle cx="60" cy="54" r="30" fill={look.skin} />
      <Hair style={look.hairStyle} color={look.hair} />
      {/* yeux qui clignent */}
      <motion.g animate={reduce ? {} : { scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 1] }} style={{ originY: '56px' }}>
        <circle cx="49" cy="56" r="3.6" fill="#2a2230" />
        <circle cx="71" cy="56" r="3.6" fill="#2a2230" />
        <circle cx="50.2" cy="54.8" r="1.2" fill="#fff" />
        <circle cx="72.2" cy="54.8" r="1.2" fill="#fff" />
      </motion.g>
      <circle cx="42" cy="66" r="4.5" fill="#ff8a8a" opacity=".35" />
      <circle cx="78" cy="66" r="4.5" fill="#ff8a8a" opacity=".35" />
      {mood === 'talk' ? (
        <motion.ellipse cx="60" cy="70" rx="5" fill="#7a2f3a" animate={{ ry: [1.5, 4, 2, 4.5, 1.5] }} transition={{ duration: 0.6, repeat: Infinity }} />
      ) : (
        <path d={mood === 'cheer' ? 'M50 67 Q60 79 70 67 Z' : 'M51 68 Q60 75 69 68'} fill={mood === 'cheer' ? '#7a2f3a' : 'none'} stroke="#7a2f3a" strokeWidth="2.6" strokeLinecap="round" />
      )}
      <Accessory kind={look.accessory} color={color} />
      {level != null && (
        <g transform="translate(86 18)">
          <circle r="13" fill="#1d2440" stroke="#fff" strokeWidth="2.5" />
          <text textAnchor="middle" dy="4.5" fontSize="12" fontWeight="700" fill="#fff" fontFamily="Fredoka, sans-serif">{level}</text>
        </g>
      )}
    </motion.svg>
  );
}

function Hair({ style, color }: { style: Look['hairStyle']; color: string }) {
  switch (style) {
    case 'short': return <path d="M30 50 C30 20 90 20 90 50 C82 38 70 34 60 36 C50 34 38 38 30 50 Z" fill={color} />;
    case 'curly': return <g fill={color}>{[[34, 40], [44, 30], [56, 26], [68, 27], [80, 33], [88, 44], [30, 52], [90, 54]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="10" />)}</g>;
    case 'long': return <path d="M30 52 C30 20 90 20 90 52 C84 40 72 32 60 34 C46 32 36 40 30 52 Z" fill={color} />;
    case 'bun': return <g fill={color}><circle cx="60" cy="18" r="11" /><path d="M30 50 C30 22 90 22 90 50 C80 38 70 35 60 36 C50 35 40 38 30 50 Z" /></g>;
    default: return null;
  }
}

function Accessory({ kind, color }: { kind: Look['accessory']; color: string }) {
  switch (kind) {
    case 'glasses': return <g fill="none" stroke="#1d2440" strokeWidth="2.4"><circle cx="49" cy="56" r="8" /><circle cx="71" cy="56" r="8" /><path d="M57 56 H63" /></g>;
    case 'headset': return <g><path d="M28 56 C28 18 92 18 92 56" fill="none" stroke="#1d2440" strokeWidth="4" /><rect x="22" y="50" width="10" height="16" rx="4" fill="#1d2440" /><rect x="88" y="50" width="10" height="16" rx="4" fill="#1d2440" /><path d="M26 64 Q30 78 46 76" fill="none" stroke="#1d2440" strokeWidth="2.4" /><circle cx="47" cy="76" r="3" fill={color} /></g>;
    case 'cap': return <g><path d="M30 44 C30 18 90 18 90 44 Z" fill={color} /><path d="M60 42 L104 46 Q100 52 60 48 Z" fill={color} /><circle cx="60" cy="20" r="3" fill="#fff" /></g>;
    default: return null;
  }
}
