import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Copilot } from '../components/Copilot';
import { World } from '../components/World';
import { demoItems } from '../lib/demo';
import {
  accessories, copilots, hairColors, hairStyles, playStyles, roles, situations, skinTones, worlds,
  type CopilotId, type Look, type Profile, type RoleId, type WorldId,
} from '../lib/profile';

const STEPS = ['welcome', 'role', 'quiz', 'style', 'look', 'copilot', 'world', 'ready'] as const;
type Step = (typeof STEPS)[number];

const slide = { initial: { x: 60, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -60, opacity: 0 }, transition: { type: 'spring' as const, stiffness: 260, damping: 28 } };

export function Onboarding({ initial, onDone, onCancel }: { initial?: Profile | null; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState<Step>(initial ? 'look' : 'welcome');
  const [role, setRole] = useState<RoleId>(initial?.role || 'bm');
  const [answers, setAnswers] = useState<number[]>([]);
  const [q, setQ] = useState(0);
  const [styleKey, setStyleKey] = useState(initial?.styleKey || 'red');
  const [look, setLook] = useState<Look>(initial?.look || { skin: skinTones[1], hair: hairColors[1], hairStyle: 'short', accessory: 'none' });
  const [copilot, setCopilot] = useState<CopilotId>(initial?.copilot || 'fox');
  const [world, setWorld] = useState<WorldId>(initial?.world || 'garden');
  const [name, setName] = useState(initial?.name || '');
  const [minutes, setMinutes] = useState(initial?.dailyMinutes || 15);
  const preview = useMemo(() => demoItems(), []);

  const style = playStyles.find((s) => s.id === styleKey)!;
  const scores = playStyles.map((_, i) => answers.filter((a) => a === i).length);
  const best = Math.max(...scores);
  const leaders = scores.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
  const go = (s: Step) => setStep(s);
  const idx = STEPS.indexOf(step);

  const answer = (i: number) => {
    const next = [...answers.slice(0, q), i];
    setAnswers(next);
    if (q < situations.length - 1) setQ(q + 1);
    else {
      const counts = playStyles.map((_, k) => next.filter((a) => a === k).length);
      setStyleKey(playStyles[counts.indexOf(Math.max(...counts))].id);
      go('style');
    }
  };

  const finish = () => onDone({
    name: name.trim(), archetype: style.archetype, emoji: '🧭', color: style.color, styleKey: style.id, styleScores: answers.length ? scores : initial?.styleScores,
    quizVersion: 2, role, look, copilot, world, dailyMinutes: minutes,
  });

  return (
    <div className="onboarding" style={{ '--accent': style.color, '--accent-soft': style.soft } as React.CSSProperties}>
      <div className="ob-progress" aria-hidden="true"><motion.i animate={{ width: `${(idx / (STEPS.length - 1)) * 100}%` }} /></div>
      <div className="ob-top">
        {idx > 0 && step !== 'quiz' ? <button className="ghost" onClick={() => go(STEPS[idx - 1])}><ArrowLeft size={16} /> Retour</button> : <span />}
        {onCancel && <button className="ghost" onClick={onCancel}>Fermer</button>}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step + q} className="ob-step" {...slide}>
          {step === 'welcome' && (
            <div className="ob-hero">
              <motion.div className="ob-hero-art" initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
                <World world="garden" items={preview} compact />
              </motion.div>
              <h1>Ton CRM, version <span className="grad">aventure</span>.</h1>
              <p>Chaque soir, raconte ta journée à ton copilote pendant 15 minutes. Il crée les fiches, les next steps et les rendez-vous, et ton territoire grandit avec tes relations.</p>
              <button className="cta" onClick={() => go('role')}>Créer mon personnage <ArrowRight size={18} /></button>
              <small className="muted">2 minutes · tout reste modifiable ensuite</small>
            </div>
          )}

          {step === 'role' && (
            <div>
              <h2>Quel est ton terrain de jeu ?</h2>
              <p className="muted">Ton copilote adaptera ses questions.</p>
              <div className="choice-list">
                {roles.map((r) => (
                  <button key={r.id} className={'choice' + (role === r.id ? ' on' : '')} onClick={() => { setRole(r.id); go('quiz'); }}>
                    <strong>{r.label}</strong><span>{r.hint}</span><ArrowRight size={18} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'quiz' && (
            <div>
              <div className="quiz-meter"><span>Situation {q + 1} / {situations.length}</span><div className="dots">{situations.map((_, i) => <i key={i} className={i <= q ? 'on' : ''} />)}</div></div>
              <h2>{situations[q].question}</h2>
              <div className="choice-list">
                {[0, 1, 2, 3].map((offset) => {
                  const i = (offset + q) % 4;
                  return (
                    <motion.button key={i} className="choice" whileTap={{ scale: 0.97 }} onClick={() => answer(i)}>
                      <b className="letter">{String.fromCharCode(65 + offset)}</b><span>{situations[q].answers[i]}</span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="row-between">
                <button className="ghost" disabled={q === 0} onClick={() => setQ(q - 1)}><ArrowLeft size={16} /> Précédente</button>
                <button className="ghost" onClick={() => go('style')}>Choisir moi-même</button>
              </div>
            </div>
          )}

          {step === 'style' && (
            <div>
              <span className="kicker"><Sparkles size={14} /> Ton style prend forme</span>
              <h2>{answers.length && leaders.length > 1 ? 'Plusieurs styles te ressemblent.' : `Tendance ${style.name.toLowerCase()} : ${style.title}`}</h2>
              <p className="muted">{style.description}</p>
              <div className="style-grid">
                {playStyles.map((s, i) => (
                  <motion.button key={s.id} className={'style-card' + (styleKey === s.id ? ' on' : '')} style={{ '--c': s.color, '--cs': s.soft } as React.CSSProperties} onClick={() => setStyleKey(s.id)} whileTap={{ scale: 0.96 }} layout>
                    <i />
                    <strong>{s.title}</strong>
                    <span>{s.verb}</span>
                    {answers.length > 0 && <small>{scores[i]} / 5</small>}
                  </motion.button>
                ))}
              </div>
              <p className="coach-promise">« {style.coach} »</p>
              <p className="fineprint">Ces couleurs personnalisent ton interface et ton copilote. Ce mini-questionnaire n’est ni un test psychométrique validé ni une évaluation ; aucun style n’est supérieur. Elles ne servent jamais à évaluer des candidats.</p>
              <button className="cta" onClick={() => go('look')}>Continuer <ArrowRight size={18} /></button>
            </div>
          )}

          {step === 'look' && (
            <div className="look-step">
              <h2>À quoi ressembles-tu ?</h2>
              <div className="look-preview"><Avatar look={look} color={style.color} size={150} mood="cheer" /></div>
              <Picker label="Teint">{skinTones.map((c) => <Swatch key={c} color={c} on={look.skin === c} onClick={() => setLook({ ...look, skin: c })} />)}</Picker>
              <Picker label="Cheveux">{hairColors.map((c) => <Swatch key={c} color={c} on={look.hair === c} onClick={() => setLook({ ...look, hair: c })} />)}</Picker>
              <Picker label="Coiffure">{hairStyles.map((h) => <Chip key={h} on={look.hairStyle === h} onClick={() => setLook({ ...look, hairStyle: h })}>{{ short: 'Courte', curly: 'Bouclée', long: 'Longue', bun: 'Chignon', bald: 'Rasée' }[h]}</Chip>)}</Picker>
              <Picker label="Accessoire">{accessories.map((a) => <Chip key={a} on={look.accessory === a} onClick={() => setLook({ ...look, accessory: a })}>{{ none: 'Aucun', glasses: 'Lunettes', headset: 'Casque', cap: 'Casquette', scarf: 'Écharpe' }[a]}</Chip>)}</Picker>
              <Picker label="Couleur de style">{playStyles.map((s) => <Swatch key={s.id} color={s.color} on={styleKey === s.id} onClick={() => setStyleKey(s.id)} />)}</Picker>
              <button className="cta" onClick={() => go('copilot')}>Choisir mon copilote <ArrowRight size={18} /></button>
            </div>
          )}

          {step === 'copilot' && (
            <div>
              <h2>Qui t’accompagne chaque soir ?</h2>
              <p className="muted">Ton copilote t’écoute, pose une question à la fois et range tout dans ton CRM.</p>
              <div className="copilot-grid">
                {copilots.map((c) => (
                  <motion.button key={c.id} className={'copilot-card' + (copilot === c.id ? ' on' : '')} onClick={() => setCopilot(c.id)} whileTap={{ scale: 0.96 }}>
                    <Copilot id={c.id} color={c.color} size={74} state={copilot === c.id ? 'happy' : 'idle'} />
                    <strong>{c.name}</strong>
                    <span>{c.line}</span>
                  </motion.button>
                ))}
              </div>
              <button className="cta" onClick={() => go('world')}>Choisir mon univers <ArrowRight size={18} /></button>
            </div>
          )}

          {step === 'world' && (
            <div>
              <h2>Dans quel univers grandit ton activité ?</h2>
              <div className="world-pick">
                {(Object.keys(worlds) as WorldId[]).map((k) => (
                  <motion.button key={k} className={'world-card' + (world === k ? ' on' : '')} onClick={() => setWorld(k)} whileTap={{ scale: 0.97 }}>
                    <World world={k} items={preview} compact />
                    <span>{worlds[k].icon} {worlds[k].label}</span>
                  </motion.button>
                ))}
              </div>
              <p className="fineprint">L’univers change l’analogie, jamais les règles ni la vérité des chiffres : chaque compte grandit selon 6 éléments documentés (compte, contact, fonction, service, récit, action datée) et se fane quand la cadence de contact est dépassée.</p>
              <button className="cta" onClick={() => go('ready')}>Dernière étape <ArrowRight size={18} /></button>
            </div>
          )}

          {step === 'ready' && (
            <div className="ready">
              <div className="ready-duo">
                <Avatar look={look} color={style.color} size={120} mood="cheer" />
                <Copilot id={copilot} color={copilots.find((c) => c.id === copilot)!.color} size={90} state="happy" />
              </div>
              <label className="field">Nom de ton personnage
                <input autoFocus value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Comment veux-tu l’appeler ?" />
              </label>
              <div className="field">Ton rituel quotidien
                <div className="chips">{[10, 15, 20].map((m) => <Chip key={m} on={minutes === m} onClick={() => setMinutes(m)}>{m} min</Chip>)}</div>
              </div>
              <button className="cta big" disabled={!name.trim()} onClick={finish}>Entrer dans mon territoire <Sparkles size={18} /></button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Picker({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="picker"><span>{label}</span><div className="chips">{children}</div></div>;
}
function Swatch({ color, on, onClick }: { color: string; on: boolean; onClick: () => void }) {
  return <motion.button className={'swatch' + (on ? ' on' : '')} style={{ background: color }} aria-label={'Couleur ' + color} aria-pressed={on} onClick={onClick} whileTap={{ scale: 0.85 }} />;
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <motion.button className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={onClick} whileTap={{ scale: 0.93 }}>{children}</motion.button>;
}
