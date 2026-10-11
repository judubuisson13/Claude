import { Download, Pencil, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Copilot } from '../components/Copilot';
import { Pill } from '../components/ui';
import { gameProgress, kpis } from '../lib/game';
import { copilotOf, styleOf, worlds, type Profile, type WorldId } from '../lib/profile';
import type { Store } from '../lib/store';
import type { Period } from '../lib/wrapped';

export function Me({ profile, store, onEdit, onProfile, onToast, onWrap }: { profile: Profile; store: Store; onEdit: () => void; onProfile: (p: Profile) => void; onToast: (t: string) => void; onWrap: (p: Period) => void }) {
  const style = styleOf(profile);
  const copilot = copilotOf(profile);
  const p = gameProgress(store.items);
  const k = kpis(store.items);
  const file = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  const doImport = async (f: File) => {
    try {
      const json = JSON.parse(await f.text());
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setImportMsg(`${body.created} fiche(s) importée(s), ${body.skipped} déjà présente(s) (non écrasées).`);
      store.reload();
    } catch (e) {
      setImportMsg('Import impossible : ' + (e as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="me-hero" style={{ '--accent': style.color } as React.CSSProperties}>
        <Avatar look={profile.look} color={style.color} size={120} mood="idle" level={p.level} />
        <div>
          <h1>{profile.name}</h1>
          <p>{style.title} · {style.verb}</p>
          <p className="muted">{p.xp} XP · niveau {p.level} · {k.debriefs} débriefs</p>
          <button className="ghost" onClick={onEdit}><Pencil size={16} /> Modifier mon personnage</button>
        </div>
        <Copilot id={copilot.id} color={copilot.color} size={70} />
      </div>

      <section className="card">
        <header className="card-head"><h3>Tes Wraps</h3></header>
        <div className="chips"><button className="chip" onClick={() => onWrap('week')}>🎞️ Semaine</button><button className="chip" onClick={() => onWrap('month')}>📆 Mois</button><button className="chip" onClick={() => onWrap('year')}>🏆 Année</button></div>
      </section>

      <section className="card">
        <header className="card-head"><h3>Univers</h3></header>
        <div className="chips">{(Object.keys(worlds) as WorldId[]).map((w) => <button key={w} className={'chip' + (profile.world === w ? ' on' : '')} onClick={() => onProfile({ ...profile, world: w })}>{worlds[w].icon} {worlds[w].label}</button>)}</div>
      </section>

      <section className="card">
        <header className="card-head"><h3>Données</h3>{store.mode === 'demo' ? <Pill tone="warn">Démo · fictif</Pill> : <Pill tone="good">Mon espace</Pill>}</header>
        <p className="muted">
          {store.status.reachable
            ? `Serveur connecté · analyse ${store.status.ai ? 'IA Claude' : 'locale (ajoute ANTHROPIC_API_KEY côté serveur pour l’IA)'}.`
            : 'Serveur non joignable : seul le mode démo est disponible.'}
        </p>
        <div className="chips">
          <button className={'chip' + (store.mode === 'server' ? ' on' : '')} disabled={!store.status.reachable} onClick={() => store.setMode('server')}>Mon espace (réel)</button>
          <button className={'chip' + (store.mode === 'demo' ? ' on' : '')} onClick={() => store.setMode('demo')}>Démo (fictif)</button>
        </div>
        {store.mode === 'demo' && <button className="ghost" onClick={() => { store.resetDemo(); onToast('Démo réinitialisée'); }}><RotateCcw size={16} /> Réinitialiser la démo</button>}
        {store.mode === 'server' && (
          <div className="chips">
            <a className="ghost" href="/api/export" download><Download size={16} /> Exporter (JSON)</a>
            <button className="ghost" onClick={() => file.current?.click()}><Upload size={16} /> Importer un export</button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          </div>
        )}
        {importMsg && <p className="notice">{importMsg}</p>}
        <p className="fineprint">Les données de démo ne sont jamais mélangées à ton espace. L’import conserve identifiants, versions et dates, et n’écrase jamais une fiche existante.</p>
      </section>
    </div>
  );
}
