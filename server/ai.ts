// Appels à Claude, uniquement côté serveur : la clé n'est jamais envoyée au navigateur.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { AnalysisSchema, type Analysis, type ComposeKind } from '../src/lib/analysis-schema';

const MODEL = process.env.TEMPO_MODEL || 'claude-opus-5-5';
const EFFORT = (process.env.TEMPO_EFFORT || 'medium') as 'low' | 'medium' | 'high';

let client: Anthropic | null = null;
export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}
function getClient() {
  client ??= new Anthropic();
  return client;
}

const ANALYSE_SYSTEM = `Tu es le copilote de Tempo Play, l'assistant d'un business manager en ESN (comptes clients, consultants en mission, candidats, besoins).
Chaque jour, il te raconte sa journée à l'oral pendant 15 à 20 minutes. Ton rôle : transformer ce récit en mises à jour CRM fiables, reliées entre elles.

Règles :
- Ne retiens que ce qui est dit ou clairement implicite. N'invente jamais un budget, un nom, une fonction, une date ou une étape. Inconnu = chaîne vide.
- Crée un élément "exchanges" par sujet distinct (un compte client, un candidat ou un consultant). Un échange client peut citer un candidat ou un consultant s'ils sont liés au même sujet.
- Réutilise l'orthographe exacte des fiches existantes fournies quand la personne ou le compte est reconnu. Si un nom est ambigu (homonymes), ne choisis pas : laisse le nom tel que dit et pose la question dans "followUp".
- "opportunityId" seulement si une opportunité existante fournie est clairement concernée.
- "stage" : « À qualifier » sauf preuve explicite ; dans ce cas, renseigne "evidence".
- "action" : le prochain pas concret ; "due" en AAAA-MM-JJ, en résolvant les dates relatives (demain, lundi…) à partir de la date du jour, fuseau Europe/Paris.
- "meetings" : seulement des rendez-vous futurs avec une date.
- "birthdays" : seulement si un anniversaire est explicitement mentionné.
- "followUp" : une seule question, la plus utile, sur ce qui manque (interlocuteur, fonction, budget, compétences, prochaine action, date). Ne redemande jamais ce qui est déjà connu.
- "reply" : une phrase naturelle, chaleureuse, au tutoiement, qui montre que tu as compris (pas de liste).
- Les informations personnelles (âge, anniversaire) ne servent jamais à évaluer un candidat.`;

export type AnalyseContext = {
  today: string;
  persona?: string;
  known: { accounts: string[]; contacts: string[]; candidates: string[]; consultants: string[]; opportunities: string[] };
  history: { role: 'copilot' | 'user'; text: string }[];
};

export async function analyseWithClaude(text: string, ctx: AnalyseContext): Promise<Analysis> {
  const context = [
    `Date du jour : ${ctx.today}`,
    ctx.persona ? `Style du copilote choisi par l'utilisateur : ${ctx.persona}` : '',
    `Comptes connus : ${ctx.known.accounts.join(' | ') || 'aucun'}`,
    `Contacts connus (nom — compte — fonction) : ${ctx.known.contacts.join(' | ') || 'aucun'}`,
    `Candidats connus : ${ctx.known.candidates.join(' | ') || 'aucun'}`,
    `Consultants connus : ${ctx.known.consultants.join(' | ') || 'aucun'}`,
    `Opportunités ouvertes (id — intitulé — compte) : ${ctx.known.opportunities.join(' | ') || 'aucune'}`,
    ctx.history.length ? `Échanges précédents de la session :\n${ctx.history.map((h) => `${h.role === 'copilot' ? 'Copilote' : 'Utilisateur'} : ${h.text}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT, format: betaZodOutputFormat(AnalysisSchema) },
    system: [{ type: 'text', text: ANALYSE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `${context}\n\nNouveau récit à analyser :\n"""${text}"""` }],
  });
  if (response.stop_reason === 'refusal') throw new Error('Analyse refusée par le modèle.');
  if (!response.parsed_output) throw new Error('Réponse du modèle illisible.');
  return response.parsed_output;
}

const ComposeSchema = z.object({ subject: z.string(), message: z.string() });

const COMPOSE_LABEL: Record<ComposeKind, string> = {
  birthday: "souhaiter un joyeux anniversaire (chaleureux, court, sans formule commerciale)",
  reactivation: 'reprendre contact avec un client silencieux depuis un moment, en proposant un échange',
  followup: 'faire suite à un échange récent et rappeler la prochaine étape',
  mission: 'proposer un point de suivi de mission à un consultant',
  thanks: 'remercier un consultant pour un anniversaire de mission',
  season: 'souhaiter de bonnes fêtes / bonnes vacances',
};

export async function composeWithClaude(kind: ComposeKind, person: string, details: string, tone: string) {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(ComposeSchema) },
    system: "Tu rédiges des messages courts (60 à 110 mots) pour un business manager d'ESN. Français naturel, sans emphase commerciale, sans inventer de faits. Le message sera relu puis envoyé par l'utilisateur lui-même.",
    messages: [{ role: 'user', content: `Objectif : ${COMPOSE_LABEL[kind]}.\nDestinataire : ${person}.\nContexte connu : ${details || 'aucun'}.\nTon souhaité : ${tone || 'cordial'}.` }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) throw new Error('Rédaction impossible.');
  return response.parsed_output;
}
