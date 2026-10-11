import { AnimatePresence, motion } from 'motion/react';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Pill, Sheet } from '../components/ui';
import type { RecordItem } from '../lib/debrief-model';
import { relativeDay, shortDate } from '../lib/dates';
import { relationshipCoverage } from '../lib/game';
import { describe, KIND_LABEL } from '../lib/plan';
import type { Store } from '../lib/store';

const TABS = ['account', 'contact', 'opportunity', 'task', 'consultant', 'candidate', 'meeting', 'activity', 'topic'] as const;
const TAB_LABEL: Record<string, string> = { account: 'Comptes', contact: 'Contacts', opportunity: 'Besoins', task: 'Next steps', consultant: 'Consultants', candidate: 'Candidats', meeting: 'Agenda', activity: 'Comptes rendus', topic: 'Sujets chauds' };
const HIDDEN = new Set(['details', 'relatedIds', 'links', 'missing', 'accounts', 'consultants', 'candidates', 'opportunities', 'actions', 'steps', 'requirements']);

export function Crm({ store, onOpen }: { store: Store; onOpen: (r: RecordItem) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('account');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('fr');
    return store.items
      .filter((i) => i.kind === tab && (!t || JSON.stringify(i.data).toLocaleLowerCase('fr').includes(t)))
      .sort((a, b) => (tab === 'activity' ? (b.data.createdAt || '').localeCompare(a.data.createdAt || '') : tab === 'task' || tab === 'meeting' ? (a.data.due || a.data.date || '9').localeCompare(b.data.due || b.data.date || '9') : describe(a).localeCompare(describe(b))));
  }, [store.items, tab, q]);

  return (
    <div className="page">
      <h1>CRM</h1>
      <p className="muted">Le détail, en second niveau. Tout ce que ton copilote a rangé, modifiable à la main.</p>
      <label className="search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom, une techno, un client…" /></label>
      <div className="chips scroll">
        {TABS.map((t) => <button key={t} className={'chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{TAB_LABEL[t]} <b>{store.items.filter((i) => i.kind === t).length}</b></button>)}
      </div>
      <motion.div layout className="crm-list">
        <AnimatePresence mode="popLayout">
          {list.map((r) => (
            <motion.button layout key={r.id} className="crm-row" onClick={() => onOpen(r)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <strong>{describe(r)}</strong>
              <RowMeta r={r} items={store.items} />
            </motion.button>
          ))}
        </AnimatePresence>
        {!list.length && <p className="empty">Rien ici pour l’instant.</p>}
      </motion.div>
      <button className="fab" aria-label={'Ajouter : ' + TAB_LABEL[tab]} onClick={() => onOpen({ id: crypto.randomUUID(), kind: tab, version: 0, data: tab === 'task' ? { title: '', status: 'À faire', priority: 'Normale', due: '' } : ['opportunity', 'meeting', 'activity', 'topic'].includes(tab) ? { title: '' } : { name: '' } })}><Plus size={24} /></button>
    </div>
  );
}

function RowMeta({ r, items }: { r: RecordItem; items: RecordItem[] }) {
  const d = r.data;
  switch (r.kind) {
    case 'account': return <small>{d.sector} · relation {relationshipCoverage(items, d.name)}/6 · dernier contact {relativeDay(d.lastContact)}</small>;
    case 'contact': return <small>{items.find((a) => a.id === d.accountId)?.data.name || '—'} · {d.service || 'service ?'}</small>;
    case 'opportunity': return <small><Pill tone={d.stage === 'Gagné' ? 'good' : d.stage === 'Perdu' ? 'neutral' : 'info'}>{d.stage}</Pill> {d.budgetNote}</small>;
    case 'task': return <small><Pill tone={d.status === 'Terminé' ? 'good' : d.due && d.due < new Date().toISOString().slice(0, 10) ? 'hot' : 'neutral'}>{d.status}</Pill> {shortDate(d.due)} · {d.owner || 'Moi'}</small>;
    case 'consultant': return <small>{d.status} · {d.client || '—'} · suivi {relativeDay(d.followUp)}</small>;
    case 'candidate': return <small>{d.status} · {d.availability} {d.cvRequired ? '· CV manquant' : ''}</small>;
    case 'meeting': return <small>{shortDate(d.date)} {d.time} · {d.type}</small>;
    case 'activity': return <small>{d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : ''} · complétude {d.completeness ?? '—'}%</small>;
    default: return <small>{d.status || ''}</small>;
  }
}

/** Fiche détaillée : champs modifiables + liens vers les fiches reliées. */
export function RecordSheet({ record, store, onClose, onOpen, onSaved }: { record: RecordItem | null; store: Store; onClose: () => void; onOpen: (r: RecordItem) => void; onSaved: (msg: string) => void }) {
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const key = record?.id + ':' + record?.version;
  const [seen, setSeen] = useState('');
  if (record && seen !== key) { setSeen(key); setDraft({ ...record.data }); setError(''); }
  if (!record) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const isNew = record.version === 0;
  const fields = Object.entries(draft).filter(([k, v]) => !HIDDEN.has(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'));
  const linked = store.items.filter((i) => i.id !== record.id && (Object.values(i.data).includes(record.id) || (i.data.relatedIds || []).includes(record.id) || Object.entries(record.data).some(([k, v]) => k.endsWith('Id') && v === i.id) || (record.data.relatedIds || []).includes(i.id)));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await store.saveOne({ ...record, data: draft }, isNew);
      onSaved(isNew ? 'Fiche créée ✨' : 'Fiche mise à jour');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={(KIND_LABEL[record.kind] || record.kind) + (isNew ? ' · nouveau' : ' · ' + describe(record))} wide>
      <div className="record">
        {record.kind === 'activity' && record.data.text && <blockquote>{record.data.text}</blockquote>}
        {record.kind === 'activity' && (record.data.missing || []).length > 0 && <div className="missing">{record.data.missing.map((m: string) => <Pill key={m} tone="warn">{m}</Pill>)}</div>}
        <div className="field-grid">
          {fields.map(([k, v]) => (
            <label key={k}>
              <span>{k}</span>
              {typeof v === 'boolean' ? <input type="checkbox" checked={v} onChange={(e) => setDraft({ ...draft, [k]: e.target.checked })} />
                : <input value={String(v)} type={typeof v === 'number' ? 'number' : /^(due|date|lastContact|nextContact|followUp|birth|missionStart)$/.test(k) && /^\d{4}-\d{2}-\d{2}$|^$/.test(String(v)) ? 'date' : 'text'} onChange={(e) => setDraft({ ...draft, [k]: typeof v === 'number' ? Number(e.target.value) : e.target.value })} />}
            </label>
          ))}
          {isNew && fields.length < 2 && <p className="muted">Commence par le nom ; les autres champs seront ajoutés par tes débriefs.</p>}
        </div>
        {linked.length > 0 && (
          <div className="linked">
            <strong>Fiches reliées</strong>
            {linked.map((l) => <button key={l.id} className="linked-row" onClick={() => onOpen(l)}><Pill tone="info">{KIND_LABEL[l.kind]}</Pill> {describe(l)}</button>)}
          </div>
        )}
        {error && <p className="notice error" role="alert">{error}</p>}
        <div className="review-actions">
          <button className="ghost" onClick={onClose}>Annuler</button>
          <button className="cta" disabled={saving} onClick={save}>{store.mode === 'demo' ? 'Enregistrer (démo)' : 'Enregistrer'}</button>
        </div>
      </div>
    </Sheet>
  );
}
