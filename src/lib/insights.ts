// Radar du copilote : signaux calculés à partir des fiches, sans appel réseau.
// Les anniversaires servent uniquement à entretenir la relation — jamais au matching.
import type { ComposeKind } from './analysis-schema';
import { today, type RecordItem } from './debrief-model';
import { addDays, daysBetween, nextAnniversary, relativeDay } from './dates';

export type Insight = {
  id: string;
  type: 'birthday' | 'stale' | 'overdue' | 'mission' | 'cv' | 'budget' | 'meeting';
  title: string;
  detail: string;
  urgency: number; // 0 (info) → 3 (à faire maintenant)
  recordId?: string;
  person?: string;
  compose?: ComposeKind;
  icon: string;
};

export function computeInsights(items: RecordItem[], base = today()): Insight[] {
  const out: Insight[] = [];

  for (const p of items.filter((i) => ['consultant', 'contact', 'candidate'].includes(i.kind) && i.data.birth)) {
    const next = nextAnniversary(p.data.birth, base);
    if (!next) continue;
    const n = daysBetween(base, next);
    if (n <= 14) {
      out.push({
        id: 'bday-' + p.id, type: 'birthday', icon: '🎂', recordId: p.id, person: p.data.name, compose: 'birthday',
        title: n === 0 ? `C'est l'anniversaire de ${p.data.name} !` : `Anniversaire de ${p.data.name} ${relativeDay(next, base)}`,
        detail: 'Un petit mot personnel fait toujours plaisir.', urgency: n === 0 ? 3 : n <= 2 ? 2 : 1,
      });
    }
  }

  for (const a of items.filter((i) => i.kind === 'account')) {
    const cadence = Number(a.data.cadence) || 30;
    const last = a.data.lastContact;
    if (!last) continue;
    const silent = daysBetween(last, base);
    if (silent > cadence) {
      out.push({
        id: 'stale-' + a.id, type: 'stale', icon: '🥀', recordId: a.id, person: a.data.name, compose: 'reactivation',
        title: `${a.data.name} sans nouvelles depuis ${silent} jours`,
        detail: `Ta cadence prévue est de ${cadence} jours. Un message de reprise de contact ?`, urgency: silent > cadence * 1.5 ? 2 : 1,
      });
    }
  }

  for (const t of items.filter((i) => i.kind === 'task' && i.data.status !== 'Terminé' && i.data.due)) {
    const late = daysBetween(t.data.due, base);
    if (late > 0) {
      out.push({ id: 'late-' + t.id, type: 'overdue', icon: '⏰', recordId: t.id, title: t.data.title, detail: `En retard de ${late} jour${late > 1 ? 's' : ''}`, urgency: late > 3 ? 3 : 2 });
    }
  }

  for (const c of items.filter((i) => i.kind === 'consultant' && i.data.followUp)) {
    const n = daysBetween(base, c.data.followUp);
    if (n <= 3) {
      out.push({
        id: 'mission-' + c.id, type: 'mission', icon: '🧭', recordId: c.id, person: c.data.name, compose: 'mission',
        title: `Point mission avec ${c.data.name}`, detail: n < 0 ? `Prévu ${relativeDay(c.data.followUp, base)} — à reprogrammer` : `Prévu ${relativeDay(c.data.followUp, base)}${c.data.client ? ' · ' + c.data.client : ''}`,
        urgency: n < 0 ? 2 : 1,
      });
    }
    if (c.data.missionStart) {
      const anniv = nextAnniversary(c.data.missionStart, base);
      if (anniv && anniv !== c.data.missionStart && daysBetween(base, anniv) <= 7) {
        const years = Number(anniv.slice(0, 4)) - Number(c.data.missionStart.slice(0, 4));
        out.push({ id: 'manniv-' + c.id, type: 'mission', icon: '🏅', recordId: c.id, person: c.data.name, compose: 'thanks', title: `${years} an${years > 1 ? 's' : ''} de mission pour ${c.data.name}`, detail: `${relativeDay(anniv, base)[0].toUpperCase() + relativeDay(anniv, base).slice(1)} chez ${c.data.client || 'son client'}.`, urgency: 1 });
      }
    }
  }

  for (const c of items.filter((i) => i.kind === 'candidate' && i.data.cvRequired)) {
    out.push({ id: 'cv-' + c.id, type: 'cv', icon: '📄', recordId: c.id, person: c.data.name, title: `CV de ${c.data.name} à récupérer`, detail: 'Le profil est créé, mais aucun CV n’a été analysé.', urgency: 1 });
  }

  for (const o of items.filter((i) => i.kind === 'opportunity' && !['Gagné', 'Perdu'].includes(i.data.stage) && (!i.data.budgetNote || i.data.budgetNote === 'À confirmer'))) {
    out.push({ id: 'budget-' + o.id, type: 'budget', icon: '💶', recordId: o.id, title: `Budget à confirmer · ${o.data.title}`, detail: o.data.client || '', urgency: 0 });
  }

  const soon = addDays(base, 1);
  for (const m of items.filter((i) => i.kind === 'meeting' && (i.data.date === base || i.data.date === soon))) {
    out.push({ id: 'meet-' + m.id, type: 'meeting', icon: '📅', recordId: m.id, title: m.data.title, detail: `${relativeDay(m.data.date, base)}${m.data.time ? ' à ' + m.data.time : ''}`, urgency: m.data.date === base ? 1 : 0 });
  }

  return out.sort((a, b) => b.urgency - a.urgency);
}

/** Sujets proposés au début de la session : rendez-vous du jour, retards, relances. */
export function sessionAgenda(items: RecordItem[], base = today()) {
  const topics: { id: string; label: string; prompt: string; icon: string }[] = [];
  for (const m of items.filter((i) => i.kind === 'meeting' && i.data.date === base).sort((a, b) => (a.data.time || '').localeCompare(b.data.time || ''))) {
    topics.push({ id: m.id, icon: '📅', label: m.data.title, prompt: `Tu avais « ${m.data.title} »${m.data.time ? ' à ' + m.data.time : ''}${m.data.detail ? ' avec ' + m.data.detail : ''}. Comment ça s'est passé ?` });
  }
  for (const t of items.filter((i) => i.kind === 'task' && i.data.status !== 'Terminé' && i.data.due && i.data.due <= base).slice(0, 4)) {
    topics.push({ id: t.id, icon: '✅', label: t.data.title, prompt: `Où en es-tu sur « ${t.data.title} » ? C'est fait, décalé, ou bloqué ?` });
  }
  for (const c of items.filter((i) => i.kind === 'consultant' && i.data.followUp && i.data.followUp <= addDays(base, 2)).slice(0, 2)) {
    topics.push({ id: c.id, icon: '🧑‍🚀', label: `Suivi ${c.data.name}`, prompt: `Des nouvelles de ${c.data.name}${c.data.client ? ' chez ' + c.data.client : ''} ? Comment se passe la mission ?` });
  }
  return topics;
}

/** Messages de secours (sans IA). L'utilisateur relit et décide toujours de l'envoi. */
export function templateMessage(kind: ComposeKind, name: string, ctx: { client?: string; sender?: string } = {}) {
  const first = name.split(' ')[0];
  const sign = ctx.sender ? `\n\n${ctx.sender}` : '';
  switch (kind) {
    case 'birthday': return `Bonjour ${first},\n\nJe te souhaite un très joyeux anniversaire ! Profite bien de cette journée 🎉${sign}`;
    case 'reactivation': return `Bonjour ${first},\n\nCela fait quelque temps que nous n'avons pas échangé. Comment avancent vos projets${ctx.client ? ' chez ' + ctx.client : ''} ? Je serais ravi d'en discuter autour d'un café ou d'un court appel la semaine prochaine.${sign}`;
    case 'mission': return `Bonjour ${first},\n\nJe reviens vers toi pour faire un point sur ta mission${ctx.client ? ' chez ' + ctx.client : ''}. Aurais-tu 20 minutes cette semaine ?${sign}`;
    case 'thanks': return `Bonjour ${first},\n\nDéjà un an de mission${ctx.client ? ' chez ' + ctx.client : ''} ! Merci pour ton engagement, les retours sont excellents. On se fait un déjeuner pour fêter ça ?${sign}`;
    case 'followup': return `Bonjour ${first},\n\nMerci encore pour notre échange. Comme convenu, je reviens vers vous avec les prochaines étapes.${sign}`;
    case 'season': return `Bonjour ${first},\n\nJe vous souhaite d'excellentes fêtes de fin d'année, ainsi qu'à vos équipes. Au plaisir de poursuivre nos échanges en début d'année !${sign}`;
  }
}
