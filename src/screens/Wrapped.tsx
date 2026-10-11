import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Copy, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { World } from '../components/World';
import { AnimatedNumber } from '../components/ui';
import type { RecordItem } from '../lib/debrief-model';
import { shortDate } from '../lib/dates';
import { gameProgress } from '../lib/game';
import { styleOf, type Profile } from '../lib/profile';
import { PERIOD_LABEL, wrapped, type Period } from '../lib/wrapped';

const BG = [
  'linear-gradient(160deg,#ff6b5e,#ff9a3c)', 'linear-gradient(160deg,#5a3cff,#ff5ea8)', 'linear-gradient(160deg,#0f9b8e,#3ecf8e)',
  'linear-gradient(160deg,#1d2440,#5aa2ff)', 'linear-gradient(160deg,#ffb703,#fb5607)', 'linear-gradient(160deg,#8338ec,#3a86ff)', 'linear-gradient(160deg,#101a2e,#2b3a67)',
];
const SLIDE_MS = 5200;

/** Wrap façon stories : ce qui s'est passé pour toi cette semaine / ce mois / cette année. */
export function Wrapped({ profile, items, period: initial, onClose }: { profile: Profile; items: RecordItem[]; period: Period; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [period, setPeriod] = useState<Period>(initial);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const w = useMemo(() => wrapped(items, period), [items, period]);
  const style = styleOf(profile);
  const lvl = gameProgress(items).level;
  const P = PERIOD_LABEL[period];

  const slides: { key: string; body: React.ReactNode }[] = [
    { key: 'intro', body: <><Avatar look={profile.look} color={style.color} size={130} mood="cheer" level={lvl} /><h2>{P.title} en Tempo</h2><p>{shortDate(w.start)} → {shortDate(w.end)}</p><small>Touche pour avancer</small></> },
    { key: 'ritual', body: <><p className="big"><AnimatedNumber to={w.debriefs} /></p><h2>débriefs {P.noun}</h2><p>sur {w.activeDays} jour{w.activeDays > 1 ? 's' : ''}, environ {w.minutes} minutes au total.</p>{w.bestDay && <p>Ton jour le plus actif : <b>le {w.bestDay}</b>.</p>}</> },
    { key: 'clients', body: <><h2>Les comptes qui ont compté</h2><ol className="rank">{w.clients.slice(0, 5).map((c, k) => <motion.li key={c.name} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + k * 0.18 }}><b>{k + 1}</b>{c.name}<span>{c.n} échange{c.n > 1 ? 's' : ''}</span></motion.li>)}</ol>{!w.clients.length && <p>Aucun compte évoqué sur la période.</p>}<p>{w.newAccounts} nouveau{w.newAccounts > 1 ? 'x' : ''} compte{w.newAccounts > 1 ? 's' : ''} · {w.newContacts} nouveau{w.newContacts > 1 ? 'x' : ''} contact{w.newContacts > 1 ? 's' : ''}</p></> },
    { key: 'needs', body: <><p className="big"><AnimatedNumber to={w.needs.length} /></p><h2>besoin{w.needs.length > 1 ? 's' : ''} suivi{w.needs.length > 1 ? 's' : ''}</h2><div className="tags">{w.topSkills.map((s, k) => <motion.span key={s} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + k * 0.12, type: 'spring' }}>{s}</motion.span>)}</div><p>Les compétences les plus demandées et rencontrées {P.noun}.</p></> },
    { key: 'talent', body: <><p className="big"><AnimatedNumber to={w.candidatesMet.length} /></p><h2>talent{w.candidatesMet.length > 1 ? 's' : ''} rencontré{w.candidatesMet.length > 1 ? 's' : ''}</h2><p>{w.candidatesMet.slice(0, 6).join(' · ') || 'Ton vivier attend ses premiers profils.'}</p><p>Ils restent dans ton vivier : le copilote te les reproposera dès qu’un besoin correspond.</p></> },
    { key: 'actions', body: <><p className="big"><AnimatedNumber to={w.actions} /></p><h2>next steps posés</h2><p>{w.tasksDone} mission{w.tasksDone > 1 ? 's' : ''} terminée{w.tasksDone > 1 ? 's' : ''}. Comptes rendus complets à {w.avgQuality} % en moyenne.</p></> },
    { key: 'world', body: <><h2>Ton territoire aujourd’hui</h2><div className="wrap-world"><World world={profile.world} items={items} level={lvl} compact /></div><p>Niveau {lvl} · chaque info renseignée l’a fait grandir.</p></> },
    { key: 'persona', body: <><small>{P.title.toUpperCase()}, TU AS ÉTÉ</small><h2 className="persona">{w.persona.title}</h2><p>{w.persona.line}</p>
      <button className="wrap-copy" onClick={(e) => { e.stopPropagation(); const t = `${P.title} sur Tempo Play : ${w.debriefs} débriefs, ${w.clients.length} comptes, ${w.needs.length} besoins, ${w.candidatesMet.length} talents rencontrés, ${w.actions} next steps. Profil : ${w.persona.title} 🌱`; navigator.clipboard?.writeText(t).then(() => setCopied(true)).catch(() => setCopied(false)); }}><Copy size={16} /> {copied ? 'Copié !' : 'Copier mon résumé'}</button></> },
  ];

  useEffect(() => { setI(0); }, [period]);
  useEffect(() => {
    if (paused || reduce) return;
    const t = setTimeout(() => (i < slides.length - 1 ? setI(i + 1) : null), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduce, slides.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setI((x) => Math.min(slides.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)); if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [slides.length, onClose]);

  return (
    <motion.div className="wrapped" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="wrap-frame" style={{ background: BG[i % BG.length] }}
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}
        onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); if (e.clientX - r.left < r.width * 0.3) setI(Math.max(0, i - 1)); else setI(Math.min(slides.length - 1, i + 1)); }}>
        <div className="wrap-bars">{slides.map((s, k) => <i key={s.key}><motion.b key={i + '-' + k + period} initial={{ width: k < i ? '100%' : '0%' }} animate={{ width: k < i ? '100%' : k === i ? '100%' : '0%' }} transition={k === i && !reduce ? { duration: SLIDE_MS / 1000, ease: 'linear' } : { duration: 0 }} /></i>)}</div>
        <div className="wrap-top" onClick={(e) => e.stopPropagation()}>
          <div className="wrap-periods">{(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <button key={p} className={p === period ? 'on' : ''} onClick={() => setPeriod(p)}>{p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}</button>)}</div>
          <button className="icon-btn" aria-label="Fermer le wrap" onClick={onClose}><X size={22} /></button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={slides[i].key + period} className="wrap-slide" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
            {slides[i].body}
          </motion.div>
        </AnimatePresence>
        <div className="wrap-brand">Tempo Play · {profile.name}</div>
      </div>
    </motion.div>
  );
}
