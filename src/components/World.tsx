import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { RecordItem } from '../lib/debrief-model';
import { freshness, relationshipCoverage } from '../lib/game';
import { worlds, type WorldId } from '../lib/profile';

const SLOTS = [[70, 168], [160, 186], [250, 166], [336, 184], [116, 132], [292, 134], [204, 140], [30, 196]];

type Props = { world: WorldId; items: RecordItem[]; highlight?: string[]; onPick?: (item: RecordItem) => void; compact?: boolean };

/** Le territoire vivant : chaque compte est une plante / une île / un navire qui grandit avec la qualité de la relation. */
export function World({ world, items, highlight = [], onPick, compact }: Props) {
  const reduce = useReducedMotion();
  const w = worlds[world];
  const accounts = items.filter((i) => i.kind === 'account').slice(0, SLOTS.length);
  const consultants = items.filter((i) => i.kind === 'consultant' && i.data.status !== 'Sorti').slice(0, 6);
  const candidates = items.filter((i) => i.kind === 'candidate').slice(0, 6);
  const water = world !== 'garden';

  return (
    <svg viewBox="0 0 400 240" className={'world' + (compact ? ' compact' : '')} role="group" aria-label={w.title}>
      <defs>
        <linearGradient id={`sky-${world}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={w.sky[0]} />
          <stop offset="1" stopColor={w.sky[1]} />
        </linearGradient>
        <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={world === 'pirate' ? '#2f86b8' : '#3fb1ff'} />
          <stop offset="1" stopColor={world === 'pirate' ? '#164e75' : '#1677c9'} />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#sky-${world})`} />
      <motion.g animate={reduce ? {} : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} style={{ originX: '352px', originY: '42px' }}>
        {Array.from({ length: 10 }).map((_, i) => <rect key={i} x="350" y="10" width="4" height="12" rx="2" fill="#ffd34d" opacity=".7" transform={`rotate(${i * 36} 352 42)`} />)}
      </motion.g>
      <circle cx="352" cy="42" r="18" fill="#ffd34d" />
      {[0, 1, 2].map((i) => (
        <motion.g key={i} initial={{ x: -120 }} animate={reduce ? { x: 60 + i * 120 } : { x: [-120 + i * 140, 440] }} transition={{ duration: 46 + i * 12, repeat: Infinity, ease: 'linear', delay: -i * 14 }}>
          <g transform={`translate(0 ${26 + i * 22}) scale(${0.8 + (i % 2) * 0.3})`} fill="#fff" opacity=".9">
            <ellipse cx="0" cy="10" rx="22" ry="9" /><ellipse cx="14" cy="4" rx="14" ry="10" /><ellipse cx="-12" cy="6" rx="11" ry="8" />
          </g>
        </motion.g>
      ))}
      {water ? (
        <>
          <rect y="120" width="400" height="120" fill="url(#sea)" />
          {[0, 1, 2].map((i) => (
            <motion.path key={i} d={`M-40 ${132 + i * 34} q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`} stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" animate={reduce ? {} : { x: [0, 40] }} transition={{ duration: 4 + i, repeat: Infinity, ease: 'linear' }} />
          ))}
        </>
      ) : (
        <>
          <path d="M0 132 Q100 112 200 128 T400 124 V240 H0 Z" fill="#9be38f" />
          <path d="M0 150 Q120 136 220 150 T400 146 V240 H0 Z" fill={w.ground} />
          {Array.from({ length: 16 }).map((_, i) => <path key={i} d={`M${12 + i * 25} ${226 - (i % 3) * 18} l3 -7 l3 7`} stroke="#4fae5d" strokeWidth="2" fill="none" />)}
        </>
      )}

      {/* candidats : graines / bulles qui flottent */}
      {candidates.map((c, i) => (
        <motion.g key={c.id} initial={{ opacity: 0 }} animate={reduce ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }} transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}>
          <circle cx={30 + i * 22} cy={water ? 222 : 112} r="6" fill={water ? 'rgba(255,255,255,.5)' : '#c98a3d'} stroke="#fff" strokeWidth="1.5" />
          <title>{`Candidat · ${c.data.name}`}</title>
        </motion.g>
      ))}

      {accounts.map((a, i) => {
        const [x, y] = SLOTS[i];
        const stage = relationshipCoverage(items, a.data.name);
        const health = freshness(a);
        const glow = highlight.includes(a.id);
        return (
          <motion.g
            key={a.id}
            className="world-entity"
            role="button"
            tabIndex={0}
            aria-label={`${a.data.name} : relation documentée ${stage} sur 6`}
            onClick={() => onPick?.(a)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick?.(a)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.08 * i }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            style={{ originX: `${x}px`, originY: `${y}px`, cursor: onPick ? 'pointer' : 'default' }}
          >
            <AnimatePresence>
              {glow && (
                <motion.circle cx={x} cy={y - 24} r="34" fill="#fff6a8" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0.9, 0.2, 0.9], scale: [1, 1.2, 1] }} exit={{ opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity }} style={{ originX: `${x}px`, originY: `${y - 24}px` }} />
              )}
            </AnimatePresence>
            {world === 'garden' && <Plant x={x} y={y} stage={stage} health={health} reduce={!!reduce} />}
            {world === 'ocean' && <Island x={x} y={y} stage={stage} health={health} reduce={!!reduce} />}
            {world === 'pirate' && <Ship x={x} y={y} stage={stage} health={health} reduce={!!reduce} />}
            {!compact && (
              <g>
                <rect x={x - 34} y={y + 6} width="68" height="15" rx="7.5" fill="rgba(16,24,46,.72)" />
                <text x={x} y={y + 17} textAnchor="middle" fontSize="8.5" fill="#fff" fontFamily="Inter, sans-serif" fontWeight="600">{a.data.name.length > 14 ? a.data.name.slice(0, 13) + '…' : a.data.name}</text>
              </g>
            )}
          </motion.g>
        );
      })}

      {/* consultants : petits personnages qui se promènent */}
      {consultants.map((c, i) => {
        const y0 = water ? 116 : 200 + (i % 2) * 14;
        return (
          <motion.g key={c.id} animate={reduce ? { x: 40 + i * 50 } : { x: [30 + i * 40, 120 + i * 40, 30 + i * 40] }} transition={{ duration: 14 + i * 3, repeat: Infinity, ease: 'easeInOut' }}>
            <motion.g animate={reduce ? {} : { y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
              {water ? (
                <g transform={`translate(0 ${y0})`}><path d="M-10 0 h20 l-4 6 h-12 Z" fill="#8a5a3b" /><text x="0" y="-2" fontSize="12" textAnchor="middle">{c.data.avatar || '🧑‍🚀'}</text></g>
              ) : (
                <text x="0" y={y0} fontSize="16" textAnchor="middle">{c.data.avatar || '🧑‍🚀'}</text>
              )}
            </motion.g>
            <title>{`Consultant · ${c.data.name}`}</title>
          </motion.g>
        );
      })}

      {!accounts.length && (
        <text x="200" y="110" textAnchor="middle" fontSize="12" fill="#1d2440" fontFamily="Fredoka, sans-serif">Ton premier débrief fera pousser ton territoire ✨</text>
      )}
    </svg>
  );
}

function sway(reduce: boolean, health: number) {
  return reduce ? {} : { rotate: health < 0.35 ? [8, 12, 8] : [-3, 3, -3] };
}

function Plant({ x, y, stage, health, reduce }: { x: number; y: number; stage: number; health: number; reduce: boolean }) {
  const h = 10 + stage * 9;
  const leaf = health < 0.35 ? '#b5a46a' : '#3fbf6b';
  const petal = ['#ff7aa8', '#ffb03a', '#a58bff', '#ff6b5e'][Math.round(x) % 4];
  return (
    <g>
      <ellipse cx={x} cy={y} rx="16" ry="5" fill="#8a5a3b" />
      <motion.g animate={sway(reduce, health)} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: `${x}px`, originY: `${y}px` }}>
        <path d={`M${x} ${y} V${y - h}`} stroke={leaf} strokeWidth="3.5" strokeLinecap="round" />
        {stage >= 1 && <path d={`M${x} ${y - h * 0.4} q-12 -4 -14 -12 q10 0 14 8`} fill={leaf} />}
        {stage >= 2 && <path d={`M${x} ${y - h * 0.6} q12 -4 14 -12 q-10 0 -14 8`} fill={leaf} />}
        {stage >= 4 && <path d={`M${x} ${y - h * 0.8} q-10 -3 -12 -10 q9 0 12 7`} fill={leaf} />}
        {stage >= 5 ? (
          <g>
            {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx={x} cy={y - h - 7} rx="5" ry="8" fill={petal} transform={`rotate(${r} ${x} ${y - h})`} />)}
            <circle cx={x} cy={y - h} r="5" fill="#ffe06b" />
          </g>
        ) : stage >= 3 ? <circle cx={x} cy={y - h - 3} r="5" fill={petal} opacity=".85" /> : <circle cx={x} cy={y - h} r="3" fill={leaf} />}
      </motion.g>
    </g>
  );
}

function Island({ x, y, stage, health, reduce }: { x: number; y: number; stage: number; health: number; reduce: boolean }) {
  const r = 14 + stage * 3;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r + 6} ry="7" fill="rgba(255,255,255,.35)" />
      <ellipse cx={x} cy={y - 3} rx={r} ry="10" fill="#f4d58d" />
      {Array.from({ length: Math.max(1, Math.ceil(stage / 2)) }).map((_, i) => {
        const px = x - 8 + i * 9;
        return (
          <motion.g key={i} animate={reduce ? {} : { rotate: [-4, 4, -4] }} transition={{ duration: 2.6 + i * 0.4, repeat: Infinity }} style={{ originX: `${px}px`, originY: `${y - 6}px` }}>
            <path d={`M${px} ${y - 6} q2 -14 0 -${18 + stage * 2}`} stroke="#8a5a3b" strokeWidth="3" fill="none" />
            <g fill={health < 0.35 ? '#a7b07a' : '#2fbf71'}>
              <ellipse cx={px - 7} cy={y - 24 - stage * 2} rx="9" ry="3.5" transform={`rotate(-25 ${px} ${y - 24})`} />
              <ellipse cx={px + 7} cy={y - 24 - stage * 2} rx="9" ry="3.5" transform={`rotate(25 ${px} ${y - 24})`} />
            </g>
          </motion.g>
        );
      })}
      {stage >= 5 && <text x={x + r - 6} y={y - 6} fontSize="10">🏠</text>}
    </g>
  );
}

function Ship({ x, y, stage, health, reduce }: { x: number; y: number; stage: number; health: number; reduce: boolean }) {
  const sails = Math.max(1, Math.ceil(stage / 2));
  return (
    <motion.g animate={reduce ? {} : { rotate: [-3, 3, -3], y: [0, 2, 0] }} transition={{ duration: 3, repeat: Infinity }} style={{ originX: `${x}px`, originY: `${y}px` }}>
      <path d={`M${x - 22} ${y - 8} h44 l-8 12 h-28 Z`} fill="#7b4a2c" />
      {Array.from({ length: sails }).map((_, i) => {
        const mx = x - 10 + i * 10;
        return (
          <g key={i}>
            <line x1={mx} y1={y - 8} x2={mx} y2={y - 34 - stage * 1.5} stroke="#5a341f" strokeWidth="2" />
            <path d={`M${mx} ${y - 32 - stage * 1.5} q10 8 0 18 Z`} fill={health < 0.35 ? '#d8d0c0' : '#fffaf0'} />
          </g>
        );
      })}
      {stage >= 5 && <path d={`M${x - 10} ${y - 44} l10 -4 v6 Z`} fill="#ff5e5e" />}
    </motion.g>
  );
}
