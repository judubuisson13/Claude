import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictError, importRows, listRecords, openDb, writeBatch, writeOne } from '../server/db';
import { addDays, findFrenchDate, nextAnniversary } from '../src/lib/dates';
import { dateAnswer, empty, gameProgress, today, type RecordItem } from '../src/lib/debrief-model';
import { computeInsights } from '../src/lib/insights';
import { analyseLocally } from '../src/lib/local-analyzer';
import { buildFullPlan } from '../src/lib/plan';
import { emptyX } from '../src/lib/analysis-schema';
import { checklist, completeness, nextMissing } from '../src/lib/completeness';
import { matchNeed } from '../src/lib/matching';
import { wrapped } from '../src/lib/wrapped';
import { demoItems } from '../src/lib/demo';

const LUMENA = 'Client : Lumena ; interlocuteur : Alex Exemple ; fonction : Responsable data ; service : Plateforme ; besoin : Data engineer ; compétences : Python, SQL ; prochaine action : Obtenir le budget ; échéance : 15/10/2026.';

test('scénario Lumena : faits repris, prix non inventé, question sur le budget', () => {
  const a = analyseLocally(LUMENA, []);
  assert.equal(a.exchanges.length, 1);
  const e = a.exchanges[0];
  assert.equal(e.client, 'Lumena');
  assert.equal(e.contact, 'Alex Exemple');
  assert.equal(e.role, 'Responsable data');
  assert.equal(e.service, 'Plateforme');
  assert.equal(e.need, 'Data engineer');
  assert.equal(e.skills, 'Python, SQL');
  assert.equal(e.due, '2026-10-15');
  assert.equal(e.budget, '');
  assert.match(a.followUp, /budget/i);
});

test('date impossible refusée, dates relatives en Europe/Paris', () => {
  assert.equal(dateAnswer('31/02/2027'), '');
  assert.equal(findFrenchDate('le 31/02/2027'), '');
  assert.equal(findFrenchDate('demain', '2026-10-11'), '2026-10-12');
  assert.equal(findFrenchDate('lundi prochain', '2026-10-11'), '2026-10-12');
  assert.equal(findFrenchDate('le 14 mars', '2026-10-11'), '2027-03-14');
  assert.equal(nextAnniversary('1990-10-13', '2026-10-11'), '2026-10-13');
  assert.equal(nextAnniversary('--01-05', '2026-10-11'), '2027-01-05');
});

test('compte existant enrichi sans doublon, contacts liés', () => {
  const items: RecordItem[] = [{ id: 'a1', kind: 'account', version: 3, data: { name: 'Lumena', technologies: 'Java', cadence: 30 } }];
  const plan = buildFullPlan({ exchanges: analyseLocally(LUMENA, items).exchanges, meetings: [], birthdays: [] }, items);
  const accounts = plan.filter((r) => r.kind === 'account');
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].id, 'a1');
  assert.equal(accounts[0].version, 4);
  assert.match(accounts[0].data.technologies, /Java, Python, SQL/);
  const contact = plan.find((r) => r.kind === 'contact')!;
  const task = plan.find((r) => r.kind === 'task')!;
  const opp = plan.find((r) => r.kind === 'opportunity')!;
  const activity = plan.find((r) => r.kind === 'activity')!;
  assert.equal(contact.data.accountId, 'a1');
  assert.equal(task.data.accountId, 'a1');
  assert.equal(task.data.contactId, contact.id);
  assert.equal(task.data.opportunityId, opp.id);
  assert.equal(task.data.sourceActivityId, activity.id);
  assert.ok(activity.data.relatedIds.includes(task.id));
});

test('candidat sans CV : manque explicitement indiqué', () => {
  const plan = buildFullPlan({ exchanges: [emptyX({ ...empty(), candidate: 'Nina Test', candidateRole: 'Dev React', story: 'Bon échange' })], meetings: [], birthdays: [] }, []);
  const c = plan.find((r) => r.kind === 'candidate')!;
  assert.equal(c.data.cvRequired, true);
  assert.ok(plan.find((r) => r.kind === 'activity')!.data.missing.includes('CV à ajouter'));
});

test('rendez-vous et anniversaire ajoutés au plan, sans doublon', () => {
  const d = addDays(today(), 3);
  const items: RecordItem[] = [
    { id: 'p1', kind: 'contact', version: 2, data: { name: 'Marc Dubois' } },
    { id: 'm1', kind: 'meeting', version: 1, data: { title: 'Point Aérovia', date: d } },
  ];
  const plan = buildFullPlan({ exchanges: [], meetings: [{ title: 'Point Aérovia', date: d, time: '', type: 'Client', detail: '' }, { title: 'Déjeuner Orbis', date: d, time: '12:30', type: 'Client', detail: '' }], birthdays: [{ name: 'marc dubois', kind: 'contact', date: '--03-14' }, { name: 'Inconnu', kind: 'contact', date: '--01-01' }] }, items);
  assert.equal(plan.filter((r) => r.kind === 'meeting').length, 1);
  const marc = plan.find((r) => r.id === 'p1')!;
  assert.equal(marc.version, 3);
  assert.equal(marc.data.birth, '--03-14');
  assert.equal(plan.length, 2);
});

test('radar : anniversaire proche, compte silencieux, retard', () => {
  const base = '2026-10-11';
  const items: RecordItem[] = [
    { id: 'c1', kind: 'consultant', version: 1, data: { name: 'Sophie Martin', birth: '1993-10-13' } },
    { id: 'a1', kind: 'account', version: 1, data: { name: 'Nova', lastContact: '2026-08-01', cadence: 30 } },
    { id: 't1', kind: 'task', version: 1, data: { title: 'Relancer', status: 'À faire', due: '2026-10-05' } },
  ];
  const types = computeInsights(items, base).map((i) => i.type);
  assert.ok(types.includes('birthday'));
  assert.ok(types.includes('stale'));
  assert.ok(types.includes('overdue'));
});

test('XP : même algorithme que la v11', () => {
  const p = gameProgress([{ id: 'x', kind: 'activity', version: 1, data: { actions: ['a'], links: ['l1', 'l2'] } }, { id: 'c', kind: 'candidate', version: 1, data: {} }]);
  assert.equal(p.xp, 120 + 25 + 30 + 40);
  assert.equal(p.level, 1);
});

test('SQLite : contrats de version v11, transaction tout-ou-rien, répétition identique acceptée', () => {
  const db = openDb(':memory:');
  assert.equal(writeOne(db, 'u', { id: 'a', kind: 'account', data: { name: 'A' }, version: 0 }), 1);
  assert.throws(() => writeOne(db, 'u', { id: 'a', kind: 'account', data: { name: 'A' }, version: 0 }), ConflictError);
  assert.equal(writeOne(db, 'u', { id: 'a', kind: 'account', data: { name: 'A2' }, version: 1 }), 2);

  const batch = [{ id: 'a', kind: 'account', data: { name: 'A3' }, version: 3 }, { id: 'b', kind: 'task', data: { title: 'T' }, version: 1 }];
  writeBatch(db, 'u', batch);
  writeBatch(db, 'u', batch); // répétition strictement identique
  assert.throws(() => writeBatch(db, 'u', [{ id: 'c', kind: 'task', data: {}, version: 1 }, { id: 'a', kind: 'account', data: { name: 'X' }, version: 3 }]));
  const rows = listRecords(db, 'u');
  assert.equal(rows.length, 2, 'la fiche c ne doit pas exister après rollback');
  assert.equal(listRecords(db, 'autre').length, 0, 'isolation par utilisateur');

  const r = importRows(db, 'u', [{ id: 'a', kind: 'account', data: { name: 'écrasé ?' } }, { id: 'z', kind: 'contact', data: { name: 'Z' }, version: 4, updated_at: '2026-01-01T00:00:00.000Z' }]);
  assert.deepEqual(r, { created: 1, skipped: 1 });
  const z = listRecords(db, 'u').find((x) => x.id === 'z')!;
  assert.equal(z.version, 4);
  assert.equal(JSON.parse(listRecords(db, 'u').find((x) => x.id === 'a')!.data).name, 'A3');
});

test('checklist : relance sur les infos manquantes, dans l’ordre, et « je ne sais pas » respecté', () => {
  const e = emptyX({ ...empty(), client: 'Lumena', contact: 'Alex', need: 'Data engineer', skills: 'Python' });
  const keys = checklist(e).filter((c) => !c.ok).map((c) => c.key);
  assert.deepEqual(keys, ['role', 'budget', 'needDeadline', 'resources', 'action']);
  const first = nextMissing([e], new Set())!;
  assert.equal(first.item.key, 'role');
  const after = nextMissing([e], new Set(['lumena::role']))!;
  assert.equal(after.item.key, 'budget');
  assert.ok(completeness([e]) > 0.4 && completeness([e]) < 0.7);
});

test('analyse locale : deadline et ressources identifiées', () => {
  const items = demoItems('2026-10-11');
  const a = analyseLocally('Chez Nova Industrie avec Julie Fontaine, ils cherchent un data engineer Python SQL, démarrage le 2 novembre. J’ai déjà pensé à Nora Haddad.', items);
  const e = a.exchanges[0];
  assert.equal(e.needDeadline, '2026-11-02');
  assert.match(e.resources, /Nora Haddad/);
  const plan = buildFullPlan({ exchanges: a.exchanges, meetings: [], birthdays: [] }, items);
  const opp = plan.find((r) => r.kind === 'opportunity')!;
  assert.equal(opp.data.deadline, '2026-11-02');
  assert.deepEqual(opp.data.resourceIds, ['v3']);
});

test('matching vivier : compétences trouvées / manquantes et ancienneté', () => {
  const items = demoItems('2026-10-11');
  const m = matchNeed('Python, SQL, Airflow', items, { base: '2026-10-11' });
  assert.equal(m[0].person.data.name, 'Nora Haddad');
  assert.equal(m[0].score, 1);
  assert.match(m[0].seen, /2 mois/);
  assert.ok(m.every((x) => x.matched.length > 0));
});

test('wrap : semaine, mois, année cohérents', () => {
  const items = demoItems('2026-10-11');
  const w = wrapped(items, 'week', '2026-10-11');
  const mth = wrapped(items, 'month', '2026-10-11');
  const y = wrapped(items, 'year', '2026-10-11');
  assert.ok(w.debriefs <= mth.debriefs && mth.debriefs <= y.debriefs);
  assert.ok(y.debriefs >= 15);
  assert.ok(y.clients.length >= 3);
  assert.ok(y.persona.title.length > 0);
});
