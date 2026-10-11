// Contrat partagé entre le serveur (sortie structurée Claude) et l'interface.
// Les champs reprennent le type `Exchange` de la v11 : valeur inconnue = chaîne vide.
import { z } from 'zod';
import type { Exchange } from './debrief-model';

import { STAGES } from './stages';

export { STAGES };

export const ExchangeSchema = z.object({
  client: z.string().describe('Nom du compte client tel que cité, ou chaîne vide'),
  contact: z.string().describe("Nom de l'interlocuteur, ou vide"),
  role: z.string().describe("Fonction de l'interlocuteur, ou vide"),
  service: z.string().describe('Service ou équipe, ou vide'),
  story: z.string().describe("Résumé factuel de l'échange en 1 à 3 phrases, à la première personne"),
  need: z.string().describe('Intitulé du besoin / poste recherché par le client, ou vide'),
  budget: z.string().describe('Budget ou TJM tel que formulé, ou vide. Ne jamais inventer'),
  skills: z.string().describe('Compétences attendues, séparées par des virgules, ou vide'),
  opportunityId: z.string().describe("Identifiant d'une opportunité existante si elle est clairement concernée, sinon vide"),
  stage: z.enum(STAGES).describe('Étape réellement confirmée ; « À qualifier » par défaut'),
  evidence: z.string().describe("Ce qui prouve l'étape si différente de « À qualifier », sinon vide"),
  action: z.string().describe('Prochaine action concrète, ou vide'),
  owner: z.string().describe('Responsable de la prochaine action ; « Moi » par défaut'),
  due: z.string().describe('Date de la prochaine action au format AAAA-MM-JJ, ou vide'),
  candidate: z.string().describe('Nom du candidat évoqué, ou vide'),
  candidateRole: z.string().describe('Poste recherché par le candidat, ou vide'),
  candidateSkills: z.string().describe('Compétences du candidat, ou vide'),
  availability: z.string().describe('Disponibilité du candidat, ou vide'),
  consultant: z.string().describe('Nom du consultant suivi, ou vide'),
  consultantRole: z.string().describe('Expertise du consultant, ou vide'),
  hotTopic: z.string().describe('Titre court si un risque / sujet chaud est à surveiller, sinon vide'),
});

export const MeetingSchema = z.object({
  title: z.string(),
  date: z.string().describe('AAAA-MM-JJ'),
  time: z.string().describe('HH:MM ou vide'),
  type: z.enum(['Client', 'Consultant', 'Recrutement', 'Interne']),
  detail: z.string().describe('Personnes, lieu ou visio'),
});

export const PersonDateSchema = z.object({
  name: z.string(),
  kind: z.enum(['contact', 'consultant', 'candidate']),
  date: z.string().describe('Date de naissance AAAA-MM-JJ, ou --MM-JJ si l’année est inconnue'),
});

export const AnalysisSchema = z.object({
  reply: z.string().describe('Réponse courte et chaleureuse du copilote (1 à 2 phrases), à l’oral, tutoiement'),
  exchanges: z.array(ExchangeSchema).describe('Un élément par sujet distinct (client, candidat ou consultant)'),
  meetings: z.array(MeetingSchema).describe('Rendez-vous futurs explicitement fixés'),
  birthdays: z.array(PersonDateSchema).describe('Anniversaires explicitement mentionnés'),
  followUp: z.string().describe('UNE seule question utile pour compléter ce qui manque le plus, ou vide si tout est clair'),
});

// `stage` reste une chaîne côté application (compatibilité v11), l'énumération ne contraint que la sortie IA.
export type Analysis = Omit<z.infer<typeof AnalysisSchema>, 'exchanges'> & { exchanges: Exchange[] };
export type Meeting = z.infer<typeof MeetingSchema>;
export type PersonDate = z.infer<typeof PersonDateSchema>;

export const ComposeKinds = ['birthday', 'reactivation', 'followup', 'mission', 'thanks', 'season'] as const;
export type ComposeKind = (typeof ComposeKinds)[number];
