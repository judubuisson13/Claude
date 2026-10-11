// Appels à Claude, uniquement côté serveur : la clé n'est jamais envoyée au navigateur.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { AnalysisSchema, type Analysis, type ComposeKind } from '../src/lib/analysis-schema';
import { ANALYSE_SYSTEM, contextBlock, normalizeAnalysis, type Known } from '../src/lib/prompt';

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



export type AnalyseContext = {
  today: string;
  persona?: string;
  known: Known;
  history: { role: 'copilot' | 'user'; text: string }[];
};

export async function analyseWithClaude(text: string, ctx: AnalyseContext): Promise<Analysis> {
  const context = [
    contextBlock(ctx.today, ctx.known, ctx.persona),
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
  return normalizeAnalysis(response.parsed_output);
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
