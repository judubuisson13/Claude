import { dateAnswer, today } from './debrief-model';

export const DAY_MS = 86_400_000;
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((new Date(to + 'T12:00:00Z').getTime() - new Date(from + 'T12:00:00Z').getTime()) / DAY_MS);
}

export function validIso(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + 'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/**
 * Cherche une date en français dans un fragment de texte (Europe/Paris).
 * Renvoie '' si rien de fiable : une date impossible (31/02) n'est jamais acceptée.
 */
export function findFrenchDate(text: string, base = today()): string {
  const t = text.toLocaleLowerCase('fr');
  if (/après[- ]demain/.test(t)) return addDays(base, 2);
  if (/\bdemain\b/.test(t)) return addDays(base, 1);
  if (/aujourd[’']hui|ce soir|cet après-midi/.test(t)) return base;
  const inDays = t.match(/dans (\d{1,2}) jours?/);
  if (inDays) return addDays(base, Number(inDays[1]));
  if (/semaine prochaine/.test(t)) {
    const dow = new Date(base + 'T12:00:00Z').getUTCDay();
    return addDays(base, ((8 - dow) % 7) || 7);
  }
  const numeric = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? (numeric[3].length === 2 ? '20' + numeric[3] : numeric[3]) : guessYear(base, Number(numeric[2]), Number(numeric[1]));
    return dateAnswer(`${numeric[1]}/${numeric[2]}/${year}`);
  }
  const named = t.match(new RegExp(`\\b(1er|\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`));
  if (named) {
    const day = named[1] === '1er' ? 1 : Number(named[1]);
    const month = MONTHS.indexOf(named[2]) + 1;
    const year = named[3] ? Number(named[3]) : guessYear(base, month, day);
    return dateAnswer(`${day}/${month}/${year}`);
  }
  const weekday = t.match(new RegExp(`\\b(${WEEKDAYS.join('|')})(?: prochain)?\\b`));
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[1]);
    const dow = new Date(base + 'T12:00:00Z').getUTCDay();
    return addDays(base, ((target - dow + 7) % 7) || 7);
  }
  return '';
}

function guessYear(base: string, month: number, day: number) {
  const y = Number(base.slice(0, 4));
  const candidate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return candidate < base ? y + 1 : y;
}

/** Prochaine occurrence d'un anniversaire (AAAA-MM-JJ ou --MM-JJ). */
export function nextAnniversary(date: string, base = today()) {
  const m = date.match(/(?:\d{4}|-)-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(base.slice(0, 4));
  for (const year of [y, y + 1]) {
    const iso = `${year}-${m[1]}-${m[2]}`;
    if (validIso(iso) && iso >= base) return iso;
  }
  // 29 février une année non bissextile : on fête le 28.
  return `${y + (base.slice(5) > '02-28' ? 1 : 0)}-02-28`;
}

export function shortDate(iso: string) {
  if (!iso) return 'À planifier';
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function relativeDay(iso: string, base = today()) {
  if (!iso) return 'sans date';
  const n = daysBetween(base, iso);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  if (n > 1 && n < 7) return `dans ${n} jours`;
  if (n < 0) return `il y a ${-n} jours`;
  return shortDate(iso);
}
