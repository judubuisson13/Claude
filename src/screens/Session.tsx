import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ChevronRight, CircleHelp, Keyboard, Loader2, Mic, Pause, Send, SkipForward, Trash2, UserPlus, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Copilot, type CopilotState } from '../components/Copilot';
import { Pill } from '../components/ui';
import { emptyX, type Analysis, type ExchangeX } from '../lib/analysis-schema';
import { checklist, completeness, nextMissing, skipKey, subjectOf, type CheckKey } from '../lib/completeness';
import { empty, type RecordItem } from '../lib/debrief-model';
import { findFrenchDate, shortDate } from '../lib/dates';
import { sessionAgenda } from '../lib/insights';
import { matchNeed, type Match } from '../lib/matching';
import { buildFullPlan, describe, KIND_LABEL } from '../lib/plan';
import { copilotOf, styleOf, type Profile } from '../lib/profile';
import { STAGES } from '../lib/stages';
import { analyse, type Store } from '../lib/store';
import { speak, useVoice } from '../lib/voice';
import { Impact } from './Impact';

type Phase = 'talk' | 'review' | 'saving' | 'impact';
type Line = { role: 'copilot' | 'user'; text: string };
type Pending = { subject: string; key: CheckKey } | null;
const EMPTY: Analysis = { reply: '', exchanges: [], meetings: [], birthdays: [], followUp: '' };
const SEND_WORDS = /(?:^|\s)(?:c'est tout|à toi|envoie|terminé)[.!]?$/i;
const DONT_KNOW = /^(?:je (?:ne )?sais pas|aucune idée|pas d['’]info|je ne sais plus|on verra|passe)\b/i;
const norm = (s: string) => s.trim().toLocaleLowerCase('fr');

/** Applique les réponses directes aux questions du copilote et les profils positionnés depuis le vivier. */
function withOverrides(a: Analysis, overrides: Record<string, string>, positioned: Record<string, string[]>): Analysis {
  return {
    ...a,
    exchanges: a.exchanges.map((e) => {
      const x: ExchangeX = { ...e };
      for (const [k, v] of Object.entries(overrides)) {
        const [subject, key] = k.split('::');
        if (subject === norm(subjectOf(e)) && !String((x as any)[key] || '').trim()) (x as any)[key] = v;
      }
      const extra = positioned[norm(subjectOf(e))] || [];
      if (extra.length) x.resources = Array.from(new Set([...(x.resources || '').split(',').map((s) => s.trim()).filter((s) => s && s !== 'Aucun pour l’instant'), ...extra])).join(', ');
      return x;
    }),
  };
}

/** Ce que les fiches existantes savent déjà ne doit pas être redemandé (fonction d'un contact connu, etc.). */
function enrichFromKnown(a: Analysis, items: RecordItem[]): Analysis {
  const find = (kind: string, name: string, extra: (i: RecordItem) => boolean = () => true) => items.find((i) => i.kind === kind && name && norm(i.data.name || '') === norm(name) && extra(i));
  return {
    ...a,
    exchanges: a.exchanges.map((e) => {
      const x = { ...e };
      const acc = find('account', e.client);
      const c = find('contact', e.contact, (i) => !acc || i.data.accountId === acc.id);
      if (c) { if (!x.role && c.data.role && c.data.role !== 'À préciser') x.role = c.data.role; if (!x.service && c.data.service) x.service = c.data.service; }
      const cand = find('candidate', e.candidate);
      if (cand) { if (!x.candidateRole && cand.data.role !== 'À préciser') x.candidateRole = cand.data.role || ''; if (!x.candidateSkills) x.candidateSkills = cand.data.skills || ''; if (!x.availability && cand.data.availability !== 'À préciser') x.availability = cand.data.availability || ''; }
      const cons = find('consultant', e.consultant);
      if (cons) { if (!x.consultantRole && cons.data.role !== 'À préciser') x.consultantRole = cons.data.role || ''; if (!x.client && cons.data.client) x.client = cons.data.client; }
      return x;
    }),
  };
}

function answerFor(key: CheckKey, text: string) {
  const t = text.trim().replace(/[.!]$/, '');
  // Une réponse qui parle visiblement d'autre chose n'est pas rangée dans le champ demandé.
  if (key !== 'budget' && /\d\s*(?:€|euros?|k€)|\btjm\b/i.test(t)) return '';
  if (key === 'due') return findFrenchDate(t);
  if (key === 'needDeadline') return /asap|au plus vite|urgent|dès que possible/i.test(t) ? 'ASAP' : findFrenchDate(t) || t;
  if (key === 'need' && /^(?:non|aucun|pas de besoin)/i.test(t)) return 'Aucun';
  if (key === 'resources' && /^(?:non|personne|aucun|pas encore)/i.test(t)) return 'Aucun pour l’instant';
  return t.length > 140 ? '' : t;
}

export function Session({ profile, store, onClose }: { profile: Profile; store: Store; onClose: () => void }) {
  const reduce = useReducedMotion();
  const style = styleOf(profile);
  const copilot = copilotOf(profile);
  const agenda = useMemo(() => sessionAgenda(store.items), [store.items]);
  const opening = agenda[0]?.prompt || (profile.role === 'recruiter' ? 'Quels candidats as-tu rencontrés aujourd’hui ? Raconte-moi tout d’un coup.' : 'Raconte-moi ta journée : qui as-tu vu, qu’est-ce qui avance ou bloque ?');

  const [phase, setPhase] = useState<Phase>('talk');
  const [lines, setLines] = useState<Line[]>([{ role: 'copilot', text: `Salut ${profile.name} ! ${opening}` }]);
  const [draft, setDraft] = useState('');
  const [raw, setRaw] = useState<Analysis>(EMPTY);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [positioned, setPositioned] = useState<Record<string, string[]>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<'claude' | 'local' | ''>('');
  const [notice, setNotice] = useState('');
  const [voiceOut, setVoiceOut] = useState(false);
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ before: RecordItem[]; after: RecordItem[]; plan: RecordItem[]; quality: number } | null>(null);
  const [saveError, setSaveError] = useState('');
  const [reviewed, setReviewed] = useState<Analysis | null>(null);
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

  const analysis = useMemo(() => enrichFromKnown(withOverrides(raw, overrides, positioned), store.items), [raw, overrides, positioned, store.items]);
  const plan = useMemo(() => buildFullPlan(analysis, store.items), [analysis, store.items]);
  const visible = plan.filter((r) => r.kind !== 'activity');
  const quality = completeness(analysis.exchanges, skipped);
  const target = profile.dailyMinutes * 60;

  /** Le copilote enchaîne : réponse + la prochaine info manquante (ou la question de l'IA, ou la clôture). */
  function nextTurn(a: Analysis, skip: Set<string>, lead = '') {
    const miss = nextMissing(a.exchanges, skip);
    let say: string;
    if (miss) {
      setPending({ subject: norm(subjectOf(miss.exchange)), key: miss.item.key });
      say = [lead, `Il me manque : ${miss.item.label.toLowerCase()}.`, miss.item.question].filter(Boolean).join(' ');
    } else {
      setPending(null);
      say = [lead, a.exchanges.length ? (a.followUp || 'Ton compte rendu est complet ✨ Un autre client, candidat ou consultant à raconter ? Sinon, passe à la revue.') : 'Je t’écoute : qui as-tu vu aujourd’hui ?'].filter(Boolean).join(' ');
    }
    setTyping(true);
    setTimeout(() => { setTyping(false); setLines((l) => [...l, { role: 'copilot', text: say }]); }, reduce ? 0 : 420);
  }

  async function submit(textArg?: string) {
    const text = (textArg ?? draft).trim();
    if (!text || busy) return;
    if (pending && DONT_KNOW.test(text)) { setDraft(''); setLines((l) => [...l, { role: 'user', text }]); skip(); return; }
    const nextLines: Line[] = [...lines, { role: 'user', text }];
    setLines(nextLines);
    setDraft('');
    setBusy(true);
    setNotice('');
    try {
      const transcript = nextLines.map((l) => `${l.role === 'copilot' ? 'Copilote' : 'Moi'} : ${l.text}`).join('\n');
      const r = await analyse(transcript, { items: store.items, demo: store.mode === 'demo', history: [], persona: `${style.title} (${style.verb})` }, store.status.reachable);
      // Réponse directe à la question posée : si l'analyse ne l'a pas rattachée, on la range nous-mêmes.
      const ov = { ...overrides };
      if (pending) {
        const eff = enrichFromKnown(withOverrides(r.analysis, ov, positioned), store.items).exchanges.find((e) => norm(subjectOf(e)) === pending.subject);
        if (eff && !String(eff[pending.key] || '').trim()) {
          const v = answerFor(pending.key, text);
          if (v) ov[`${pending.subject}::${pending.key}`] = v;
        }
      }
      setOverrides(ov);
      setRaw(r.analysis);
      setEngine(r.engine);
      if (r.warning) setNotice(r.warning);
      nextTurn(enrichFromKnown(withOverrides(r.analysis, ov, positioned), store.items), skipped, r.analysis.reply);
    } catch {
      setNotice('Analyse impossible pour le moment. Ton récit est conservé, réessaie.');
      setLines(lines);
      setDraft(text);
    } finally {
      setBusy(false);
    }
  }

  function skip(all = false) {
    if (!pending) return;
    const s = new Set(skipped);
    const e = analysis.exchanges.find((x) => norm(subjectOf(x)) === pending.subject);
    if (all && e) checklist(e).forEach((c) => s.add(skipKey(e, c.key)));
    else s.add(`${pending.subject}::${pending.key}`);
    setSkipped(s);
    nextTurn(analysis, s, all ? 'D’accord, on passe à la suite.' : 'Pas de souci, je le note comme à compléter.');
  }

  function position(e: ExchangeX, m: Match) {
    const key = norm(subjectOf(e));
    const next = { ...positioned, [key]: Array.from(new Set([...(positioned[key] || []), m.person.data.name])) };
    setPositioned(next);
    const a = enrichFromKnown(withOverrides(raw, overrides, next), store.items);
    nextTurn(a, skipped, `${m.person.data.name} est positionné${m.person.kind === 'candidate' ? '' : ''} sur « ${e.need} ».`);
  }

  const askTopic = (prompt: string) => { setPending(null); setLines((l) => [...l, { role: 'copilot', text: prompt }]); };

  async function save(edited: Analysis) {
    setPhase('saving');
    setSaveError('');
    const before = store.items;
    const finalPlan = buildFullPlan(edited, before);
    try {
      const after = await store.commitPlan(finalPlan);
      setResult({ before, after, plan: finalPlan, quality: completeness(edited.exchanges, skipped) });
      setPhase('impact');
    } catch (e) {
      // Échec : pas de récompense fictive, les réponses restent modifiables.
      setSaveError((e as Error).message);
      setReviewed(edited);
      setPhase('review');
    }
  }

  const copilotState: CopilotState = typing || busy ? 'thinking' : voice.listening ? 'listening' : 'talking';

  return (
    <motion.div className="session" style={{ '--accent': style.color, '--accent-soft': style.soft } as React.CSSProperties} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <header className="session-top">
        <TimerRing elapsed={elapsed} target={target} color={style.color} />
        <div className="session-title">
          <strong>{phase === 'talk' ? 'Débrief du jour' : phase === 'review' ? 'Revue avant écriture' : phase === 'impact' ? 'Ta croissance' : 'Enregistrement…'}</strong>
          <span>{store.mode === 'demo' ? 'Démo · données fictives' : 'Mon espace'}{engine && ` · analyse ${engine === 'claude' ? 'IA Claude' : 'locale'}`}</span>
        </div>
        {phase === 'talk' && <button className="icon-btn" aria-label={voiceOut ? 'Couper la voix du copilote' : 'Faire parler le copilote'} onClick={() => setVoiceOut(!voiceOut)}>{voiceOut ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>}
        <button className="icon-btn" aria-label="Quitter la session" onClick={() => { voice.stop(); onClose(); }}><X size={22} /></button>
        {phase === 'talk' && (
          <div className="quality-bar" aria-label={`Compte rendu complet à ${Math.round(quality * 100)} %`}>
            <motion.i animate={{ width: `${Math.round(quality * 100)}%` }} transition={{ type: 'spring', stiffness: 70 }} />
            <span>Compte rendu complet à {Math.round(quality * 100)} %</span>
          </div>
        )}
      </header>

      {phase === 'talk' && (
        <div className="session-body">
          <section className="stage">
            {agenda.length > 0 && (
              <div className="agenda" aria-label="Sujets du jour">
                {agenda.map((a, i) => <motion.button key={a.id} className="agenda-chip" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i }} onClick={() => askTopic(a.prompt)}>{a.icon} {a.label}</motion.button>)}
              </div>
            )}
            <div className="duo">
              <Copilot id={copilot.id} color={copilot.color} state={copilotState} level={voice.level} size={120} />
              <div className="bubble-stack" aria-live="polite">
                <AnimatePresence mode="popLayout">
                  {typing ? (
                    <motion.div key="typing" className="bubble copilot typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><i /><i /><i /></motion.div>
                  ) : (
                    <motion.div key={lastCopilot} className={'bubble copilot' + (pending ? ' asking' : '')} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
                      <small>{copilot.name}</small>
                      {lastCopilot}
                    </motion.div>
                  )}
                </AnimatePresence>
                {pending && !typing && (
                  <motion.div className="quick-answers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <button onClick={() => skip()}><CircleHelp size={15} /> Je ne sais pas</button>
                    <button onClick={() => skip(true)}><SkipForward size={15} /> Sujet suivant</button>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="transcript">
              {lines.filter((l) => l.role === 'user').slice(-2).map((l, i) => <motion.p key={i + l.text.slice(0, 12)} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}>« {l.text} »</motion.p>)}
              <textarea
                aria-label="Ton récit"
                value={draft + (voice.interim ? (draft ? ' ' : '') + voice.interim : '')}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder={pending ? 'Ta réponse…' : 'Appuie sur le micro et parle… ou écris ici.'}
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
            <p className="hint">Finis par « c’est tout » pour envoyer à la voix · réponds « je ne sais pas » pour passer.</p>
          </section>

          <aside className="stack" aria-label="Compte rendu en cours">
            {analysis.exchanges.map((e, i) => <SubjectCard key={subjectOf(e) + i} e={e} items={store.items} skipped={skipped} pending={pending} onPosition={(m) => position(e, m)} />)}
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
                    {r.kind === 'opportunity' && (r.data.budgetNote || r.data.deadline) && <small>{[r.data.budgetNote !== 'À confirmer' && r.data.budgetNote, r.data.deadline && '⏳ ' + (/^\d{4}/.test(r.data.deadline) ? shortDate(r.data.deadline) : r.data.deadline)].filter(Boolean).join(' · ')}</small>}
                    {r.kind === 'contact' && r.data.birth && <small>🎂 anniversaire noté</small>}
                  </motion.div>
                ))}
              </AnimatePresence>
              {!visible.length && <p className="empty">Parle de tes rendez-vous : fiches, besoins, next steps et événements apparaîtront ici.</p>}
            </div>
            <button className="cta" disabled={!analysis.exchanges.length && !analysis.meetings.length} onClick={() => { voice.stop(); setReviewed(null); setPhase('review'); }}>
              Passer à la revue <ChevronRight size={18} />
            </button>
          </aside>
        </div>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <Review initial={reviewed || analysis} items={store.items} saving={phase === 'saving'} error={saveError} demo={store.mode === 'demo'} onBack={() => setPhase('talk')} onSave={save} />
      )}

      {phase === 'impact' && result && <Impact profile={profile} {...result} demo={store.mode === 'demo'} minutes={Math.max(1, Math.round(elapsed / 60))} onClose={onClose} />}
    </motion.div>
  );
}

function SubjectCard({ e, items, skipped, pending, onPosition }: { e: ExchangeX; items: RecordItem[]; skipped: Set<string>; pending: Pending; onPosition: (m: Match) => void }) {
  const list = checklist(e);
  const done = list.filter((c) => c.ok || skipped.has(skipKey(e, c.key))).length;
  const subject = norm(subjectOf(e));
  const already = (e.resources || '').split(',').map((s) => norm(s));
  const matches = e.need && e.need !== 'Aucun' && (e.skills || e.need) ? matchNeed(e.skills || e.need, items).filter((m) => !already.includes(norm(m.person.data.name))).slice(0, 3) : [];
  return (
    <motion.div layout className="subject-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <header>
        <strong>{subjectOf(e)}</strong>
        <span className={done === list.length ? 'full' : ''}>{done}/{list.length}</span>
      </header>
      <div className="checks">
        {list.map((c) => {
          const isSkipped = !c.ok && skipped.has(skipKey(e, c.key));
          const now = pending?.subject === subject && pending.key === c.key;
          return (
            <motion.span key={c.key} layout className={'check-chip' + (c.ok ? ' ok' : isSkipped ? ' skip' : '') + (now ? ' now' : '')} animate={c.ok ? { scale: [1.25, 1] } : {}} transition={{ type: 'spring' }} title={c.ok ? String(e[c.key]) : isSkipped ? 'À compléter plus tard' : 'Manquant'}>
              {c.ok ? <Check size={12} /> : isSkipped ? '…' : '?'} {c.label}
            </motion.span>
          );
        })}
      </div>
      {e.resources && <p className="resources">👥 {e.resources}</p>}
      {matches.length > 0 && (
        <div className="matches">
          <small>🎯 Dans ton vivier pour « {e.need} »</small>
          {matches.map((m) => (
            <motion.div key={m.person.id} className="match" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <span className="who"><b>{m.person.data.name}</b><small>{m.person.kind === 'candidate' ? 'Candidat' : 'Consultant'} · {m.seen}</small></span>
              <span className="skills">{m.matched.map((s) => <i key={s} className="ok">{s}</i>)}{m.missing.map((s) => <i key={s}>{s}</i>)}</span>
              <button aria-label={'Positionner ' + m.person.data.name} onClick={() => onPosition(m)}><UserPlus size={15} /></button>
            </motion.div>
          ))}
        </div>
      )}
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

const FIELDS: { key: CheckKey; label: string }[] = [
  { key: 'client', label: 'Compte' }, { key: 'contact', label: 'Interlocuteur' }, { key: 'role', label: 'Fonction' }, { key: 'service', label: 'Service' },
  { key: 'need', label: 'Besoin' }, { key: 'skills', label: 'Compétences' }, { key: 'budget', label: 'Budget / TJM' }, { key: 'needDeadline', label: 'Deadline du besoin' }, { key: 'resources', label: 'Ressources identifiées' },
  { key: 'action', label: 'Next step' }, { key: 'owner', label: 'Qui' }, { key: 'due', label: 'Échéance' },
  { key: 'candidate', label: 'Candidat' }, { key: 'candidateRole', label: 'Poste visé' }, { key: 'candidateSkills', label: 'Compétences candidat' }, { key: 'availability', label: 'Disponibilité' },
  { key: 'consultant', label: 'Consultant' }, { key: 'consultantRole', label: 'Expertise' }, { key: 'hotTopic', label: 'Sujet chaud' },
];

function Review({ initial, items, saving, error, demo, onBack, onSave }: { initial: Analysis; items: RecordItem[]; saving: boolean; error: string; demo: boolean; onBack: () => void; onSave: (a: Analysis) => void }) {
  const [a, setA] = useState<Analysis>(initial);
  const plan = useMemo(() => buildFullPlan(a, items), [a, items]);
  const creations = plan.filter((r) => r.version === 1 && r.kind !== 'activity');
  const updates = plan.filter((r) => r.version > 1);
  const setEx = (i: number, patch: Partial<ExchangeX>) => setA({ ...a, exchanges: a.exchanges.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  const badDate = a.exchanges.some((e) => e.due && !/^\d{4}-\d{2}-\d{2}$/.test(e.due));

  return (
    <div className="review">
      <div className="review-summary">
        {[[creations.length, 'créations'], [updates.length, 'mises à jour'], [plan.filter((r) => r.kind === 'task').length, 'next steps'], [a.meetings.length, 'événements']].map(([n, l], i) => (
          <motion.div key={l as string} className="sum-tile" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.08 }}><strong>{n}</strong><span>{l}</span></motion.div>
        ))}
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}

      {a.exchanges.map((e, i) => {
        const missing = checklist(e).filter((c) => !c.ok);
        return (
          <motion.article key={i} className="ex-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
            <header>
              <strong>{subjectOf(e) === 'ce sujet' ? 'Sujet ' + (i + 1) : subjectOf(e)}</strong>
              <select aria-label="Étape" value={e.stage} onChange={(ev) => setEx(i, { stage: ev.target.value })} disabled={!e.need}>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="icon-btn" aria-label="Retirer ce sujet" onClick={() => setA({ ...a, exchanges: a.exchanges.filter((_, k) => k !== i) })}><Trash2 size={16} /></button>
            </header>
            {missing.length > 0 && <div className="missing">Encore à compléter : {missing.map((m) => <Pill key={m.key} tone="warn">{m.label}</Pill>)}</div>}
            <p className="story">{e.story}</p>
            <div className="ex-grid">
              {FIELDS.filter((f) => e[f.key] || checklist(e).some((c) => c.key === f.key)).map((f) => (
                <label key={f.key} className={!e[f.key] ? 'empty-field' : ''}>
                  <span>{f.label}</span>
                  <input value={String(e[f.key] || '')} type={f.key === 'due' ? 'date' : 'text'} onChange={(ev) => setEx(i, { [f.key]: ev.target.value } as Partial<ExchangeX>)} placeholder={f.key === 'budget' ? 'Non évoqué' : '—'} />
                </label>
              ))}
            </div>
            {e.stage !== 'À qualifier' && e.need && (
              <label className="evidence"><span>Preuve de l’étape « {e.stage} »</span><input value={e.evidence} onChange={(ev) => setEx(i, { evidence: ev.target.value })} /></label>
            )}
          </motion.article>
        );
      })}
      <button className="ghost add" onClick={() => setA({ ...a, exchanges: [...a.exchanges, emptyX({ ...empty(), story: 'Ajout manuel' })] })}>+ Ajouter un sujet</button>

      {(a.meetings.length > 0 || a.birthdays.length > 0) && (
        <div className="ex-card">
          <header><strong>Agenda & dates clés</strong></header>
          {a.meetings.map((m, i) => (
            <div className="row-line" key={'m' + i}>
              📅 <input aria-label="Titre" value={m.title} onChange={(ev) => setA({ ...a, meetings: a.meetings.map((x, k) => (k === i ? { ...x, title: ev.target.value } : x)) })} />
              <input aria-label="Date" type="date" value={m.date} onChange={(ev) => setA({ ...a, meetings: a.meetings.map((x, k) => (k === i ? { ...x, date: ev.target.value } : x)) })} />
              <input aria-label="Heure" type="time" value={m.time} onChange={(ev) => setA({ ...a, meetings: a.meetings.map((x, k) => (k === i ? { ...x, time: ev.target.value } : x)) })} />
              <button className="icon-btn" aria-label="Retirer" onClick={() => setA({ ...a, meetings: a.meetings.filter((_, k) => k !== i) })}><Trash2 size={16} /></button>
            </div>
          ))}
          {a.birthdays.map((b, i) => {
            const known = [...items, ...plan].some((x) => x.kind === b.kind && norm(x.data.name || '') === norm(b.name));
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
