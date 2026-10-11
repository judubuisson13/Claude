// Analyse locale de secours, utilisée quand aucune clé Claude n'est configurée côté serveur.
// Volontairement prudente : elle ne retient que des faits explicitement formulés et
// laisse vide ce qu'elle ne sait pas. Tout est montré pour validation avant écriture.
import type { Analysis, Meeting, PersonDate } from './analysis-schema';
import { empty, extractFacts, today, type Exchange, type RecordItem } from './debrief-model';
import { findFrenchDate } from './dates';

const NAME = "[A-ZÀ-Ý][\\p{L}'’-]+(?:\\s+[A-ZÀ-Ý][\\p{L}'’-]+)?";
const norm = (s: string) => s.trim().toLocaleLowerCase('fr');
const clean = (s: string) => s.trim().replace(/^(?:un|une|des|le|la|les)\s+/i, '').replace(/[\s,.;:]+$/, '');

function sentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function known(items: RecordItem[], kind: string, text: string) {
  const t = norm(text);
  return items.filter((i) => i.kind === kind && i.data.name && t.includes(norm(i.data.name)));
}

/** Découpe le récit en sujets : un nouveau sujet commence dès qu'un autre compte / candidat / consultant est cité. */
function segment(text: string, items: RecordItem[]) {
  const groups: string[][] = [];
  let key = '';
  for (const s of sentences(text)) {
    const subject =
      known(items, 'account', s)[0]?.data.name ||
      s.match(new RegExp(`\\b(?:chez|client|compte)\\s+(${NAME})`, 'u'))?.[1] ||
      s.match(new RegExp(`\\bcandidat(?:e)?\\s+(${NAME})`, 'u'))?.[1] ||
      known(items, 'candidate', s)[0]?.data.name ||
      known(items, 'consultant', s)[0]?.data.name ||
      '';
    if (subject && norm(subject) !== key && groups.length && key) groups.push([]);
    if (!groups.length) groups.push([]);
    if (subject) key = norm(subject);
    groups[groups.length - 1].push(s);
  }
  return groups.map((g) => g.join(' ')).filter(Boolean);
}

function analyseSegment(text: string, items: RecordItem[]): Exchange {
  const e: Exchange = { ...empty(), story: text };
  Object.assign(e, extractFacts(text, items, e));
  const pick = (re: RegExp) => text.match(re)?.[1]?.trim() || '';

  if (!e.client) e.client = known(items, 'account', text)[0]?.data.name || clean(pick(new RegExp(`\\b(?:chez|client|compte)\\s+(${NAME})`, 'u')));
  if (!e.contact) {
    const account = items.find((i) => i.kind === 'account' && norm(i.data.name) === norm(e.client));
    e.contact = known(items, 'contact', text).find((c) => !account || c.data.accountId === account.id)?.data.name || pick(new RegExp(`\\bavec\\s+(${NAME})`, 'u'));
    if (e.contact && norm(e.contact) === norm(e.client)) e.contact = '';
  }
  const ROLE = '(?:directeur|directrice|responsable|manager|DSI|CTO|CIO|lead|chef|cheffe|head|acheteur|acheteuse|RH)[^,.;]*';
  if (!e.role) e.role = clean(pick(new RegExp(`\\b(?:qui est|il est|elle est|en tant que)\\s+(${ROLE})`, 'i')));
  if (!e.role && e.contact) e.role = clean(text.split(e.contact)[1]?.match(new RegExp(`^\\s*,\\s*(${ROLE})`, 'i'))?.[1] || '');
  if (!e.need) e.need = clean(pick(/\b(?:cherche(?:nt)?|recherche(?:nt)?|besoin d[e'’]\s?|a besoin d[e'’]\s?)\s*((?:un|une|deux|trois|des)?\s*[^,.;]{3,60})/i));
  if (!e.budget) e.budget = pick(/((?:TJM|budget)[^,.;]*?\d[\d\s]*(?:k|K)?\s*(?:€|euros?))/i) || pick(/(\d{3,4}\s*(?:€|euros?)\s*(?:par jour|\/\s*j(?:our)?))/i);
  if (!e.skills) {
    const techs = text.match(/\b(Java|Spring(?: Boot)?|Python|SQL|Spark|AWS|Azure|GCP|React|Angular|Node(?:\.js)?|TypeScript|Kubernetes|Docker|DevOps|SAP|Salesforce|Data|Scrum|Agile|PHP|\.NET|C#|Go|Kafka|Airflow|Terraform)\b/g);
    if (techs) e.skills = Array.from(new Set(techs)).join(', ');
  }
  if (!e.action) e.action = clean(pick(/\b(?:je dois|il faut|je vais|prochaine étape\s*:?|next step\s*:?|je (?:dois )?(?=relancer|envoyer|rappeler|proposer|organiser))\s*([^.;]{4,90})/i));
  // L'échéance est cherchée dans la phrase de l'action, pas dans tout le récit (évite de confondre avec une date d'anniversaire).
  if (!e.due && e.action) e.due = findFrenchDate(sentences(text).find((s) => s.includes(e.action)) || '');
  if (!e.candidate) e.candidate = known(items, 'candidate', text)[0]?.data.name || pick(new RegExp(`\\bcandidat(?:e)?\\s+(${NAME})`, 'u'));
  if (e.candidate && !e.candidateSkills && e.skills && !e.client) e.candidateSkills = e.skills;
  if (e.candidate && !e.availability) e.availability = /dispo(?:nible)? (?:tout de suite|immédiatement)/i.test(text) ? 'Immédiate' : '';
  if (!e.consultant) e.consultant = known(items, 'consultant', text)[0]?.data.name || pick(new RegExp(`\\bconsultant(?:e)?\\s+(${NAME})`, 'u'));
  if (/\b(?:risque|bloqu|tendu|inquiet|urgent|problème|alerte)/i.test(text) && !e.hotTopic) {
    e.hotTopic = `${e.client || e.consultant || e.candidate || 'Sujet'} · point de vigilance`;
  }
  if (/\b(?:proposition envoyée|on a envoyé la proposition)\b/i.test(text)) { e.stage = 'Proposition'; e.evidence = 'Proposition envoyée (mentionnée dans le récit)'; }
  if (/\b(?:signé|on a gagné|c'est gagné)\b/i.test(text)) { e.stage = 'Gagné'; e.evidence = 'Signature mentionnée dans le récit'; }
  return e;
}

function meetings(text: string): Meeting[] {
  const out: Meeting[] = [];
  const re = /\b(rendez-vous|rdv|réunion|entretien|point|déjeuner|visio)\b([^.;]*)/gi;
  for (const m of text.matchAll(re)) {
    const tail = m[2];
    const date = findFrenchDate(tail);
    if (!date) continue;
    const hour = tail.match(/\b(\d{1,2})\s*h\s*(\d{2})?/);
    const who = tail.match(new RegExp(`\\bavec\\s+(${NAME})`, 'u'))?.[1] || '';
    const kind = /entretien/i.test(m[1]) ? 'Recrutement' : /point/i.test(m[1]) && /consultant/i.test(tail) ? 'Consultant' : 'Client';
    out.push({ title: `${m[1][0].toUpperCase() + m[1].slice(1)}${who ? ' · ' + who : ''}`, date, time: hour ? `${hour[1].padStart(2, '0')}:${hour[2] || '00'}` : '', type: kind, detail: who });
  }
  return out;
}

function birthdays(text: string, items: RecordItem[]): PersonDate[] {
  const out: PersonDate[] = [];
  const re = new RegExp(`anniversaire (?:de |d['’])(${NAME})[^.;]*?((?:\\d{1,2}[/.-]\\d{1,2})|(?:1er|\\d{1,2})\\s+\\p{L}+|demain|aujourd['’]hui)`, 'giu');
  for (const m of text.matchAll(re)) {
    const date = findFrenchDate(m[2]);
    if (!date) continue;
    const name = m[1];
    const kind = (['consultant', 'candidate', 'contact'] as const).find((k) => known(items, k, name).length) || 'contact';
    out.push({ name, kind, date: '--' + date.slice(5) });
  }
  return out;
}

function followUpFor(e: Exchange) {
  if (e.client && !e.contact) return `Chez ${e.client}, avec qui as-tu échangé ?`;
  if (e.contact && !e.role) return `Quelle est la fonction de ${e.contact} ?`;
  if (e.need && !e.budget) return `Un budget ou un TJM a-t-il été évoqué pour « ${e.need} » ?`;
  if (e.need && !e.skills) return 'Quelles compétences sont attendues ?';
  if (!e.action) return 'Quel est le prochain pas concret ?';
  if (e.action && !e.due) return `Pour quand « ${e.action} » ?`;
  if (e.candidate && !e.candidateRole) return `Quel poste recherche ${e.candidate} ?`;
  return '';
}

export function analyseLocally(text: string, items: RecordItem[]): Analysis {
  // Le client envoie la session sous forme de dialogue : on ne garde que les propos de l'utilisateur.
  if (/^(?:Copilote|Moi) : /m.test(text)) text = text.split('\n').filter((l) => !l.startsWith('Copilote : ')).map((l) => l.replace(/^Moi : /, '')).join('\n');
  const exchanges = segment(text, items).map((s) => analyseSegment(s, items)).filter((e) => e.client || e.candidate || e.consultant || e.need || e.action);
  const followUp = exchanges.map(followUpFor).find(Boolean) || '';
  const names = exchanges.map((e) => e.client || e.candidate || e.consultant).filter(Boolean);
  return {
    reply: names.length ? `Bien noté pour ${names.join(', ')}. Je prépare les mises à jour.` : "Je t'écoute — dis-moi qui tu as vu ou ce qui a bougé.",
    exchanges,
    meetings: meetings(text),
    birthdays: birthdays(text, items),
    followUp,
  };
}

export { today };
