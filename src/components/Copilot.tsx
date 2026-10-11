import { motion, useReducedMotion } from 'motion/react';
import type { CopilotId } from '../lib/profile';

export type CopilotState = 'idle' | 'listening' | 'thinking' | 'talking' | 'happy';

/** Copilote incarné. Il écoute (oreilles / antenne), réfléchit (bulles), parle (bouche), se réjouit (saut). */
export function Copilot({ id, color, state = 'idle', size = 96, level = 0 }: { id: CopilotId; color: string; state?: CopilotState; size?: number; level?: number }) {
  const reduce = useReducedMotion();
  const body = reduce
    ? {}
    : state === 'happy' ? { y: [0, -16, 0], rotate: [0, 6, -6, 0] }
    : state === 'listening' ? { scale: [1, 1 + level * 0.12 + 0.02, 1] }
    : state === 'thinking' ? { rotate: [-3, 3, -3] }
    : { y: [0, -4, 0] };
  const mouth = state === 'talking' && !reduce ? { ry: [1, 4, 1.5, 3.5, 1] } : { ry: state === 'happy' ? 4 : 1.4 };
  return (
    <motion.svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Ton copilote" animate={body} transition={{ duration: state === 'happy' ? 0.7 : state === 'listening' ? 0.35 : 2.6, repeat: Infinity, ease: 'easeInOut' }} style={{ overflow: 'visible' }}>
      <ellipse cx="50" cy="95" rx="24" ry="4" fill="rgba(0,0,0,.12)" />
      {id === 'fox' && <Fox color={color} state={state} />}
      {id === 'owl' && <Owl color={color} />}
      {id === 'turtle' && <Turtle color={color} />}
      {id === 'bot' && <Bot color={color} state={state} level={level} />}
      <motion.g animate={reduce ? {} : { scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.94, 1] }} style={{ originY: '50px' }}>
        <circle cx="40" cy="50" r="4.2" fill="#1d2440" />
        <circle cx="60" cy="50" r="4.2" fill="#1d2440" />
        <circle cx="41.4" cy="48.6" r="1.4" fill="#fff" />
        <circle cx="61.4" cy="48.6" r="1.4" fill="#fff" />
      </motion.g>
      <motion.ellipse cx="50" cy="63" rx="4.5" fill="#5b2333" animate={mouth} transition={{ duration: 0.5, repeat: state === 'talking' ? Infinity : 0 }} />
      {state === 'thinking' && !reduce && [0, 1, 2].map((i) => (
        <motion.circle key={i} cx={78 + i * 7} cy={22 - i * 7} r={2.5 + i} fill="#fff" stroke={color} strokeWidth="1.5" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, delay: i * 0.25, repeat: Infinity }} />
      ))}
    </motion.svg>
  );
}

function Fox({ color, state }: { color: string; state: CopilotState }) {
  return (
    <g>
      <motion.path d="M22 34 L30 8 L44 28 Z" fill={color} animate={state === 'listening' ? { rotate: [-6, 6, -6] } : {}} transition={{ duration: 0.8, repeat: Infinity }} style={{ originX: '34px', originY: '28px' }} />
      <motion.path d="M78 34 L70 8 L56 28 Z" fill={color} animate={state === 'listening' ? { rotate: [6, -6, 6] } : {}} transition={{ duration: 0.8, repeat: Infinity }} style={{ originX: '66px', originY: '28px' }} />
      <path d="M26 30 L31 14 L39 27 Z M74 30 L69 14 L61 27 Z" fill="#fff4ea" />
      <path d="M50 88 C24 88 16 66 18 48 C20 30 34 24 50 24 C66 24 80 30 82 48 C84 66 76 88 50 88 Z" fill={color} />
      <path d="M50 88 C36 88 28 74 30 62 Q40 58 50 66 Q60 58 70 62 C72 74 64 88 50 88 Z" fill="#fff4ea" />
      <circle cx="50" cy="58" r="3.4" fill="#1d2440" />
    </g>
  );
}

function Owl({ color }: { color: string }) {
  return (
    <g>
      <path d="M24 30 L32 18 L38 28 Z M76 30 L68 18 L62 28 Z" fill={color} />
      <ellipse cx="50" cy="58" rx="32" ry="34" fill={color} />
      <ellipse cx="50" cy="70" rx="20" ry="18" fill="#efe9ff" />
      <circle cx="40" cy="50" r="11" fill="#fff" />
      <circle cx="60" cy="50" r="11" fill="#fff" />
      <path d="M46 58 L50 64 L54 58 Z" fill="#ffb02e" />
      <path d="M24 60 Q16 72 26 84 M76 60 Q84 72 74 84" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Turtle({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="50" cy="78" rx="38" ry="14" fill={color} />
      <path d="M18 78 Q50 40 82 78 Z" fill="#1f8a5c" />
      <g stroke="#9ff0c8" strokeWidth="2" fill="none" opacity=".7"><path d="M34 70 L42 58 L58 58 L66 70" /><path d="M42 58 L50 50 L58 58" /></g>
      <circle cx="50" cy="46" r="22" fill="#a8ecc9" />
      <circle cx="40" cy="58" r="3" fill="#ff8a8a" opacity=".5" />
      <circle cx="60" cy="58" r="3" fill="#ff8a8a" opacity=".5" />
    </g>
  );
}

function Bot({ color, state, level }: { color: string; state: CopilotState; level: number }) {
  return (
    <g>
      <line x1="50" y1="22" x2="50" y2="10" stroke="#1d2440" strokeWidth="3" />
      <motion.circle cx="50" cy="9" r="5" fill={state === 'listening' ? '#ff5e7a' : color} animate={state === 'listening' ? { r: [4, 5 + level * 6, 4] } : {}} transition={{ duration: 0.3, repeat: Infinity }} />
      <rect x="20" y="22" width="60" height="52" rx="18" fill={color} />
      <rect x="27" y="36" width="46" height="30" rx="12" fill="#e9f2ff" />
      <rect x="30" y="76" width="40" height="14" rx="7" fill={color} opacity=".75" />
      <circle cx="14" cy="48" r="6" fill={color} />
      <circle cx="86" cy="48" r="6" fill={color} />
    </g>
  );
}
