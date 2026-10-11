// Rapprochement besoin ↔ vivier, lexical et explicable : critères trouvés / manquants.
// Ce n'est ni une probabilité de réussite ni un classement des personnes : seules les compétences
// et la disponibilité comptent (jamais l'âge, l'anniversaire ou le style de couleur).
import { today, type RecordItem } from './debrief-model';
import { daysBetween } from './dates';

const SYNONYMS: Record<string, string> = {
  'spring boot': 'spring', springboot: 'spring', 'node.js': 'node', nodejs: 'node', js: 'javascript', ts: 'typescript',
  'react.js': 'react', reactjs: 'react', k8s: 'kubernetes', postgres: 'postgresql', 'gestion de projet': 'pilotage', scrum: 'agile',
};

export function skillTokens(text: string | string[] | undefined) {
  const raw = Array.isArray(text) ? text.join(',') : text || '';
  return Array.from(new Set(raw.split(/[,;/+]|\bet\b/).map((s) => s.trim().toLocaleLowerCase('fr')).filter((s) => s.length > 1).map((s) => SYNONYMS[s] || s)));
}

export type Match = {
  person: RecordItem;
  matched: string[];
  missing: string[];
  score: number; // part des compétences demandées couvertes, 0..1
  seen: string; // « vu il y a 2 mois », « en mission chez X »…
};

function seenLabel(p: RecordItem, items: RecordItem[], base: string) {
  if (p.kind === 'consultant') return p.data.status === 'En mission' ? `en mission chez ${p.data.client || '—'}` : p.data.status || 'consultant';
  const dates = [p.data.seenAt, ...items.filter((a) => a.kind === 'activity' && (a.data.relatedIds || []).includes(p.id)).map((a) => (a.data.createdAt || '').slice(0, 10))].filter(Boolean).sort();
  const last = dates[dates.length - 1];
  if (!last) return 'dans ton vivier';
  const n = daysBetween(last, base);
  if (n <= 0) return "vu aujourd'hui";
  if (n < 14) return `vu il y a ${n} jours`;
  if (n < 60) return `vu il y a ${Math.round(n / 7)} semaines`;
  return `vu il y a ${Math.round(n / 30)} mois`;
}

export function matchNeed(skills: string | string[], items: RecordItem[], opts: { exclude?: string[]; base?: string } = {}): Match[] {
  const wanted = skillTokens(skills);
  if (!wanted.length) return [];
  const base = opts.base || today();
  return items
    .filter((p) => (p.kind === 'candidate' || p.kind === 'consultant') && !opts.exclude?.includes(p.id) && p.data.status !== 'Sorti')
    .map((p) => {
      const has = skillTokens(p.data.skills);
      const matched = wanted.filter((w) => has.some((h) => h === w || h.includes(w) || w.includes(h)));
      return { person: p, matched, missing: wanted.filter((w) => !matched.includes(w)), score: matched.length / wanted.length, seen: seenLabel(p, items, base) };
    })
    .filter((m) => m.matched.length > 0)
    .sort((a, b) => b.score - a.score || (a.person.kind === 'candidate' ? -1 : 1))
    .slice(0, 4);
}
