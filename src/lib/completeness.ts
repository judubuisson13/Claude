// Checklist d'un compte rendu : ce qui doit y figurer selon le sujet, et la question à poser si ça manque.
// Le copilote s'en sert pour relancer, une question à la fois, jusqu'à un compte rendu complet.
import type { ExchangeX } from './analysis-schema';

export type CheckKey = keyof ExchangeX;
export type CheckItem = { key: CheckKey; label: string; ok: boolean; question: string };

export const subjectOf = (e: ExchangeX) => e.client || e.candidate || e.consultant || 'ce sujet';

export function checklist(e: ExchangeX): CheckItem[] {
  const out: CheckItem[] = [];
  const add = (key: CheckKey, label: string, question: string) => out.push({ key, label, ok: !!String(e[key] || '').trim(), question });
  const who = subjectOf(e);
  if (e.client || e.need) {
    add('client', 'Compte', 'Chez quel client ça se passe ?');
    add('contact', 'Interlocuteur', `Chez ${who}, avec qui as-tu échangé ?`);
    if (e.contact) add('role', 'Fonction', `Quelle est la fonction de ${e.contact} ?`);
    add('need', 'Besoin', `Y a-t-il un besoin à suivre chez ${who} ? Donne-moi l'intitulé du poste, ou dis « aucun ».`);
    if (e.need && e.need.toLocaleLowerCase('fr') !== 'aucun') {
      add('skills', 'Compétences', `Quelles compétences sont attendues pour « ${e.need} » ?`);
      add('budget', 'Budget / TJM', `Quel budget ou TJM pour « ${e.need} » ?`);
      add('needDeadline', 'Deadline', `Pour quand ont-ils besoin de quelqu'un sur « ${e.need} » ? Une date de démarrage ?`);
      add('resources', 'Ressources', `As-tu déjà des profils identifiés pour « ${e.need} » ? Un candidat ou un consultant en tête ?`);
    }
  }
  if (e.candidate) {
    add('candidateRole', 'Poste visé', `Quel poste recherche ${e.candidate} ?`);
    add('candidateSkills', 'Compétences', `Quelles compétences retenir pour ${e.candidate} ?`);
    add('availability', 'Disponibilité', `Quand ${e.candidate} serait-il disponible ?`);
  }
  if (e.consultant) {
    if (!e.client) add('client', 'Client', `Chez quel client intervient ${e.consultant} ?`);
    add('consultantRole', 'Expertise', `Quelle est l'expertise de ${e.consultant} ?`);
  }
  add('action', 'Next step', `Quel est le prochain pas concret pour ${who} ?`);
  if (e.action) add('due', 'Échéance', `Pour quand « ${e.action} » ?`);
  return out;
}

/** Score de complétude 0..1 sur l'ensemble des sujets. */
export function completeness(exchanges: ExchangeX[], skipped: Set<string> = new Set()) {
  const items = exchanges.flatMap((e) => checklist(e).map((c) => ({ ...c, ok: c.ok || skipped.has(skipKey(e, c.key)) })));
  return items.length ? items.filter((c) => c.ok).length / items.length : 0;
}

export const skipKey = (e: ExchangeX, key: string) => `${subjectOf(e).toLocaleLowerCase('fr')}::${key}`;

/** Prochaine information manquante (non passée par l'utilisateur), dans l'ordre des sujets. */
export function nextMissing(exchanges: ExchangeX[], skipped: Set<string>) {
  for (const e of exchanges) {
    const c = checklist(e).find((x) => !x.ok && !skipped.has(skipKey(e, x.key)));
    if (c) return { exchange: e, item: c };
  }
  return null;
}
