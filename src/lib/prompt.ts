import type { Analysis } from './analysis-schema';
import { emptyX } from './analysis-schema';
import { empty, type RecordItem } from './debrief-model';

// Consignes d'analyse du récit, partagées par le serveur (API Claude) et la démo en ligne.
export const ANALYSE_SYSTEM = `Tu es le copilote de Tempo Play, l'assistant d'un business manager en ESN (comptes clients, consultants en mission, candidats, besoins).
Chaque jour, il te raconte sa journée à l'oral pendant 15 à 20 minutes. Ton rôle : transformer ce récit en mises à jour CRM fiables, reliées entre elles.

Règles :
- Ne retiens que ce qui est dit ou clairement implicite. N'invente jamais un budget, un nom, une fonction, une date ou une étape. Inconnu = chaîne vide.
- Crée un élément "exchanges" par sujet distinct (un compte client, un candidat ou un consultant). Un échange client peut citer un candidat ou un consultant s'ils sont liés au même sujet.
- Réutilise l'orthographe exacte des fiches existantes fournies quand la personne ou le compte est reconnu. Si un nom est ambigu (homonymes), ne choisis pas : laisse le nom tel que dit et pose la question dans "followUp".
- "opportunityId" seulement si une opportunité existante fournie est clairement concernée.
- "stage" : « À qualifier » sauf preuve explicite ; dans ce cas, renseigne "evidence".
- "action" : le prochain pas concret ; "due" en AAAA-MM-JJ, en résolvant les dates relatives (demain, lundi…) à partir de la date du jour, fuseau Europe/Paris.
- "needDeadline" : date de démarrage ou deadline du besoin (AAAA-MM-JJ si précise, sinon « ASAP », « début novembre »…).
- "resources" : profils déjà identifiés ou positionnés sur le besoin (noms de candidats / consultants), ou « Aucun pour l’instant » si l'utilisateur le dit.
- Si l'utilisateur répond à une question du copilote, rattache la réponse au sujet concerné par cette question.
- "meetings" : seulement des rendez-vous futurs avec une date.
- "birthdays" : seulement si un anniversaire est explicitement mentionné.
- "followUp" : une seule question, la plus utile, sur ce qui manque (interlocuteur, fonction, budget, compétences, prochaine action, date). Ne redemande jamais ce qui est déjà connu.
- "reply" : une phrase naturelle, chaleureuse, au tutoiement, qui montre que tu as compris (pas de liste).
- Les informations personnelles (âge, anniversaire) ne servent jamais à évaluer un candidat.`;

/** Format JSON attendu, explicité pour les appels sans sortie structurée (démo en ligne). */
export const ANALYSE_FORMAT = `Réponds UNIQUEMENT par un objet JSON de cette forme (toutes les valeurs sont des chaînes, vides si inconnues) :
{"reply":"","exchanges":[{"client":"","contact":"","role":"","service":"","story":"","need":"","budget":"","skills":"","opportunityId":"","stage":"À qualifier","evidence":"","needDeadline":"","resources":"","action":"","owner":"Moi","due":"","candidate":"","candidateRole":"","candidateSkills":"","availability":"","consultant":"","consultantRole":"","hotTopic":""}],"meetings":[{"title":"","date":"AAAA-MM-JJ","time":"","type":"Client","detail":""}],"birthdays":[{"name":"","kind":"contact","date":"--MM-JJ"}],"followUp":""}
"stage" vaut l'une de : À qualifier, Proposition, Entretien, Gagné, Perdu. "type" de meeting : Client, Consultant, Recrutement ou Interne. "kind" : contact, consultant ou candidate.`;

export type Known = { accounts: string[]; contacts: string[]; candidates: string[]; consultants: string[]; opportunities: string[] };

export function knownContext(list: RecordItem[]): Known {
  const accounts = new Map(list.filter((i) => i.kind === 'account').map((i) => [i.id, i.data.name]));
  return {
    accounts: [...accounts.values()].filter(Boolean),
    contacts: list.filter((i) => i.kind === 'contact').map((i) => [i.data.name, accounts.get(i.data.accountId) || '?', i.data.role || ''].join(' — ')),
    candidates: list.filter((i) => i.kind === 'candidate').map((i) => `${i.data.name}${i.data.skills ? ' (' + i.data.skills + ')' : ''}`),
    consultants: list.filter((i) => i.kind === 'consultant').map((i) => `${i.data.name}${i.data.client ? ' (' + i.data.client + ')' : ''}`),
    opportunities: list.filter((i) => i.kind === 'opportunity' && !['Gagné', 'Perdu'].includes(i.data.stage)).map((i) => [i.id, i.data.title, i.data.client].join(' — ')),
  };
}

export function contextBlock(today: string, known: Known, persona = '') {
  return [
    `Date du jour : ${today}`,
    persona ? `Style du copilote choisi par l'utilisateur : ${persona}` : '',
    `Comptes connus : ${known.accounts.join(' | ') || 'aucun'}`,
    `Contacts connus (nom — compte — fonction) : ${known.contacts.join(' | ') || 'aucun'}`,
    `Candidats du vivier (nom et compétences) : ${known.candidates.join(' | ') || 'aucun'}`,
    `Consultants connus : ${known.consultants.join(' | ') || 'aucun'}`,
    `Opportunités ouvertes (id — intitulé — compte) : ${known.opportunities.join(' | ') || 'aucune'}`,
  ].filter(Boolean).join('\n');
}

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Remet n'importe quelle réponse JSON dans la forme attendue (valeurs absentes = chaînes vides). */
export function normalizeAnalysis(raw: any): Analysis {
  const base = emptyX(empty());
  return {
    reply: str(raw?.reply),
    followUp: str(raw?.followUp),
    exchanges: (Array.isArray(raw?.exchanges) ? raw.exchanges : []).map((e: any) => {
      const x: any = { ...base };
      for (const k of Object.keys(base)) if (e?.[k] != null) x[k] = str(e[k]);
      if (!x.stage) x.stage = 'À qualifier';
      if (!x.owner) x.owner = 'Moi';
      if (x.due && !/^\d{4}-\d{2}-\d{2}$/.test(x.due)) x.due = '';
      return x;
    }),
    meetings: (Array.isArray(raw?.meetings) ? raw.meetings : []).filter((m: any) => /^\d{4}-\d{2}-\d{2}$/.test(str(m?.date))).map((m: any) => ({ title: str(m.title), date: str(m.date), time: str(m.time), type: ['Client', 'Consultant', 'Recrutement', 'Interne'].includes(m.type) ? m.type : 'Client', detail: str(m.detail) })),
    birthdays: (Array.isArray(raw?.birthdays) ? raw.birthdays : []).filter((b: any) => b?.name && b?.date).map((b: any) => ({ name: str(b.name), kind: ['contact', 'consultant', 'candidate'].includes(b.kind) ? b.kind : 'contact', date: str(b.date) })),
  } as Analysis;
}
