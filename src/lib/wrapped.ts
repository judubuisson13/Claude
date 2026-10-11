// Données du Wrap (semaine / mois / année), calculées depuis les comptes rendus enregistrés.
import { today, type RecordItem } from './debrief-model';
import { addDays } from './dates';
import { skillTokens } from './matching';

export type Period = 'week' | 'month' | 'year';
export const PERIOD_LABEL: Record<Period, { title: string; span: number; noun: string }> = {
  week: { title: 'Ta semaine', span: 7, noun: 'cette semaine' },
  month: { title: 'Ton mois', span: 30, noun: 'ce mois-ci' },
  year: { title: 'Ton année', span: 365, noun: 'cette année' },
};

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

function top<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

export function wrapped(items: RecordItem[], period: Period, base = today()) {
  const start = addDays(base, -PERIOD_LABEL[period].span + 1);
  const acts = items.filter((i) => i.kind === 'activity' && i.data.createdAt && dayOf(i.data.createdAt) >= start && dayOf(i.data.createdAt) <= base);
  const earlier = items.filter((i) => i.kind === 'activity' && i.data.createdAt && dayOf(i.data.createdAt) < start);
  const seenBefore = new Set(earlier.flatMap((a) => a.data.relatedIds || []));
  const byId = new Map(items.map((i) => [i.id, i]));
  const related = Array.from(new Set(acts.flatMap((a) => a.data.relatedIds || []))).map((id) => byId.get(id)).filter(Boolean) as RecordItem[];
  const fresh = related.filter((r) => !seenBefore.has(r.id));

  const clients = top(acts.flatMap((a) => a.data.accounts || []) as string[]);
  const needs = Array.from(new Set(acts.flatMap((a) => a.data.opportunities || []))) as string[];
  const candidatesMet = Array.from(new Set([
    ...acts.flatMap((a) => a.data.candidates || []),
    ...items.filter((i) => i.kind === 'candidate' && i.data.seenAt && i.data.seenAt >= start).map((i) => i.data.name),
  ])) as string[];
  const skills = top(items.filter((i) => i.kind === 'opportunity' && needs.includes(i.data.title)).flatMap((o) => skillTokens(o.data.requirements)).concat(
    items.filter((i) => i.kind === 'candidate' && candidatesMet.includes(i.data.name)).flatMap((c) => skillTokens(c.data.skills)),
  ));
  const days = new Set(acts.map((a) => dayOf(a.data.createdAt)));
  const weekday = top(acts.map((a) => DAYS[new Date(dayOf(a.data.createdAt) + 'T12:00:00Z').getUTCDay()]));
  const actions = acts.reduce((n, a) => n + (a.data.actions?.length || 0), 0);
  const tasksDone = items.filter((i) => i.kind === 'task' && i.data.status === 'Terminé' && (i.data.due || '') >= start).length;
  const avgQuality = acts.length ? Math.round(acts.reduce((n, a) => n + (Number(a.data.completeness) || 0), 0) / acts.length) : 0;
  const minutes = acts.reduce((n, a) => n + (Number(a.data.details?.minutes) || 15), 0);

  const persona =
    candidatesMet.length >= clients.length && candidatesMet.length > 0 ? { title: 'Chasseur de talents', line: 'Ton vivier a été ta priorité.' }
    : clients.length >= 3 ? { title: 'Explorateur de comptes', line: 'Tu as couvert du terrain.' }
    : actions >= acts.length * 1.5 && actions > 0 ? { title: 'Machine à next steps', line: 'Rien ne reste sans suite avec toi.' }
    : { title: 'Jardinier régulier', line: 'Tu entretiens tes relations pas à pas.' };

  return {
    period, start, end: base,
    debriefs: acts.length, activeDays: days.size, minutes,
    clients: clients.map(([name, n]) => ({ name, n })),
    newContacts: fresh.filter((r) => r.kind === 'contact').length,
    newAccounts: fresh.filter((r) => r.kind === 'account').length,
    needs, candidatesMet, topSkills: skills.slice(0, 5).map(([s]) => s),
    actions, tasksDone, avgQuality,
    bestDay: weekday[0]?.[0] || '',
    persona,
  };
}

export type Wrapped = ReturnType<typeof wrapped>;
