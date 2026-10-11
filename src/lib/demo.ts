// Données FICTIVES de démonstration, datées par rapport à aujourd'hui pour que le radar ait toujours du contenu.
// Elles vivent uniquement dans le navigateur en mode démo et ne sont jamais envoyées au serveur.
import { today, type RecordItem } from './debrief-model';
import { addDays } from './dates';

export function demoItems(base = today()): RecordItem[] {
  const d = (n: number) => addDays(base, n);
  const md = (n: number) => '1990-' + d(n).slice(5); // anniversaire dans n jours
  const r = (id: string, kind: string, data: any): RecordItem => ({ id, kind, version: 1, data });
  return [
    r('a1', 'account', { name: 'Aérovia', sector: 'Aéronautique', status: 'Stratégique', technologies: 'Java, Spring Boot, PostgreSQL, Docker', positioning: 'Modernisation des équipes produit', lastContact: d(-12), nextContact: d(4), cadence: 30 }),
    r('a2', 'account', { name: 'Nova Industrie', sector: 'Industrie', status: 'Client', technologies: 'Python, AWS, React', positioning: 'Plateforme data', lastContact: d(-41), nextContact: '', cadence: 30 }),
    r('a3', 'account', { name: 'Orbis Banque', sector: 'Banque', status: 'Client', technologies: 'Agile, SQL, .NET', positioning: 'Projets réglementaires', lastContact: d(-5), nextContact: d(10), cadence: 21 }),
    r('a4', 'account', { name: 'Helio Énergie', sector: 'Énergie', status: 'Prospect', technologies: 'Azure, Data', positioning: '', lastContact: d(-64), nextContact: '', cadence: 45 }),
    r('p1', 'contact', { name: 'Marc Dubois', accountId: 'a1', role: 'Directeur produit', service: 'Engineering', influence: 'Décideur', managerId: '', birth: md(2) }),
    r('p2', 'contact', { name: 'Julie Fontaine', accountId: 'a2', role: 'Head of Data', service: 'Data platform', influence: 'Décideuse', managerId: '' }),
    r('p3', 'contact', { name: 'Paul Leroy', accountId: 'a3', role: 'Chef de projet', service: 'Conformité', influence: 'Prescripteur', managerId: '' }),
    r('c1', 'consultant', { name: 'Sophie Martin', role: 'Développeuse Java', client: 'Aérovia', accountId: 'a1', status: 'En mission', tjm: 580, cost: 395, followUp: d(1), birth: md(0), missionStart: (Number(base.slice(0, 4)) - 1) + '-' + d(3).slice(5), skills: 'Java, Spring Boot, PostgreSQL, Docker', avatar: '👩‍💻' }),
    r('c2', 'consultant', { name: 'Karim Benali', role: 'Data engineer', client: 'Nova Industrie', accountId: 'a2', status: 'En mission', tjm: 640, cost: 430, followUp: d(-2), birth: '1990-12-12', skills: 'Python, SQL, Spark, Airflow, AWS', avatar: '🧑‍🔬' }),
    r('c3', 'consultant', { name: 'Emma Laurent', role: 'Cheffe de projet IT', client: 'Orbis Banque', accountId: 'a3', status: 'En mission', tjm: 650, cost: 440, followUp: d(9), birth: md(9), skills: 'Agile, Scrum, Jira', avatar: '👩‍💼' }),
    r('v1', 'candidate', { name: 'Alex Renard', role: 'Développeur Java', reference: 'T-1041', status: 'Disponible', skills: 'Java, Spring Boot, PostgreSQL, Docker, Agile', summary: 'Développeur backend, API métier.', availability: 'Immédiate', cvRequired: false, avatar: '🧑‍💻' }),
    r('v2', 'candidate', { name: 'Camille Roy', role: 'Data engineer', reference: 'T-1042', status: 'En échange', skills: 'Python, SQL, Spark, AWS', summary: 'Pipelines et industrialisation.', availability: 'Sous un mois', cvRequired: true, avatar: '👩‍🔬' }),
    r('o1', 'opportunity', { title: 'Développeur Java senior', client: 'Aérovia', accountId: 'a1', contactId: 'p1', stage: 'Proposition', brief: 'Renfort équipe produit.', requirements: ['Java', 'Spring Boot', 'PostgreSQL'], budgetNote: 'TJM 600 €', stageEvidence: 'Proposition envoyée', amount: 0 }),
    r('o2', 'opportunity', { title: 'Ingénieur data', client: 'Nova Industrie', accountId: 'a2', contactId: 'p2', stage: 'À qualifier', brief: 'Data platform AWS.', requirements: ['Python', 'SQL', 'AWS'], budgetNote: 'À confirmer', stageEvidence: '', amount: 0 }),
    r('t1', 'task', { title: 'Relancer Marc sur le besoin Java', category: 'Prospection', priority: 'Haute', status: 'À faire', due: d(-1), owner: 'Moi', accountId: 'a1', contactId: 'p1', opportunityId: 'o1', client: 'Aérovia' }),
    r('t2', 'task', { title: 'Envoyer le dossier de Camille', category: 'Recrutement', priority: 'Normale', status: 'À faire', due: d(0), owner: 'Moi', candidateId: 'v2' }),
    r('t3', 'task', { title: 'Préparer la revue trimestrielle Orbis', category: 'Compte', priority: 'Normale', status: 'À faire', due: d(3), owner: 'Moi', accountId: 'a3', client: 'Orbis Banque' }),
    r('t4', 'task', { title: 'Valider les CRA du mois', category: 'Administratif', priority: 'Normale', status: 'Terminé', due: d(-3), owner: 'Moi' }),
    r('m1', 'meeting', { title: 'Besoin Java · Aérovia', date: d(0), time: '14:30', type: 'Client', detail: 'Marc Dubois' }),
    r('m2', 'meeting', { title: 'Point mission · Sophie', date: d(0), time: '11:00', type: 'Consultant', detail: 'Visio' }),
    r('m3', 'meeting', { title: 'Entretien technique · Camille Roy', date: d(1), time: '10:00', type: 'Recrutement', detail: 'Bureau' }),
    r('g1', 'goal', { title: 'Nouveaux besoins qualifiés', horizon: 'Mois', axis: 'Prospection', current: 3, target: 6, unit: 'besoins', due: d(20) }),
    r('g2', 'goal', { title: 'Consultants en mission', horizon: 'Trimestre', axis: 'Activité', current: 3, target: 5, unit: 'consultants', due: d(80) }),
    r('act1', 'activity', { title: 'Débrief · Aérovia', text: 'Marc confirme le besoin Java, proposition envoyée.', source: 'Débrief guidé', createdAt: d(-12) + 'T17:00:00.000Z', accounts: ['Aérovia'], consultants: [], candidates: [], opportunities: ['Développeur Java senior'], actions: ['Relancer Marc sur le besoin Java'], relatedIds: ['a1', 'p1', 'o1', 't1'], links: ['Aérovia ↔ Marc Dubois', 'Aérovia ↔ Développeur Java senior'], missing: [], qualityChecked: true, completeness: 100, tone: 'Neutre', details: {} }),
  ];
}
