import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { RecordItem } from '../lib/debrief-model';
import { freshness, relationshipCoverage } from '../lib/game';
import { worlds, type WorldId } from '../lib/profile';

const SLOTS = [[70, 168], [160, 186], [250, 166], [336, 184], [116, 132], [292, 134], [204, 140], [30, 200], [372, 140], [206, 212]];

/** Parcelles du périmètre : il s'agrandit avec le niveau (3 au départ, jusqu'à 10). */
export const plotsForLevel = (level: number) => Math.min(SLOTS.length, 3 + Math.floor(level / 3));

/** Décors débloqués par niveau : le territoire se construit au fil des débriefs. */
export const UNLOCKS: Record<WorldId, { level: number; label: string }[]> = {
  garden: [{ level: 3, label: 'Clôture' }, { level: 6, label: 'Mare' }, { level: 9, label: 'Cabane' }, { level: 13, label: 'Moulin' }, { level: 18, label: 'Serre' }],
  ocean: [{ level: 3, label: 'Bouée' }, { level: 6, label: 'Ponton' }, { level: 9, label: 'Phare' }, { level: 13, label: 'Voilier' }, { level: 18, label: 'Station' }],
  pirate: [{ level: 3, label: 'Drapeau' }, { level: 6, label: 'Coffre' }, { level: 9, label: 'Fort' }, { level: 13, label: 'Galion' }, { level: 18, label: 'Port' }],
};

type Props = {
  world: WorldId;
  items: RecordItem[];
  level?: number;
  /** Fiches AVANT le débrief : chaque compte pousse alors de son ancien stade vers le nouveau. */
  growFrom?: RecordItem[];
  levelFrom?: number;
  delay?: number;
  highlight?: string[];
  onPick?: (item: RecordItem) => void;
  compact?: boolean;
};

export function World({ world, items, level = 1, growFrom, levelFrom, delay = 0, highlight = [], onPick, compact }: Props) {
  const reduce = useReducedMotion();
  const w = worlds[world];
  const plots = plotsForLevel(level);
  const accounts = items.filter((i) => i.kind === 'account').slice(0, SLOTS.length);
  const consultants = items.filter((i) => i.kind === 'consultant' && i.data.status !== 'Sorti').slice(0, 6);
  const candidates = items.filter((i) => i.kind === 'candidate').slice(0, 8);
  const water = world !== 'garden';
  const before = growFrom ? new Map(growFrom.filter((i) => i.kind === 'account').map((a) => [a.id, relationshipCoverage(growFrom, a.data.name)])) : null;
  const prevPlots = growFrom ? plotsForLevel(levelFrom ?? level) : plots;

  return (
    <svg viewBox="0 0 400 240" className={'world' + (compact ? ' compact' : '')} role="group" aria-label={w.title}>
      <defs>
        <linearGradient id={`sky-${world}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={w.sky[0]} /><stop offset="1" stopColor={w.sky[1]} /></linearGradient>
        <linearGradient id={`sea-${world}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={world === 'pirate' ? '#2f86b8' : '#3fb1ff'} /><stop offset="1" stopColor={world === 'pirate' ? '#164e75' : '#1677c9'} /></linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#sky-${world})`} />
      <motion.g animate={reduce ? {} : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} style={{ originX: '352px', originY: '42px' }}>
        {Array.from({ length: 10 }).map((_, i) => <rect key={i} x="350" y="10" width="4" height="12" rx="2" fill="#ffd34d" opacity=".7" transform={`rotate(${i * 36} 352 42)`} />)}
      </motion.g>
      <circle cx="352" cy="42" r="18" fill="#ffd34d" />
      {[0, 1, 2].map((i) => (
        <motion.g key={i} initial={{ x: -120 }} animate={reduce ? { x: 60 + i * 120 } : { x: [-120 + i * 140, 440] }} transition={{ duration: 46 + i * 12, repeat: Infinity, ease: 'linear', delay: -i * 14 }}>
          <g transform={`translate(0 ${26 + i * 22}) scale(${0.8 + (i % 2) * 0.3})`} fill="#fff" opacity=".9"><ellipse cx="0" cy="10" rx="22" ry="9" /><ellipse cx="14" cy="4" rx="14" ry="10" /><ellipse cx="-12" cy="6" rx="11" ry="8" /></g>
        </motion.g>
      ))}
      {water ? (
        <>
          <rect y="120" width="400" height="120" fill={`url(#sea-${world})`} />
          {[0, 1, 2].map((i) => <motion.path key={i} d={`M-40 ${132 + i * 34} q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`} stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" animate={reduce ? {} : { x: [0, 40] }} transition={{ duration: 4 + i, repeat: Infinity, ease: 'linear' }} />)}
        </>
      ) : (
        <>
          <path d="M0 132 Q100 112 200 128 T400 124 V240 H0 Z" fill="#9be38f" />
          <path d="M0 150 Q120 136 220 150 T400 146 V240 H0 Z" fill={w.ground} />
          {Array.from({ length: 16 }).map((_, i) => <path key={i} d={`M${12 + i * 25} ${226 - (i % 3) * 18} l3 -7 l3 7`} stroke="#4fae5d" strokeWidth="2" fill="none" />)}
        </>
      )}

      <Decor world={world} level={level} levelFrom={growFrom ? levelFrom ?? level : level} delay={delay} reduce={!!reduce} />

      {/* Parcelles libres du périmètre : de la place pour de nouveaux comptes */}
      {SLOTS.slice(accounts.length, plots).map(([x, y], k) => {
        const i = accounts.length + k;
        const isNew = growFrom && i >= prevPlots;
        return (
          <motion.g key={'plot' + i} initial={isNew ? { scale: 0, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ delay: delay + 1.6, type: 'spring' }} style={{ originX: `${x}px`, originY: `${y}px` }}>
            <ellipse cx={x} cy={y} rx="16" ry="5" fill="none" stroke={water ? 'rgba(255,255,255,.55)' : 'rgba(80,60,40,.45)'} strokeDasharray="3 3" strokeWidth="1.5" />
            <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fill={water ? '#fff' : '#5a4632'} opacity=".7">+</text>
            {isNew && <text x={x} y={y - 10} textAnchor="middle" fontSize="7" fontWeight="700" fill="#1d2440">nouvelle parcelle</text>}
          </motion.g>
        );
      })}

      {candidates.map((c, i) => (
        <motion.g key={c.id} initial={{ opacity: 0 }} animate={reduce ? { opacity: 1 } : { opacity: 1, y: [0, -6, 0] }} transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}>
          <circle cx={30 + i * 20} cy={water ? 224 : 112} r="5.5" fill={water ? 'rgba(255,255,255,.5)' : '#c98a3d'} stroke="#fff" strokeWidth="1.5" />
          <title>{`Vivier · ${c.data.name}`}</title>
        </motion.g>
      ))}

      {accounts.map((a, i) => {
        const [x, y] = SLOTS[i];
        const stage = relationshipCoverage(items, a.data.name);
        const prev = before ? (before.has(a.id) ? before.get(a.id)! : -1) : stage;
        const grew = prev < stage;
        const health = freshness(a);
        const glow = highlight.includes(a.id) || (before && grew);
        const size = (s: number) => 10 + Math.max(0, s) * 9;
        const from = prev < 0 ? 0 : size(prev) / size(stage);
        const d = delay + 0.6 + i * 0.25;
        return (
          <g key={a.id} className="world-entity" role="button" tabIndex={0} aria-label={`${a.data.name} : relation documentée ${stage} sur 6`} onClick={() => onPick?.(a)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick?.(a)} style={{ cursor: onPick ? 'pointer' : 'default' }}>
            <AnimatePresence>
              {glow && <motion.circle cx={x} cy={y - 24} r="34" fill="#fff6a8" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.3, 0.9] }} transition={{ duration: 1.6, delay: d, repeat: Infinity, repeatType: 'reverse' }} />}
            </AnimatePresence>
            <motion.g
              initial={growFrom ? { scale: from, opacity: prev < 0 ? 0 : 1 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={growFrom ? { delay: d, type: 'spring', stiffness: 120, damping: 9 } : { type: 'spring', stiffness: 260, damping: 18, delay: 0.08 * i }}
              whileHover={onPick ? { scale: 1.08 } : undefined}
              style={{ originX: `${x}px`, originY: `${y}px` }}
            >
              {world === 'garden' && <Plant x={x} y={y} stage={stage} health={health} reduce={!!reduce} />}
              {world === 'ocean' && <Island x={x} y={y} stage={stage} health={health} reduce={!!reduce} />}
              {world === 'pirate' && <Ship x={x} y={y} stage={stage} health={health} reduce={!!reduce} />}
            </motion.g>
            {before && grew && (
              <motion.g initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 0], y: -26 }} transition={{ delay: d + 0.2, duration: 2.6 }}>
                <rect x={x - 17} y={y - 66} width="34" height="15" rx="7.5" fill="#1fae6b" />
                <text x={x} y={y - 55} textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">{prev < 0 ? 'NEW' : `+${stage - prev}`}</text>
              </motion.g>
            )}
            {!compact && (
              <g>
                <rect x={x - 34} y={y + 6} width="68" height="15" rx="7.5" fill="rgba(16,24,46,.72)" />
                <text x={x} y={y + 17} textAnchor="middle" fontSize="8.5" fill="#fff" fontFamily="Inter, sans-serif" fontWeight="600">{a.data.name.length > 14 ? a.data.name.slice(0, 13) + '…' : a.data.name}</text>
              </g>
            )}
          </g>
        );
      })}

      {consultants.map((c, i) => {
        const y0 = water ? 116 : 204 + (i % 2) * 12;
        return (
          <motion.g key={c.id} animate={reduce ? { x: 40 + i * 50 } : { x: [30 + i * 40, 120 + i * 40, 30 + i * 40] }} transition={{ duration: 14 + i * 3, repeat: Infinity, ease: 'easeInOut' }}>
            <motion.g animate={reduce ? {} : { y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
              {water ? <g transform={`translate(0 ${y0})`}><path d="M-10 0 h20 l-4 6 h-12 Z" fill="#8a5a3b" /><text x="0" y="-2" fontSize="12" textAnchor="middle">{c.data.avatar || '🧑‍🚀'}</text></g> : <text x="0" y={y0} fontSize="16" textAnchor="middle">{c.data.avatar || '🧑‍🚀'}</text>}
            </motion.g>
            <title>{`Consultant · ${c.data.name}`}</title>
          </motion.g>
        );
      })}

      {!accounts.length && <text x="200" y="110" textAnchor="middle" fontSize="12" fill="#1d2440" fontFamily="Fredoka, sans-serif">Ton premier débrief fera pousser ton territoire ✨</text>}
    </svg>
  );
}

function Decor({ world, level, levelFrom, delay, reduce }: { world: WorldId; level: number; levelFrom: number; delay: number; reduce: boolean }) {
  const pop = (need: number) => ({
    initial: levelFrom < need ? { scale: 0, opacity: 0 } : false,
    animate: { scale: 1, opacity: 1 },
    transition: { delay: delay + 2.2, type: 'spring' as const, stiffness: 180, damping: 10 },
  });
  const has = (n: number) => level >= n;
  if (world === 'garden') return (
    <g>
      {has(3) && <motion.g {...pop(3)} style={{ originX: '200px', originY: '232px' }}>{Array.from({ length: 12 }).map((_, i) => <rect key={i} x={8 + i * 33} y="222" width="5" height="16" rx="1.5" fill="#c99a6a" />)}<rect x="0" y="226" width="400" height="3" fill="#c99a6a" /></motion.g>}
      {has(6) && <motion.g {...pop(6)} style={{ originX: '378px', originY: '214px' }}><ellipse cx="378" cy="214" rx="20" ry="7" fill="#5ec8ff" /><ellipse cx="372" cy="212" rx="5" ry="1.5" fill="#fff" opacity=".7" /></motion.g>}
      {has(9) && <motion.g {...pop(9)} style={{ originX: '24px', originY: '140px' }}><rect x="10" y="122" width="28" height="20" fill="#e9b872" /><path d="M6 124 L24 108 L42 124 Z" fill="#c4553f" /><rect x="20" y="130" width="7" height="12" fill="#7a4a2c" /></motion.g>}
      {has(13) && <motion.g {...pop(13)} style={{ originX: '388px', originY: '120px' }}><rect x="384" y="96" width="8" height="28" fill="#efe3cf" /><motion.g animate={reduce ? {} : { rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} style={{ originX: '388px', originY: '96px' }}>{[0, 90, 180, 270].map((r) => <rect key={r} x="386.5" y="80" width="3" height="16" fill="#9b6b43" transform={`rotate(${r} 388 96)`} />)}</motion.g></motion.g>}
      {has(18) && <motion.g {...pop(18)} style={{ originX: '60px', originY: '126px' }}><path d="M44 128 Q60 104 76 128 Z" fill="rgba(200,240,255,.8)" stroke="#9ad" /></motion.g>}
    </g>
  );
  if (world === 'ocean') return (
    <g>
      {has(3) && <motion.g {...pop(3)} style={{ originX: '380px', originY: '200px' }}><motion.g animate={reduce ? {} : { y: [0, 3, 0] }} transition={{ duration: 2, repeat: Infinity }}><path d="M374 204 h12 l-3 -12 h-6 Z" fill="#ff5e5e" /><rect x="377" y="196" width="6" height="3" fill="#fff" /></motion.g></motion.g>}
      {has(6) && <motion.g {...pop(6)} style={{ originX: '40px', originY: '130px' }}><rect x="10" y="126" width="60" height="5" fill="#a8744a" />{[14, 34, 54].map((x) => <rect key={x} x={x} y="126" width="3" height="14" fill="#7a4a2c" />)}</motion.g>}
      {has(9) && <motion.g {...pop(9)} style={{ originX: '392px', originY: '124px' }}><rect x="386" y="96" width="10" height="28" fill="#fff" /><rect x="386" y="104" width="10" height="5" fill="#ff5e5e" /><motion.circle cx="391" cy="94" r="4" fill="#ffe36b" animate={reduce ? {} : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} /></motion.g>}
      {has(13) && <motion.g {...pop(13)} animate={reduce ? { x: 0 } : { x: [0, 30, 0] }} transition={{ duration: 18, repeat: Infinity }}><path d="M150 228 h30 l-5 6 h-20 Z" fill="#fff" /><path d="M165 228 v-20 l12 18 Z" fill="#fff" /></motion.g>}
    </g>
  );
  return (
    <g>
      {has(3) && <motion.g {...pop(3)} style={{ originX: '20px', originY: '126px' }}><rect x="18" y="98" width="2.5" height="30" fill="#5a341f" /><motion.path d="M20.5 99 h16 l-4 5 l4 5 h-16 Z" fill="#1d2440" animate={reduce ? {} : { skewY: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity }} /></motion.g>}
      {has(6) && <motion.g {...pop(6)} style={{ originX: '372px', originY: '212px' }}><rect x="362" y="204" width="20" height="12" rx="2" fill="#a8744a" /><rect x="362" y="202" width="20" height="5" rx="2" fill="#7a4a2c" /><rect x="370" y="206" width="4" height="4" fill="#ffd34d" /></motion.g>}
      {has(9) && <motion.g {...pop(9)} style={{ originX: '388px', originY: '124px' }}><rect x="372" y="100" width="28" height="24" fill="#9a8f84" />{[372, 381, 390].map((x) => <rect key={x} x={x} y="94" width="6" height="7" fill="#9a8f84" />)}</motion.g>}
    </g>
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
          <g>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx={x} cy={y - h - 7} rx="5" ry="8" fill={petal} transform={`rotate(${r} ${x} ${y - h})`} />)}<circle cx={x} cy={y - h} r="5" fill="#ffe06b" /></g>
        ) : stage >= 3 ? <circle cx={x} cy={y - h - 3} r="5" fill={petal} opacity=".85" /> : <circle cx={x} cy={y - h} r="3" fill={leaf} />}
        {stage >= 6 && [-1, 1].map((s) => <circle key={s} cx={x + s * 12} cy={y - h * 0.5} r="3.5" fill={petal} />)}
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
            <g fill={health < 0.35 ? '#a7b07a' : '#2fbf71'}><ellipse cx={px - 7} cy={y - 24 - stage * 2} rx="9" ry="3.5" transform={`rotate(-25 ${px} ${y - 24})`} /><ellipse cx={px + 7} cy={y - 24 - stage * 2} rx="9" ry="3.5" transform={`rotate(25 ${px} ${y - 24})`} /></g>
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
        return <g key={i}><line x1={mx} y1={y - 8} x2={mx} y2={y - 34 - stage * 1.5} stroke="#5a341f" strokeWidth="2" /><path d={`M${mx} ${y - 32 - stage * 1.5} q10 8 0 18 Z`} fill={health < 0.35 ? '#d8d0c0' : '#fffaf0'} /></g>;
      })}
      {stage >= 5 && <path d={`M${x - 10} ${y - 44} l10 -4 v6 Z`} fill="#ff5e5e" />}
    </motion.g>
  );
}
