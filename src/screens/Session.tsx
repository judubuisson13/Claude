import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ChevronRight, Keyboard, Loader2, Mic, Pause, Send, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Copilot, type CopilotState } from '../components/Copilot';
import { World } from '../components/World';
import { AnimatedNumber, Confetti, Pill } from '../components/ui';
import type { Analysis } from '../lib/analysis-schema';
import { STAGES } from '../lib/stages';
import { empty, gameProgress, type Exchange, type RecordItem } from '../lib/debrief-model';
import { findFrenchDate, shortDate } from '../lib/dates';
import { sessionAgenda } from '../lib/insights';
import { buildFullPlan, describe, KIND_LABEL } from '../lib/plan';
import { copilotOf, styleOf, worlds, type Profile } from '../lib/profile';
import { analyse, type Store } from '../lib/store';
import { speak, useVoice } from '../lib/voice';

type Phase = 'talk' | 'review' | 'saving' | 'impact';
type Line = { role: 'copilot' | 'user'; text: string };
const EMPTY: Analysis = { reply: '', exchanges: [], meetings: [], birthdays: [], followUp: '' };
const SEND_WORDS = /(?:^|\s)(?:c'est tout|à toi|envoie|terminé)[.!]?$/i;

export function Session({ profile, store, onClose }: { profile: Profile; store: Store; onClose: () => void }) {
  const reduce = useReducedMotion();
  const style = styleOf(profile);
  const copilot = copilotOf(profile);
  const agenda = useMemo(() => sessionAgenda(store.items), [store.items]);
  const opening = agenda[0]?.prompt || (profile.role === 'recruiter' ? 'Quels candidats as-tu rencontrés aujourd’hui ? Raconte-moi tout d’un coup.' : 'Raconte-moi ta journée : qui as-tu vu, qu’est-ce qui avance ou bloque ?');

  const [phase, setPhase] = useState<Phase>('talk');
  const [lines, setLines] = useState<Line[]>([{ role: 'copilot', text: `Salut ${profile.name} ! ${opening}` }]);
  const [draft, setDraft] = useState('');
  const [analysis, setAnalysis] = useState<Analysis>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<'claude' | 'local' | ''>('');
  const [notice, setNotice] = useState('');
  const [voiceOut, setVoiceOut] = useState(false);
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ before: RecordItem[]; after: RecordItem[]; plan: RecordItem[] } | null>(null);
  const [saveError, setSaveError] = useState('');
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const voice = useVoice((text) => {
    const next = (draftRef.current ? draftRef.current + ' ' : '') + text;
    if (SEND_WORDS.test(next)) { setDraft(''); submit(next.replace(SEND_WORDS, '').trim()); } else setDraft(next);
  });

  useEffect(() => { const t = setInterval(() => phase === 'talk' && setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, [phase]);
  const lastCopilot = [...lines].reverse().find((l) => l.role === 'copilot')?.text || '';
  useEffect(() => { speak(lastCopilot, voiceOut); }, [lastCopilot, voiceOut]);

  useEffect(() => { document.querySelector('.session')?.scrollTo({ top: 0 }); }, [phase]);
  const plan = useMemo(() => buildFullPlan(analysis, store.items), [analysis, store.items]);
  const visible = plan.filter((r) => r.kind !== 'activity');
  const target = profile.dailyMinutes * 60;

  async function submit(textArg?: string) {
    const text = (textArg ?? draft).trim();
    if (!text || busy) return;
    const nextLines: Line[] = [...lines, { role: 'user', text }];
    setLines(nextLines);
    setDraft('');
    setBusy(true);
    setNotice('');
    try {
      const transcript = nextLines.map((l) => `${l.role === 'copilot' ? 'Copilote' : 'Moi'} : ${l.text}`).join('\n');
      const r = await analyse(transcript, { items: store.items, demo: store.mode === 'demo', history: [], persona: `${style.title} (${style.verb})` }, store.status.reachable);
      setAnalysis(r.analysis);
      setEngine(r.engine);
      if (r.warning) setNotice(r.warning);
      const say = [r.analysis.reply, r.analysis.followUp || 'Autre chose à me raconter ? Sinon, on passe à la revue.'].filter(Boolean).join(' ');
      setTyping(true);
      setTimeout(() => { setTyping(false); setLines((l) => [...l, { role: 'copilot', text: say }]); }, reduce ? 0 : 450);
    } catch {
      setNotice('Analyse impossible pour le moment. Ton récit est conservé, réessaie.');
      setLines(lines);
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  const askTopic = (prompt: string) => setLines((l) => [...l, { role: 'copilot', text: prompt }]);

  async function save(edited: Analysis) {
    setPhase('saving');
    setSaveError('');
    const before = store.items;
    const finalPlan = buildFullPlan(edited, before);
    try {
      const after = await store.commitPlan(finalPlan);
      setResult({ before, after, plan: finalPlan });
      setPhase('impact');
    } catch (e) {
      // Échec : pas de récompense fictive, les réponses restent modifiables.
      setSaveError((e as Error).message);
      setAnalysis(edited);
      setPhase('review');
    }
  }

  const copilotState: CopilotState = typing || busy ? 'thinking' : voice.listening ? 'listening' : 'talking';

  return (
    <motion.div className="session" style={{ '--accent': style.color, '--accent-soft': style.soft } as React.CSSProperties} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <header className="session-top">
        <TimerRing elapsed={elapsed} target={target} color={style.color} />
        <div className="session-title">
          <strong>{phase === 'talk' ? 'Débrief du jour' : phase === 'review' ? 'Revue avant écriture' : phase === 'impact' ? 'Bilan' : 'Enregistrement…'}</strong>
          <span>{store.mode === 'demo' ? 'Mode démo · données fictives' : 'Mon espace'}{engine && ` · analyse ${engine === 'claude' ? 'IA Claude' : 'locale'}`}</span>
        </div>
        {phase === 'talk' && <button className="icon-btn" aria-label={voiceOut ? 'Couper la voix du copilote' : 'Faire parler le copilote'} onClick={() => setVoiceOut(!voiceOut)}>{voiceOut ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>}
        <button className="icon-btn" aria-label="Quitter la session" onClick={() => { voice.stop(); onClose(); }}><X size={22} /></button>
      </header>

      {phase === 'talk' && (
        <div className="session-body">
          <section className="stage">
            {agenda.length > 0 && (
              <div className="agenda" aria-label="Sujets du jour">
                {agenda.map((a, i) => (
                  <motion.button key={a.id} className="agenda-chip" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i }} onClick={() => askTopic(a.prompt)}>{a.icon} {a.label}</motion.button>
                ))}
              </div>
            )}
            <div className="duo">
              <Copilot id={copilot.id} color={copilot.color} state={copilotState} level={voice.level} size={120} />
              <div className="bubble-stack" aria-live="polite">
                <AnimatePresence mode="popLayout">
                  {typing ? (
                    <motion.div key="typing" className="bubble copilot typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><i /><i /><i /></motion.div>
                  ) : (
                    <motion.div key={lastCopilot} className="bubble copilot" initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
                      <small>{copilot.name}</small>
                      {lastCopilot}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="transcript">
              {lines.filter((l) => l.role === 'user').slice(-2).map((l, i) => <motion.p key={i + l.text.slice(0, 12)} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}>« {l.text} »</motion.p>)}
              <textarea
                aria-label="Ton récit"
                value={draft + (voice.interim ? (draft ? ' ' : '') + voice.interim : '')}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder={voice.supported ? 'Appuie sur le micro et parle… ou écris ici.' : 'Écris ton récit ici.'}
                rows={3}
              />
              {(voice.error || notice) && <p className="notice">{voice.error || notice}</p>}
            </div>

            <div className="controls">
              <button className="ghost" onClick={() => document.querySelector<HTMLTextAreaElement>('.transcript textarea')?.focus()}><Keyboard size={18} /> Écrire</button>
              <motion.button
                className={'mic' + (voice.listening ? ' on' : '')}
                aria-label={voice.listening ? 'Arrêter la dictée' : 'Parler'}
                aria-pressed={voice.listening}
                onClick={() => (voice.listening ? voice.stop() : voice.start())}
                whileTap={{ scale: 0.92 }}
                animate={voice.listening && !reduce ? { boxShadow: [`0 0 0 0 ${style.color}88`, `0 0 0 ${18 + voice.level * 30}px ${style.color}00`] } : {}}
                transition={{ duration: 1.1, repeat: Infinity }}
              >
                {voice.listening ? <Pause size={30} /> : <Mic size={30} />}
              </motion.button>
              <button className="primary" disabled={busy || !(draft || voice.interim).trim()} onClick={() => submit((draft + ' ' + voice.interim).trim())}>
                {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />} Envoyer
              </button>
            </div>
            <p className="hint">Astuce : finis par « c’est tout » pour envoyer à la voix.</p>
          </section>

          <aside className="stack" aria-label="Mises à jour préparées">
            <div className="stack-head">
              <strong>Ton CRM se remplit</strong>
              <span>{visible.length} élément{visible.length > 1 ? 's' : ''}</span>
            </div>
            <div className="stack-cards">
              <AnimatePresence initial={false}>
                {visible.map((r, i) => (
                  <motion.div layout key={r.kind + describe(r)} className={'mini-card k-' + r.kind} initial={{ opacity: 0, x: 80, rotate: 6, scale: 0.8 }} animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 300, damping: 24, delay: Math.min(i, 6) * 0.06 }}>
                    <span className="tag">{r.version === 1 ? '+ ' : '↻ '}{KIND_LABEL[r.kind] || r.kind}</span>
                    <strong>{describe(r)}</strong>
                    {r.kind === 'task' && r.data.due && <small>📅 {shortDate(r.data.due)}</small>}
                    {r.kind === 'contact' && r.data.birth && <small>🎂 anniversaire noté</small>}
                  </motion.div>
                ))}
              </AnimatePresence>
              {!visible.length && <p className="empty">Parle de tes rendez-vous : les fiches, next steps et événements apparaîtront ici.</p>}
            </div>
            <button className="cta" disabled={!analysis.exchanges.length && !analysis.meetings.length} onClick={() => { voice.stop(); setPhase('review'); }}>
              Passer à la revue <ChevronRight size={18} />
            </button>
          </aside>
        </div>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <Review initial={analysis} items={store.items} saving={phase === 'saving'} error={saveError} demo={store.mode === 'demo'} onBack={() => setPhase('talk')} onSave={save} />
      )}

      {phase === 'impact' && result && <Impact profile={profile} {...result} demo={store.mode === 'demo'} minutes={Math.max(1, Math.round(elapsed / 60))} onClose={onClose} />}
    </motion.div>
  );
}

function TimerRing({ elapsed, target, color }: { elapsed: number; target: number; color: string }) {
  const p = Math.min(1, elapsed / target);
  const left = Math.max(0, target - elapsed);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="timer" title="Temps de ton rituel">
      <svg viewBox="0 0 56 56" width="56" height="56">
        <circle cx="28" cy="28" r={r} stroke="rgba(255,255,255,.18)" strokeWidth="5" fill="none" />
        <motion.circle cx="28" cy="28" r={r} stroke={elapsed > target ? '#ff6b5e' : color} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - p) }} transform="rotate(-90 28 28)" />
      </svg>
      <span>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
    </div>
  );
}

const FIELDS: { key: keyof Exchange; label: string; group: 'client' | 'need' | 'next' | 'people' }[] = [
  { key: 'client', label: 'Compte', group: 'client' }, { key: 'contact', label: 'Interlocuteur', group: 'client' }, { key: 'role', label: 'Fonction', group: 'client' }, { key: 'service', label: 'Service', group: 'client' },
  { key: 'need', label: 'Besoin', group: 'need' }, { key: 'skills', label: 'Compétences', group: 'need' }, { key: 'budget', label: 'Budget / TJM', group: 'need' },
  { key: 'action', label: 'Next step', group: 'next' }, { key: 'owner', label: 'Qui', group: 'next' }, { key: 'due', label: 'Échéance', group: 'next' },
  { key: 'candidate', label: 'Candidat', group: 'people' }, { key: 'candidateRole', label: 'Poste visé', group: 'people' }, { key: 'candidateSkills', label: 'Compétences candidat', group: 'people' }, { key: 'availability', label: 'Disponibilité', group: 'people' },
  { key: 'consultant', label: 'Consultant', group: 'people' }, { key: 'consultantRole', label: 'Expertise', group: 'people' }, { key: 'hotTopic', label: 'Sujet chaud', group: 'next' },
];

function Review({ initial, items, saving, error, demo, onBack, onSave }: { initial: Analysis; items: RecordItem[]; saving: boolean; error: string; demo: boolean; onBack: () => void; onSave: (a: Analysis) => void }) {
  const [a, setA] = useState<Analysis>(initial);
  const plan = useMemo(() => buildFullPlan(a, items), [a, items]);
  const creations = plan.filter((r) => r.version === 1 && r.kind !== 'activity');
  const updates = plan.filter((r) => r.version > 1);
  const missing = Array.from(new Set(plan.filter((r) => r.kind === 'activity').flatMap((r) => r.data.missing || [])));
  const setEx = (i: number, patch: Partial<Exchange>) => setA({ ...a, exchanges: a.exchanges.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  const badDate = a.exchanges.some((e) => e.due && !/^\d{4}-\d{2}-\d{2}$/.test(e.due));

  return (
    <div className="review">
      <div className="review-summary">
        <motion.div className="sum-tile" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><strong>{creations.length}</strong><span>créations</span></motion.div>
        <motion.div className="sum-tile" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.08 }}><strong>{updates.length}</strong><span>mises à jour</span></motion.div>
        <motion.div className="sum-tile" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.16 }}><strong>{plan.filter((r) => r.kind === 'task').length}</strong><span>next steps</span></motion.div>
        <motion.div className="sum-tile" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.24 }}><strong>{a.meetings.length}</strong><span>événements</span></motion.div>
      </div>
      {missing.length > 0 && <div className="missing">À compléter plus tard : {missing.map((m) => <Pill key={m} tone="warn">{m}</Pill>)}</div>}
      {error && <p className="notice error" role="alert">{error}</p>}

      {a.exchanges.map((e, i) => (
        <motion.article key={i} className="ex-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
          <header>
            <strong>{e.client || e.candidate || e.consultant || 'Sujet ' + (i + 1)}</strong>
            <select aria-label="Étape" value={e.stage} onChange={(ev) => setEx(i, { stage: ev.target.value as Exchange['stage'] })} disabled={!e.need}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="icon-btn" aria-label="Retirer ce sujet" onClick={() => setA({ ...a, exchanges: a.exchanges.filter((_, k) => k !== i) })}><Trash2 size={16} /></button>
          </header>
          <p className="story">{e.story}</p>
          <div className="ex-grid">
            {FIELDS.filter((f) => e[f.key] || ['client', 'contact', 'action', 'due'].includes(f.key) || (f.group === 'need' && e.need) || (f.key === 'role' && e.contact)).map((f) => (
              <label key={f.key} className={!e[f.key] ? 'empty-field' : ''}>
                <span>{f.label}</span>
                <input
                  value={e[f.key] as string}
                  type={f.key === 'due' ? 'date' : 'text'}
                  onChange={(ev) => setEx(i, { [f.key]: f.key === 'due' ? ev.target.value : ev.target.value } as Partial<Exchange>)}
                  onBlur={(ev) => { if (f.key === 'due' && ev.target.value && !/^\d{4}-/.test(ev.target.value)) setEx(i, { due: findFrenchDate(ev.target.value) }); }}
                  placeholder={f.key === 'budget' ? 'Non évoqué' : '—'}
                />
              </label>
            ))}
          </div>
          {e.stage !== 'À qualifier' && e.need && (
            <label className="evidence"><span>Preuve de l’étape « {e.stage} »</span><input value={e.evidence} onChange={(ev) => setEx(i, { evidence: ev.target.value })} /></label>
          )}
        </motion.article>
      ))}
      <button className="ghost add" onClick={() => setA({ ...a, exchanges: [...a.exchanges, { ...empty(), story: 'Ajout manuel' }] })}>+ Ajouter un sujet</button>

      {(a.meetings.length > 0 || a.birthdays.length > 0) && (
        <div className="ex-card">
          <header><strong>Agenda & dates clés</strong></header>
          {a.meetings.map((m, i) => (
            <div className="row-line" key={'m' + i}>
              📅 <input value={m.title} onChange={(ev) => setA({ ...a, meetings: a.meetings.map((x, k) => (k === i ? { ...x, title: ev.target.value } : x)) })} />
              <input type="date" value={m.date} onChange={(ev) => setA({ ...a, meetings: a.meetings.map((x, k) => (k === i ? { ...x, date: ev.target.value } : x)) })} />
              <input type="time" value={m.time} onChange={(ev) => setA({ ...a, meetings: a.meetings.map((x, k) => (k === i ? { ...x, time: ev.target.value } : x)) })} />
              <button className="icon-btn" aria-label="Retirer" onClick={() => setA({ ...a, meetings: a.meetings.filter((_, k) => k !== i) })}><Trash2 size={16} /></button>
            </div>
          ))}
          {a.birthdays.map((b, i) => {
            const known = [...items, ...plan].some((x) => x.kind === b.kind && x.data.name?.toLocaleLowerCase('fr') === b.name.toLocaleLowerCase('fr'));
            return (
              <div className="row-line" key={'b' + i}>🎂 {b.name} · {b.date.slice(-5).split('-').reverse().join('/')} {!known && <Pill tone="warn">fiche introuvable : non enregistré</Pill>}
                <button className="icon-btn" aria-label="Retirer" onClick={() => setA({ ...a, birthdays: a.birthdays.filter((_, k) => k !== i) })}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="plan-list">
        <strong>Ce qui sera écrit</strong>
        {plan.filter((r) => r.kind !== 'activity').map((r) => <div key={r.id} className={'plan-row k-' + r.kind}><span className="tag">{r.version === 1 ? 'Créer' : 'Mettre à jour'} · {KIND_LABEL[r.kind]}</span>{describe(r)}</div>)}
        <div className="plan-row k-activity"><span className="tag">Créer · Compte rendu</span>{plan.filter((r) => r.kind === 'activity').length} compte(s) rendu(s) reliés</div>
      </div>

      <div className="review-actions">
        <button className="ghost" onClick={onBack} disabled={saving}>Continuer à parler</button>
        <button className="cta" disabled={saving || badDate || !plan.length} onClick={() => onSave(a)}>
          {saving ? <><Loader2 className="spin" size={18} /> Enregistrement…</> : <><Check size={18} /> {demo ? 'Valider (simulation)' : 'Valider et enregistrer'}</>}
        </button>
      </div>
    </div>
  );
}

function Impact({ profile, before, after, plan, demo, minutes, onClose }: { profile: Profile; before: RecordItem[]; after: RecordItem[]; plan: RecordItem[]; demo: boolean; minutes: number; onClose: () => void }) {
  const style = styleOf(profile);
  const copilot = copilotOf(profile);
  const prev = gameProgress(before);
  const cur = gameProgress(after);
  const levelUp = cur.level > prev.level;
  const grew = plan.filter((r) => r.kind === 'account').map((r) => r.id);
  const counters = [
    { label: 'Fiches créées', value: plan.filter((r) => r.version === 1 && r.kind !== 'activity').length, icon: '🌱' },
    { label: 'Fiches enrichies', value: plan.filter((r) => r.version > 1).length, icon: '✨' },
    { label: 'Next steps datés', value: plan.filter((r) => r.kind === 'task' && r.data.due).length, icon: '🎯' },
    { label: 'Événements', value: plan.filter((r) => r.kind === 'meeting').length, icon: '📅' },
  ];
  return (
    <div className="impact">
      <Confetti active />
      <motion.small className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{demo ? 'SIMULATION · DONNÉES FICTIVES' : 'ENREGISTREMENT CONFIRMÉ'}</motion.small>
      <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>{worlds[profile.world].success}</motion.h2>
      <div className="impact-duo">
        <Avatar look={profile.look} color={style.color} size={110} mood="cheer" level={cur.level} />
        <Copilot id={copilot.id} color={copilot.color} state="happy" size={80} />
      </div>
      <motion.div className="xp-burst" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}>
        +<AnimatedNumber to={Math.max(0, cur.xp - prev.xp)} /> XP
      </motion.div>
      <AnimatePresence>{levelUp && <motion.div className="level-up" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1.2, type: 'spring' }}><Sparkles size={18} /> Niveau {cur.level} atteint !</motion.div>}</AnimatePresence>
      <div className="impact-world"><World world={profile.world} items={after} highlight={grew} /></div>
      <div className="counters">
        {counters.map((c, i) => (
          <motion.div key={c.label} className="counter" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.12 }}>
            <span>{c.icon}</span><strong><AnimatedNumber to={c.value} /></strong><small>{c.label}</small>
          </motion.div>
        ))}
      </div>
      <p className="muted">Rituel bouclé en {minutes} min. XP recalculée à partir de tes fiches (débriefs, actions, besoins ouverts, candidats, liens) — ce n’est pas une mesure de performance.</p>
      <button className="cta" onClick={onClose}>Retour à mon territoire</button>
    </div>
  );
}
