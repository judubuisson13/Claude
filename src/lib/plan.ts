// Extension v12 du plan de débrief : on garde `buildPlan` (v11) tel quel pour les
// comptes/contacts/besoins/tâches, et on ajoute les rendez-vous et anniversaires détectés.
import type { ExchangeX, Meeting, PersonDate } from './analysis-schema';
import { buildPlan, today, type RecordItem } from './debrief-model';

const norm = (s: string) => s.trim().toLocaleLowerCase('fr');

function newId() {
  return crypto.randomUUID();
}

export type PlanInput = { exchanges: ExchangeX[]; meetings: Meeting[]; birthdays: PersonDate[] };

export function buildFullPlan(input: PlanInput, items: RecordItem[]): RecordItem[] {
  const plan = buildPlan(input.exchanges, items);
  const out = new Map(plan.map((r) => [r.id, r]));
  const original = new Map(items.map((i) => [i.id, i]));
  const latest = () => Array.from(new Map([...items, ...out.values()].map((i) => [i.id, i])).values());

  // v12 : deadline du besoin et ressources identifiées, reliées aux fiches du vivier quand elles existent.
  for (const e of input.exchanges) {
    if (!e.need?.trim() || (!e.needDeadline && !e.resources)) continue;
    const opp = Array.from(out.values()).find((r) => r.kind === 'opportunity' && norm(r.data.title || '') === norm(e.need) && norm(r.data.client || '') === norm(e.client));
    if (!opp) continue;
    const names = (e.resources || '').split(',').map((x) => x.trim()).filter(Boolean);
    const resourceIds = names.map((n) => latest().find((i) => (i.kind === 'candidate' || i.kind === 'consultant') && norm(i.data.name || '') === norm(n))?.id).filter(Boolean) as string[];
    out.set(opp.id, { ...opp, data: { ...opp.data, ...(e.needDeadline ? { deadline: e.needDeadline } : {}), ...(e.resources ? { resources: e.resources } : {}), ...(resourceIds.length ? { resourceIds: Array.from(new Set([...(opp.data.resourceIds || []), ...resourceIds])) } : {}) } });
  }
  // Date de dernière rencontre des candidats évoqués (sert au rapprochement « vu il y a 2 mois »).
  for (const r of Array.from(out.values())) if (r.kind === 'candidate') out.set(r.id, { ...r, data: { ...r.data, seenAt: today() } });

  for (const m of input.meetings) {
    if (!m.title.trim() || !m.date) continue;
    const dup = latest().some((i) => i.kind === 'meeting' && i.data.date === m.date && norm(i.data.title) === norm(m.title));
    if (dup) continue;
    const id = newId();
    out.set(id, { id, kind: 'meeting', version: 1, data: { ...m, source: 'Débrief vocal' } });
  }

  for (const b of input.birthdays) {
    if (!b.name.trim() || !b.date) continue;
    const person = latest().find((i) => i.kind === b.kind && norm(i.data.name || '') === norm(b.name));
    if (!person) continue; // On ne crée pas une fiche juste pour une date : elle reste visible dans la revue.
    const current = out.get(person.id) || person;
    if (current.data.birth === b.date) continue;
    const base = original.get(person.id);
    out.set(person.id, { ...current, data: { ...current.data, birth: b.date }, version: base ? base.version + 1 : current.version });
  }
  return Array.from(out.values());
}

export const KIND_LABEL: Record<string, string> = {
  account: 'Compte',
  contact: 'Contact',
  candidate: 'Candidat',
  consultant: 'Consultant',
  opportunity: 'Besoin',
  task: 'Next step',
  activity: 'Compte rendu',
  topic: 'Sujet chaud',
  meeting: 'Événement',
  goal: 'Objectif',
};

export function describe(r: RecordItem) {
  const d = r.data;
  switch (r.kind) {
    case 'account': return d.name;
    case 'contact': return [d.name, d.role && d.role !== 'À préciser' ? d.role : ''].filter(Boolean).join(' · ');
    case 'candidate': return [d.name, d.role].filter(Boolean).join(' · ');
    case 'consultant': return [d.name, d.client].filter(Boolean).join(' · ');
    case 'opportunity': return [d.title, d.client].filter(Boolean).join(' · ');
    case 'task': return d.title;
    case 'topic': return d.title;
    case 'meeting': return [d.title, d.date].filter(Boolean).join(' · ');
    case 'activity': return d.title;
    default: return d.title || d.name || r.id;
  }
}
