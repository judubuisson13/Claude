import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function AnimatedNumber({ from = 0, to, duration = 1.4 }: { from?: number; to: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) { setV(to); return; }
    const c = animate(from, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [from, to, duration, reduce]);
  return <>{v}</>;
}

export function XpBar({ into, next, color }: { into: number; next: number; color: string }) {
  return (
    <div className="xpbar" role="progressbar" aria-valuenow={into} aria-valuemax={300} aria-label="Progression vers le niveau suivant">
      <motion.i style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(into / 300) * 100}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} />
      <span>{into} / 300 XP · vers niv. {next / 300 + 1}</span>
    </div>
  );
}

const CONFETTI = ['#ff6b5e', '#ffc93c', '#3ecf8e', '#5aa2ff', '#a58bff', '#ff7aa8'];

export function Confetti({ count = 60, active }: { count?: number; active: boolean }) {
  const reduce = useReducedMotion();
  const pieces = useRef(Array.from({ length: count }, (_, i) => ({ x: Math.random() * 100, r: Math.random() * 360, d: 1.6 + Math.random() * 1.6, delay: Math.random() * 0.5, c: CONFETTI[i % CONFETTI.length], s: 6 + Math.random() * 6 })));
  if (!active || reduce) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.current.map((p, i) => (
        <motion.i key={i} style={{ left: `${p.x}%`, background: p.c, width: p.s, height: p.s * 0.45 }} initial={{ y: -40, rotate: 0, opacity: 1 }} animate={{ y: '110vh', rotate: p.r + 540, opacity: [1, 1, 0] }} transition={{ duration: p.d, delay: p.delay, ease: 'easeIn' }} />
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.section role="dialog" aria-modal="true" aria-label={title} className={'sheet' + (wide ? ' wide' : '')} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} onClick={(e) => e.stopPropagation()}>
            <header><h2>{title}</h2><button className="icon-btn" aria-label="Fermer" onClick={onClose}><X size={20} /></button></header>
            <div className="sheet-body">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => { if (!text) return; const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [text, onDone]);
  return (
    <AnimatePresence>
      {text && <motion.div className="toast" role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>{text}</motion.div>}
    </AnimatePresence>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'good' | 'hot' | 'info' }) {
  return <span className={'pill ' + tone}>{children}</span>;
}
