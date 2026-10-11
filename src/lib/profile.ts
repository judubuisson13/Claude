// Profil de jeu : style (repris du quiz v11), apparence du personnage, copilote, univers.
// Stocké en local (clé `tempo-avatar` compatible v11, enrichie) — ce n'est pas un test psychométrique.

export const playStyles = [
  { id: 'red', name: 'Rouge', title: 'Pionnier', archetype: 'pionnier', color: '#ff6b5e', soft: '#ffe1dd', verb: 'Faire avancer', description: 'Tu privilégies une décision claire et un prochain pas concret.', coach: 'On va droit au prochain pas, puis on vérifie ce qui pourrait le bloquer.', focus: 'missions' },
  { id: 'yellow', name: 'Jaune', title: 'Connecteur', archetype: 'connecteur', color: '#ffc93c', soft: '#fff3cf', verb: 'Créer des liens', description: 'Tu privilégies l’échange, les idées et les nouvelles connexions.', coach: 'On part des personnes rencontrées, puis on transforme les idées en engagements.', focus: 'radar' },
  { id: 'green', name: 'Vert', title: 'Bâtisseur', archetype: 'batisseur', color: '#3ecf8e', soft: '#d6f7e7', verb: 'Faire grandir', description: 'Tu privilégies l’écoute, la continuité et le suivi des engagements.', coach: 'On regarde comment vont tes relations, puis on pose une prochaine action datée.', focus: 'team' },
  { id: 'blue', name: 'Bleu', title: 'Stratège', archetype: 'stratege', color: '#5aa2ff', soft: '#dcebff', verb: 'Comprendre et structurer', description: 'Tu privilégies les faits, les critères et la préparation.', coach: 'On clarifie les faits et les inconnues, puis on choisit une action utile.', focus: 'scores' },
] as const;
export type StyleId = (typeof playStyles)[number]['id'];

export const situations = [
  { question: 'Un client te confie un besoin encore flou. Ton premier réflexe ?', answers: ['Faire préciser la décision attendue et son échéance.', 'Explorer ses idées et les personnes à associer.', 'Écouter ce qui le préoccupe au quotidien.', 'Faire préciser les contraintes et les critères de réussite.'] },
  { question: 'Tu rencontres une nouvelle équipe. Tu commences par…', answers: ['Proposer un premier objectif concret.', 'Faire connaissance et ouvrir la discussion.', 'Comprendre le rôle et les attentes de chacun.', 'Comprendre son organisation et ses méthodes.'] },
  { question: 'Une mission rencontre une difficulté. Tu préfères…', answers: ['Décider rapidement d’une action corrective.', 'Réunir les personnes qui peuvent trouver une idée.', 'Écouter le consultant et le client séparément.', 'Reconstituer les faits avant de proposer une solution.'] },
  { question: 'Tu as vingt minutes pour préparer demain. Tu…', answers: ['Choisis l’action qui débloquera le plus de choses.', 'Repères les personnes à contacter et les liens à créer.', 'Vérifies les promesses faites et les suivis attendus.', 'Relis les chiffres et complètes les informations manquantes.'] },
  { question: 'Qu’attends-tu en premier de ton copilote ?', answers: ['Qu’il m’aide à passer à l’action.', 'Qu’il m’aide à voir de nouvelles pistes.', 'Qu’il m’aide à entretenir mes relations.', 'Qu’il m’aide à prendre une décision bien étayée.'] },
];

export const roles = [
  { id: 'bm', label: 'Business manager ESN', hint: 'Comptes, besoins, consultants et candidats' },
  { id: 'sales', label: 'Commercial', hint: 'Comptes, contacts, opportunités et relances' },
  { id: 'recruiter', label: 'Recruteur / talent', hint: 'Candidats, entretiens et besoins clients' },
] as const;
export type RoleId = (typeof roles)[number]['id'];

export const worlds = {
  garden: { label: 'Jardin', icon: '🌱', title: 'Ton jardin de relations', unit: 'plante', success: 'De nouvelles pousses dans ton jardin !', sky: ['#bfe9ff', '#e9f9ff'], ground: '#7bd389' },
  ocean: { label: 'Océan', icon: '🦈', title: 'Ton archipel à explorer', unit: 'île', success: 'Ton archipel vient de s’étendre !', sky: ['#7fd3ff', '#d9f4ff'], ground: '#2a8fd6' },
  pirate: { label: 'Conquête', icon: '🏴‍☠️', title: 'Le cap de ton équipage', unit: 'navire', success: 'Ton équipage gagne du terrain !', sky: ['#ffcf8a', '#ffe9c7'], ground: '#1f6f9b' },
} as const;
export type WorldId = keyof typeof worlds;

export const copilots = [
  { id: 'fox', name: 'Roxy', species: 'renard', color: '#ff8a3d', line: 'Raconte-moi, je m’occupe du reste.' },
  { id: 'owl', name: 'Hibou Max', species: 'hibou', color: '#8b6cff', line: 'Les faits d’abord, je range tout.' },
  { id: 'turtle', name: 'Tortuga', species: 'tortue', color: '#30b47b', line: 'On avance pas à pas, sans rien oublier.' },
  { id: 'bot', name: 'Kompas', species: 'robot', color: '#3a8dff', line: 'Prêt à transformer ta journée en actions.' },
] as const;
export type CopilotId = (typeof copilots)[number]['id'];

export const skinTones = ['#ffdfc4', '#f0c08f', '#d29a6a', '#a86b42', '#6f4329'];
export const hairColors = ['#2b1d16', '#6b3f22', '#c98a3d', '#e9d18b', '#d9534f', '#8a8f99'];
export const hairStyles = ['short', 'curly', 'long', 'bun', 'bald'] as const;
export const accessories = ['none', 'glasses', 'headset', 'cap', 'scarf'] as const;

export type Look = { skin: string; hair: string; hairStyle: (typeof hairStyles)[number]; accessory: (typeof accessories)[number] };

export type Profile = {
  name: string;
  archetype: string;
  emoji: string; // compat v11
  color: string;
  styleKey: StyleId;
  styleScores?: number[];
  quizVersion: number;
  role: RoleId;
  look: Look;
  copilot: CopilotId;
  world: WorldId;
  dailyMinutes: number;
};

const KEY = 'tempo-avatar';
const UNIVERSE_KEY = 'tempo-universe';

export function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p?.name) return null;
    if (p.quizVersion >= 2 && p.look) return p as Profile;
    // Profil v11 : on le reprend tel quel et on complète les nouveautés v12.
    const style = playStyles.find((s) => s.id === p.styleKey || s.archetype === p.archetype) || playStyles[0];
    let world: WorldId = 'garden';
    try { world = JSON.parse(localStorage.getItem(UNIVERSE_KEY) || '{}').theme || 'garden'; } catch { /* ignore */ }
    return { ...p, styleKey: style.id, color: p.color || style.color, quizVersion: 1, role: 'bm', look: { skin: skinTones[1], hair: hairColors[0], hairStyle: 'short', accessory: 'none' }, copilot: 'fox', world: world in worlds ? world : 'garden', dailyMinutes: 15 };
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    localStorage.setItem(UNIVERSE_KEY, JSON.stringify({ theme: p.world, coach: p.copilot }));
  } catch { /* stockage indisponible : le profil reste en mémoire */ }
}

export const styleOf = (p: Profile | null) => playStyles.find((s) => s.id === p?.styleKey) || playStyles[0];
export const copilotOf = (p: Profile | null) => copilots.find((c) => c.id === p?.copilot) || copilots[0];
