import { motion } from 'motion/react';
import { Copy, Loader2, Mail, RefreshCw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Pill, Sheet } from '../components/ui';
import { today, type RecordItem } from '../lib/debrief-model';
import { computeInsights, type Insight } from '../lib/insights';
import { compose, type Store } from '../lib/store';

const FILTERS = [
  { id: 'all', label: 'Tout' }, { id: 'birthday', label: '🎂 Anniversaires' }, { id: 'stale', label: '🥀 Relances' },
  { id: 'overdue', label: '⏰ Retards' }, { id: 'mission', label: '🧭 Missions' }, { id: 'cv', label: '📄 CV' }, { id: 'budget', label: '💶 Budgets' },
];

export function Radar({ store, onInsight, onOpen }: { store: Store; onInsight: (i: Insight) => void; onOpen: (r: RecordItem) => void }) {
  const [filter, setFilter] = useState('all');
  const insights = computeInsights(store.items).filter((i) => filter === 'all' || i.type === filter);
  return (
    <div className="page">
      <h1>Radar</h1>
      <p className="muted">Ton copilote surveille les dates et les silences pour toi. Rien n’est envoyé sans toi.</p>
      <div className="chips scroll">{FILTERS.map((f) => <button key={f.id} className={'chip' + (filter === f.id ? ' on' : '')} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>
      <div className="insight-list">
        {insights.map((i, n) => (
          <motion.div key={i.id} className={'insight big u' + i.urgency} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: Math.min(n, 10) * 0.04 }}>
            <span className="ico">{i.icon}</span>
            <span><strong>{i.title}</strong><small>{i.detail}</small></span>
            <div className="insight-actions">
              {i.compose && <button className="primary sm" onClick={() => onInsight(i)}><Send size={14} /> Message</button>}
              {i.recordId && <button className="ghost sm" onClick={() => { const r = store.items.find((x) => x.id === i.recordId); if (r) onOpen(r); }}>Fiche</button>}
            </div>
          </motion.div>
        ))}
        {!insights.length && <p className="empty">Rien à signaler ici.</p>}
      </div>
    </div>
  );
}

/** Rédaction assistée : proposition IA (ou modèle), édition, copie / e-mail. L'envoi reste une décision de l'utilisateur. */
export function Composer({ insight, store, sender, onClose, onSent }: { insight: Insight | null; store: Store; sender: string; onClose: () => void; onSent: (msg: string) => void }) {
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState('');
  const record = store.items.find((r) => r.id === insight?.recordId);
  const email: string = record?.data.email || '';

  const generate = async () => {
    if (!insight?.compose) return;
    setBusy(true);
    const details = record ? Object.entries(record.data).filter(([k, v]) => typeof v === 'string' && v && !['birth', 'avatar'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('; ').slice(0, 800) : '';
    const r = await compose({ kind: insight.compose, person: insight.person || '', details, client: record?.data.client, sender }, store.status.reachable).catch(() => null);
    if (r) { setText(r.message); setSubject(r.subject); setEngine(r.engine); }
    setBusy(false);
  };
  useEffect(() => { if (insight) { setText(''); generate(); } /* eslint-disable-next-line */ }, [insight?.id]);

  const markSent = async () => {
    // Une relance de compte envoyée met à jour la date de dernier contact (fiche réelle).
    if (record?.kind === 'account') {
      try { await store.saveOne({ ...record, data: { ...record.data, lastContact: today() } }); } catch { /* conflit : on ne bloque pas l'utilisateur */ }
    }
    onSent('Bien joué ! Relation entretenue ✨');
    onClose();
  };

  return (
    <Sheet open={!!insight} onClose={onClose} title={insight?.title || ''}>
      <div className="composer">
        <div className="row-between"><small className="muted">{busy ? 'Rédaction…' : engine === 'claude' ? 'Proposition rédigée par l’IA — relis avant d’envoyer' : 'Modèle de message — personnalise-le'}</small>
          <button className="ghost sm" onClick={generate} disabled={busy}><RefreshCw size={14} /> Autre version</button></div>
        {subject && <input className="subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Objet" />}
        <div className="composer-box">
          {busy && <div className="composer-loading"><Loader2 className="spin" /></div>}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} aria-label="Message" />
        </div>
        <div className="composer-actions">
          <button className="ghost" onClick={() => navigator.clipboard?.writeText(text)}><Copy size={16} /> Copier</button>
          <a className="ghost" href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}><Mail size={16} /> E-mail</a>
          <button className="cta" onClick={markSent}>J’ai envoyé ✓</button>
        </div>
        {!email && <Pill tone="neutral">Pas d’e-mail sur la fiche : copie le message vers LinkedIn, SMS ou ta messagerie.</Pill>}
      </div>
    </Sheet>
  );
}
