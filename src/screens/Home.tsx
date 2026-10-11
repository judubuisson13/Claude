import { motion } from 'motion/react';
import { ArrowRight, Check, Flame, Mic } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Copilot } from '../components/Copilot';
import { World } from '../components/World';
import { Pill, XpBar } from '../components/ui';
import { today, type RecordItem } from '../lib/debrief-model';
import { relativeDay } from '../lib/dates';
import { gameProgress, kpis, streak } from '../lib/game';
import { computeInsights, sessionAgenda, type Insight } from '../lib/insights';
import { copilotOf, styleOf, worlds, type Profile } from '../lib/profile';
import type { Store } from '../lib/store';

type Props = { profile: Profile; store: Store; onStart: () => void; onOpen: (r: RecordItem) => void; onInsight: (i: Insight) => void; onTaskDone: (t: RecordItem) => void; goRadar: () => void; onWrap: () => void };

export function Home({ profile, store, onStart, onOpen, onInsight, onTaskDone, goRadar, onWrap }: Props) {
  const style = styleOf(profile);
  const copilot = copilotOf(profile);
  const items = store.items;
  const p = gameProgress(items);
  const s = streak(items);
  const agenda = sessionAgenda(items);
  const insights = computeInsights(items);
  const k = kpis(items);
  const tasks = items.filter((i) => i.kind === 'task' && i.data.status !== 'Terminé').sort((a, b) => (a.data.due || '9999').localeCompare(b.data.due || '9999')).slice(0, 5);
  const people = [...items.filter((i) => i.kind === 'consultant'), ...items.filter((i) => i.kind === 'candidate')].slice(0, 10);
  const goals = items.filter((i) => i.kind === 'goal');

  const sections: Record<string, React.ReactNode> = {
    missions: (
      <Card key="missions" title="Tes missions" sub="Next steps à venir">
        {tasks.map((t) => {
          const late = t.data.due && t.data.due < today();
          return (
            <motion.div layout key={t.id} className="task-row">
              <motion.button className="check" aria-label={'Terminer : ' + t.data.title} whileTap={{ scale: 0.8 }} onClick={() => onTaskDone(t)}><Check size={16} /></motion.button>
              <button className="task-text" onClick={() => onOpen(t)}><strong>{t.data.title}</strong><small className={late ? 'late' : ''}>{relativeDay(t.data.due)}{t.data.client ? ' · ' + t.data.client : ''}</small></button>
              {t.data.priority === 'Haute' && <Pill tone="hot">Haute</Pill>}
            </motion.div>
          );
        })}
        {!tasks.length && <p className="empty">Aucune mission ouverte. Ton prochain débrief en créera.</p>}
      </Card>
    ),
    radar: (
      <Card key="radar" title="Le radar de ton copilote" sub="Anniversaires, relances, retards" action={<button className="link" onClick={goRadar}>Tout voir <ArrowRight size={14} /></button>}>
        {insights.slice(0, 4).map((i, n) => (
          <motion.button key={i.id} className={'insight u' + i.urgency} onClick={() => onInsight(i)} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: n * 0.06 }}>
            <span className="ico">{i.icon}</span><span><strong>{i.title}</strong><small>{i.detail}</small></span>{i.compose && <Pill tone="info">Message</Pill>}
          </motion.button>
        ))}
        {!insights.length && <p className="empty">Rien d’urgent. Profite !</p>}
      </Card>
    ),
    team: (
      <Card key="team" title="Ton équipe" sub={`${k.consultants} en mission · ${k.candidates} candidats`}>
        <div className="team-row">
          {people.map((pp, i) => (
            <motion.button key={pp.id} className="mate" onClick={() => onOpen(pp)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04, type: 'spring' }} whileHover={{ y: -4 }}>
              <span>{pp.data.avatar || (pp.kind === 'candidate' ? '🧑‍💻' : '🧑‍🚀')}</span>
              <small>{pp.data.name?.split(' ')[0]}</small>
              <i className={pp.kind} />
            </motion.button>
          ))}
          {!people.length && <p className="empty">Tes consultants et candidats apparaîtront ici.</p>}
        </div>
      </Card>
    ),
    scores: (
      <Card key="scores" title="Tes indicateurs" sub="Calculés depuis tes fiches">
        <div className="kpi-grid">
          {[['Comptes', k.accounts], ['Besoins ouverts', k.openNeeds], ['En mission', k.consultants], ['Débriefs', k.debriefs]].map(([l, v], i) => (
            <motion.div key={l as string} className="kpi" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}><strong>{v}</strong><small>{l}</small></motion.div>
          ))}
        </div>
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((Number(g.data.current) / Math.max(1, Number(g.data.target))) * 100));
          return (
            <div key={g.id} className="goal">
              <div className="row-between"><span>{g.data.title}</span><small>{g.data.current} / {g.data.target} {g.data.unit}</small></div>
              <div className="bar"><motion.i style={{ background: style.color }} initial={{ width: 0 }} animate={{ width: pct + '%' }} transition={{ type: 'spring', stiffness: 60 }} /></div>
            </div>
          );
        })}
      </Card>
    ),
  };
  const order = { missions: ['missions', 'radar', 'team', 'scores'], radar: ['radar', 'missions', 'team', 'scores'], team: ['team', 'radar', 'missions', 'scores'], scores: ['scores', 'missions', 'radar', 'team'] }[style.focus];

  return (
    <div className="home">
      <header className="hud">
        <Avatar look={profile.look} color={style.color} size={58} level={p.level} />
        <div className="hud-info">
          <div className="row-between"><strong>{profile.name}</strong>{store.mode === 'demo' ? <Pill tone="warn">Démo</Pill> : <Pill tone="good">Mon espace</Pill>}</div>
          <small>{style.title} · {worlds[profile.world].label}</small>
          <XpBar into={p.into} next={p.next} color={style.color} />
        </div>
        <motion.div className={'streak' + (s.doneToday ? ' on' : '')} title="Jours consécutifs avec un débrief" animate={s.doneToday ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity }}>
          <Flame size={18} /> {s.days}
        </motion.div>
      </header>

      <section className="world-card-big">
        <World world={profile.world} items={items} level={p.level} onPick={onOpen} />
        <div className="world-caption">{worlds[profile.world].title} · touche un {worlds[profile.world].unit} pour ouvrir la fiche</div>
      </section>

      <motion.button className={'ritual' + (s.doneToday ? ' done' : '')} onClick={onStart} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <div className="ritual-copilot"><Copilot id={copilot.id} color={copilot.color} size={70} state={s.doneToday ? 'happy' : 'idle'} /></div>
        <div className="ritual-text">
          <small>{s.doneToday ? 'Débrief fait aujourd’hui ✓' : `Ton rituel · ${profile.dailyMinutes} min`}</small>
          <strong>{s.doneToday ? 'Un sujet à ajouter ?' : 'Raconte ta journée à ' + copilot.name}</strong>
          <span>{agenda.length ? `${agenda.length} sujet${agenda.length > 1 ? 's' : ''} préparé${agenda.length > 1 ? 's' : ''} : ${agenda.slice(0, 2).map((a) => a.label).join(', ')}` : 'Fiches, next steps et événements créés automatiquement.'}</span>
        </div>
        <span className="ritual-mic"><Mic size={26} /></span>
      </motion.button>

      <motion.button className="wrap-teaser" onClick={onWrap} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <span>🎞️</span><div><strong>Ton Wrap de la semaine</strong><small>Ce qui s’est passé pour toi, en stories</small></div><ArrowRight size={18} />
      </motion.button>

      <div className="home-grid">{order.map((o) => sections[o])}</div>
    </div>
  );
}

function Card({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section className="card" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
      <header className="card-head"><div><h3>{title}</h3>{sub && <small>{sub}</small>}</div>{action}</header>
      {children}
    </motion.section>
  );
}
