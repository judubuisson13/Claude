// Règles de jeu explicables, calculées à partir des fiches (aucun score caché).
import { today, type RecordItem } from './debrief-model';
import { addDays, daysBetween } from './dates';

export { gameProgress } from './debrief-model';

const norm = (s: string) => (s || '').trim().toLocaleLowerCase('fr');

/** Jauge de relation v11 : 6 éléments documentés (compte, contact, fonction, service, récit, action datée). */
export function relationshipCoverage(items: RecordItem[], client: string) {
  const account = items.find((i) => i.kind === 'account' && norm(i.data.name) === norm(client));
  const contacts = items.filter((i) => i.kind === 'contact' && i.data.accountId === account?.id);
  const activities = items.filter((i) => i.kind === 'activity' && (i.data.accounts || []).some((s: string) => norm(s) === norm(client)));
  const ds = activities.map((i) => i.data.details || {});
  return [
    !!account,
    contacts.length > 0,
    contacts.some((i) => i.data.role && i.data.role !== 'À préciser') || ds.some((d) => d.role),
    contacts.some((i) => i.data.service) || ds.some((d) => d.service),
    activities.some((i) => i.data.text?.trim()),
    items.some((i) => i.kind === 'task' && i.data.due && (i.data.accountId === account?.id || norm(i.data.client) === norm(client))) || ds.some((d) => d.action && d.due),
  ].filter(Boolean).length;
}

/** Fraîcheur d'un compte : 1 = contact récent, 0 = largement au-delà de la cadence prévue. */
export function freshness(account: RecordItem, base = today()) {
  if (!account.data.lastContact) return 0.5;
  const cadence = Number(account.data.cadence) || 30;
  const silent = daysBetween(account.data.lastContact, base);
  return Math.max(0, Math.min(1, 1 - (silent - cadence * 0.5) / (cadence * 1.2)));
}

/** Série de jours consécutifs avec au moins un débrief (jusqu'à aujourd'hui ou hier). */
export function streak(items: RecordItem[], base = today()) {
  const days = new Set(items.filter((i) => i.kind === 'activity' && i.data.createdAt).map((i) => new Date(i.data.createdAt).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })));
  let cursor = days.has(base) ? base : addDays(base, -1);
  let n = 0;
  while (days.has(cursor)) { n++; cursor = addDays(cursor, -1); }
  return { days: n, doneToday: days.has(base) };
}

export function kpis(items: RecordItem[]) {
  const count = (k: string, f: (i: RecordItem) => boolean = () => true) => items.filter((i) => i.kind === k && f(i)).length;
  return {
    accounts: count('account'),
    contacts: count('contact'),
    openNeeds: count('opportunity', (i) => !['Gagné', 'Perdu'].includes(i.data.stage)),
    won: count('opportunity', (i) => i.data.stage === 'Gagné'),
    consultants: count('consultant', (i) => i.data.status === 'En mission'),
    candidates: count('candidate'),
    openTasks: count('task', (i) => i.data.status !== 'Terminé'),
    doneTasks: count('task', (i) => i.data.status === 'Terminé'),
    debriefs: count('activity'),
  };
}
