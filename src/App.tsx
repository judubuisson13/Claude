import { AnimatePresence, motion } from 'motion/react';
import { Compass, Database, Radar as RadarIcon, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Toast } from './components/ui';
import type { RecordItem } from './lib/debrief-model';
import type { Insight } from './lib/insights';
import { loadProfile, saveProfile, styleOf, type Profile } from './lib/profile';
import { useStore } from './lib/store';
import { Crm, RecordSheet } from './screens/Crm';
import { Home } from './screens/Home';
import { Me } from './screens/Me';
import { Onboarding } from './screens/Onboarding';
import { Composer, Radar } from './screens/Radar';
import { Session } from './screens/Session';

type Tab = 'home' | 'radar' | 'crm' | 'me';

export default function App() {
  const store = useStore();
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [session, setSession] = useState(false);
  const [open, setOpen] = useState<RecordItem | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);

  const style = styleOf(profile);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', style.color);
    document.documentElement.style.setProperty('--accent-soft', style.soft);
    if (profile) document.documentElement.dataset.universe = profile.world;
  }, [style, profile]);

  const updateProfile = (p: Profile) => { saveProfile(p); setProfile(p); };

  if (!profile || editing) {
    return <Onboarding initial={profile} onCancel={profile ? () => setEditing(false) : undefined} onDone={(p) => { updateProfile(p); setEditing(false); }} />;
  }
  if (!store.ready) return <div className="loading"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>🧭</motion.div></div>;

  const taskDone = async (t: RecordItem) => {
    try {
      await store.saveOne({ ...t, data: { ...t.data, status: 'Terminé' } });
      setToast('Mission accomplie · +45 XP 🎉');
    } catch (e) {
      setToast((e as Error).message);
    }
  };

  return (
    <div className="app">
      {store.mode === 'demo' && <div className="demo-banner">Mode démo · données fictives{!store.status.reachable && ' · serveur non connecté'}</div>}
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {tab === 'home' && <Home profile={profile} store={store} onStart={() => setSession(true)} onOpen={setOpen} onInsight={(i) => (i.compose ? setInsight(i) : setOpen(store.items.find((r) => r.id === i.recordId) || null))} onTaskDone={taskDone} goRadar={() => setTab('radar')} />}
            {tab === 'radar' && <Radar store={store} onInsight={setInsight} onOpen={setOpen} />}
            {tab === 'crm' && <Crm store={store} onOpen={setOpen} />}
            {tab === 'me' && <Me profile={profile} store={store} onEdit={() => setEditing(true)} onProfile={updateProfile} onToast={setToast} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="tabbar" aria-label="Navigation">
        {([['home', 'Territoire', Compass], ['radar', 'Radar', RadarIcon], ['crm', 'CRM', Database], ['me', 'Profil', User]] as const).map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {tab === id && <motion.i layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>

      <RecordSheet record={open} store={store} onClose={() => setOpen(null)} onOpen={setOpen} onSaved={setToast} />
      <Composer insight={insight} store={store} sender={profile.name} onClose={() => setInsight(null)} onSent={setToast} />
      <AnimatePresence>{session && <Session profile={profile} store={store} onClose={() => setSession(false)} />}</AnimatePresence>
      <Toast text={toast} onDone={clearToast} />
    </div>
  );
}
