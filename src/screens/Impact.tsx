import { motion } from 'motion/react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Copilot } from '../components/Copilot';
import { plotsForLevel, UNLOCKS, World } from '../components/World';
import { AnimatedNumber, Confetti } from '../components/ui';
import type { RecordItem } from '../lib/debrief-model';
import { coverageDetail, COVERAGE_LABELS, gameProgress, relationshipCoverage } from '../lib/game';
import { copilotOf, styleOf, worlds, type Profile } from '../lib/profile';

type Props = { profile: Profile; before: RecordItem[]; after: RecordItem[]; plan: RecordItem[]; quality: number; demo: boolean; minutes: number; onClose: () => void };

/** Bilan : on voit le territoire pousser, et pourquoi (quelles informations ont fait grandir quoi). */
export function Impact({ profile, before, after, plan, quality, demo, minutes, onClose }: Props) {
  const style = styleOf(profile);
  const copilot = copilotOf(profile);
  const [run, setRun] = useState(0);
  const prev = gameProgress(before);
  const cur = gameProgress(after);
  const w = worlds[profile.world];
  const touchedNames = Array.from(new Set(plan.filter((r) => r.kind === 'activity').flatMap((r) => r.data.accounts || []))) as string[];
  const growth = touchedNames.map((name) => {
    const b = coverageDetail(before, name);
    const a = coverageDetail(after, name);
    const isNew = !before.some((i) => i.kind === 'account' && i.data.name?.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'));
    return { name, b, a, isNew, gained: a.map((v, i) => v && !b[i] ? COVERAGE_LABELS[i] : '').filter(Boolean) };
  });
  const accountsBefore = before.filter((i) => i.kind === 'account');
  const accountsAfter = after.filter((i) => i.kind === 'account');
  const avg = (items: RecordItem[], accs: RecordItem[]) => (accs.length ? accs.reduce((n, a) => n + relationshipCoverage(items, a.data.name), 0) / accs.length : 0);
  const unlocked = UNLOCKS[profile.world].filter((u) => u.level > prev.level && u.level <= cur.level);
  const newPlots = plotsForLevel(cur.level) - plotsForLevel(prev.level);
  const pct = Math.round(quality * 100);

  return (
    <div className="impact" key={run}>
      <Confetti active />
      <motion.small className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{demo ? 'SIMULATION · DONNÉES FICTIVES' : 'ENREGISTREMENT CONFIRMÉ'}</motion.small>
      <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>{w.success}</motion.h2>

      <div className="impact-world">
        <World world={profile.world} items={after} growFrom={before} level={cur.level} levelFrom={prev.level} delay={0.3} />
        <motion.span className="ba-tag before" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.8, duration: 0.4 }}>Avant</motion.span>
        <motion.span className="ba-tag after" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>Après ton débrief</motion.span>
        <button className="replay" aria-label="Rejouer l'animation" onClick={() => setRun(run + 1)}><RotateCcw size={16} /></button>
      </div>

      <div className="ba-stats">
        <BA label={w.unit === 'plante' ? 'Plantes' : w.unit === 'île' ? 'Îles' : 'Navires'} from={accountsBefore.length} to={accountsAfter.length} />
        <BA label="Relation moyenne /6" from={+avg(before, accountsBefore).toFixed(1)} to={+avg(after, accountsAfter).toFixed(1)} decimals />
        <BA label="Parcelles" from={plotsForLevel(prev.level)} to={plotsForLevel(cur.level)} />
        <BA label="Niveau" from={prev.level} to={cur.level} />
      </div>

      {growth.length > 0 && (
        <section className="growth-list">
          <h3>Ce que tes infos ont fait pousser</h3>
          {growth.map((g, gi) => (
            <motion.div key={g.name} className="growth-row" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.2 + gi * 0.2 }}>
              <div className="row-between"><strong>{g.name}{g.isNew && <em> · nouveau</em>}</strong><span>{g.b.filter(Boolean).length} → {g.a.filter(Boolean).length} / 6</span></div>
              <div className="pips">
                {g.a.map((on, i) => (
                  <motion.i key={i} title={COVERAGE_LABELS[i]} className={on ? (g.b[i] ? 'on' : 'new') : ''} initial={g.b[i] || !on ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 + gi * 0.2 + i * 0.08, type: 'spring', stiffness: 400, damping: 12 }}>{COVERAGE_LABELS[i]}</motion.i>
                ))}
              </div>
              {g.gained.length > 0 && <small>+ {g.gained.join(', ')}</small>}
            </motion.div>
          ))}
          <p className="fineprint">Chaque compte grandit avec 6 éléments documentés. Plus ton compte rendu est complet, plus ton territoire pousse.</p>
        </section>
      )}

      {(unlocked.length > 0 || newPlots > 0) && (
        <motion.div className="unlock" initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 2.4, type: 'spring' }}>
          <Sparkles size={18} /> Niveau {cur.level} : {[...unlocked.map((u) => u.label + ' débloqué(e)'), newPlots > 0 ? `${newPlots} nouvelle${newPlots > 1 ? 's' : ''} parcelle${newPlots > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')}
        </motion.div>
      )}

      <div className="impact-duo">
        <Avatar look={profile.look} color={style.color} size={96} mood="cheer" level={cur.level} />
        <motion.div className="xp-burst" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.5 }}>+<AnimatedNumber to={Math.max(0, cur.xp - prev.xp)} /> XP</motion.div>
        <Copilot id={copilot.id} color={copilot.color} state="happy" size={72} />
      </div>

      <div className="counters">
        {[
          { label: 'Compte rendu complet', value: pct, suffix: ' %', icon: '📋' },
          { label: 'Fiches créées', value: plan.filter((r) => r.version === 1 && r.kind !== 'activity').length, icon: '🌱' },
          { label: 'Fiches enrichies', value: plan.filter((r) => r.version > 1).length, icon: '✨' },
          { label: 'Next steps datés', value: plan.filter((r) => r.kind === 'task' && r.data.due).length, icon: '🎯' },
        ].map((c, i) => (
          <motion.div key={c.label} className="counter" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 + i * 0.12 }}>
            <span>{c.icon}</span><strong><AnimatedNumber to={c.value} />{c.suffix}</strong><small>{c.label}</small>
          </motion.div>
        ))}
      </div>
      <p className="muted">Rituel bouclé en {minutes} min. XP recalculée depuis tes fiches (débriefs, actions, besoins ouverts, candidats, liens) : ce n’est pas une mesure de performance.</p>
      <button className="cta" onClick={onClose}>Retour à mon territoire</button>
    </div>
  );
}

function BA({ label, from, to, decimals }: { label: string; from: number; to: number; decimals?: boolean }) {
  const up = to > from;
  return (
    <div className={'ba' + (up ? ' up' : '')}>
      <small>{label}</small>
      <span>{decimals ? from.toFixed(1) : from} <b>→</b> <strong>{decimals ? to.toFixed(1) : <AnimatedNumber from={from} to={to} />}</strong></span>
    </div>
  );
}
