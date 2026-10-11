# Tempo Play · v12

**Le CRM qui se remplit en racontant sa journée.** Un copilote commercial pour business manager ESN, commercial ou recruteur, sous la forme d'un petit jeu de gestion : chaque soir, 15 minutes de débrief vocal ; l'IA crée les fiches, les next steps et les rendez-vous ; ton territoire (jardin, archipel ou flotte) grandit avec la qualité de tes relations.

> Cette v12 repense l'expérience de la v11 (premier jet) **sans repartir de zéro côté métier** : modèle de données, `buildPlan`, calcul d'XP, jauge de relation et contrats d'API sont repris tels quels. Le code v11 d'origine est conservé dans `legacy/tempo-v11/`, la passation dans `docs/passation/`.

## Le parcours

1. **Création du personnage** : terrain de jeu (BM ESN / commercial / recruteur) → 5 situations → style de couleur (rouge, jaune, vert, bleu) → apparence (teint, coiffure, accessoire) → copilote incarné (Roxy le renard, Hibou Max, Tortuga, Kompas le robot) → univers → durée du rituel.
2. **Une interface attribuée** : la couleur de style devient l'accent de toute l'app, le copilote change, et l'ordre de l'accueil s'adapte (Pionnier → missions d'abord, Connecteur → radar relationnel, Bâtisseur → équipe, Stratège → indicateurs).
3. **Le territoire vivant** : chaque compte est une plante / une île / un navire. Il grandit selon 6 éléments documentés (compte, contact, fonction, service, récit, action datée) et se fane quand la cadence de contact est dépassée. Les consultants se promènent, les candidats flottent. Un tap ouvre la fiche.
4. **Le rituel de 15 min** : le copilote ouvre sur l'agenda du jour (« Tu avais Besoin Java · Aérovia à 14h30, comment ça s'est passé ? »), tu parles (dictée continue, finir par « c'est tout » envoie), il répond, pose **une** question sur ce qui manque, et les cartes de mises à jour volent dans la pile « Ton CRM se remplit ». Minuteur circulaire, voix du copilote activable.
5. **Revue avant écriture** : créations / mises à jour / next steps / événements, champs manquants en pointillés, dates validées (31/02 refusé), anniversaires détectés. Rien n'est écrit sans validation.
6. **Bilan animé** : XP qui défile, passage de niveau, confettis, les comptes concernés brillent dans le territoire. En cas d'échec réseau ou de conflit : aucune récompense fictive, les réponses restent modifiables.
7. **Radar** : anniversaires (consultants, contacts), comptes silencieux au-delà de leur cadence, retards, points de mission, anniversaires de mission, CV manquants, budgets à confirmer → **proposition de message** (IA ou modèle), copier / e-mail, puis « J'ai envoyé » met à jour le dernier contact du compte.
8. **CRM en second niveau** : recherche, onglets par type, fiche éditable avec les fiches reliées.

## Lancer

```bash
npm install
npm run dev            # API sur :8787 + interface Vite sur :5173
# ou en production :
npm run build && npm start   # tout sur :8787
```

Sans configuration, l'analyse du récit est **locale** (règles prudentes). Pour l'IA :

```bash
export ANTHROPIC_API_KEY=...       # côté serveur uniquement, jamais dans le navigateur
npm run dev
```

Variables utiles : `TEMPO_DB` (chemin SQLite, défaut `data/tempo.sqlite`), `TEMPO_USER_ID` (défaut `local`), `TEMPO_MODEL` (défaut `claude-opus-5-5`), `TEMPO_EFFORT` (`low` / `medium` / `high`, défaut `medium`), `HOST` / `PORT` (mettre `HOST=0.0.0.0` pour tester sur son téléphone en réseau local — la dictée exige alors HTTPS sur la plupart des navigateurs mobiles).

Tests : `npm test` (scénarios d'acceptation de la passation : récit Lumena, compte enrichi sans doublon, candidat sans CV, liens vérifiables, date impossible, transaction tout-ou-rien, import sans écrasement). Vérification de types : `npm run typecheck`.

## Architecture

| Fichier | Rôle |
|---|---|
| `src/lib/debrief-model.ts` | **Repris de la v11 à l'identique** : `Exchange`, `extractFacts`, `buildPlan`, `gameProgress`, dates |
| `src/lib/plan.ts` | Extension : rendez-vous et anniversaires ajoutés au plan, sans doublon |
| `src/lib/analysis-schema.ts` | Contrat de sortie structurée (zod) partagé serveur / client |
| `server/ai.ts` | Appels Claude (sortie structurée validée, repli serveur en cas de refus), rédaction de messages |
| `src/lib/local-analyzer.ts` | Analyse de secours sans IA : segmentation par sujet, dates relatives, RDV, anniversaires |
| `src/lib/insights.ts` | Radar + agenda de session + modèles de messages |
| `src/lib/game.ts` | Jauge de relation v11, fraîcheur, série de jours, indicateurs |
| `server/db.ts`, `server/index.ts` | SQLite (`node:sqlite`), même table `records` que la v11 ; API |
| `src/screens/*` | Onboarding, Accueil, Session vocale (+ revue + bilan), Radar, CRM, Profil |
| `src/components/*` | Avatar et copilote vectoriels animés, monde, primitives UI |

Stack : React 19, Vite, Motion (animations), TypeScript, Node ≥ 22.13. Plus de dépendance à l'hébergement Sites / Cloudflare de la v11.

### API (contrats v11 conservés)

- `GET /api/data` → `{items, demo:false}`
- `POST /api/data` → version **de départ** (0 = création), 409 en conflit
- `POST /api/debrief` → versions **cibles** (1 = création), 1 à 160 fiches, tout-ou-rien, répétition identique acceptée. Ajout v12 : type `meeting` autorisé.
- Nouveaux : `POST /api/analyze`, `POST /api/compose`, `GET /api/export`, `POST /api/import` (conserve id/version/date, n'écrase jamais), `GET /api/status`.

## Garde-fous conservés

- Mode **démo** (fixtures fictives, bandeau jaune, données dans le navigateur) strictement séparé de **Mon espace** (serveur).
- L'IA n'invente ni budget, ni nom, ni étape ; `budgetNote` n'est jamais converti en CA.
- Les couleurs de style personnalisent l'interface ; ce n'est pas un test psychométrique et cela n'évalue jamais les candidats. Anniversaires et données RH ne servent qu'à la relation.
- XP recalculée depuis les fiches (même formule que la v11) : ce n'est pas une mesure de performance.
- Animations respectueuses de `prefers-reduced-motion`.

## Limites connues / prochaines étapes

- **Données de production non migrées** : aucun export réel n'a été fourni. Procédure : exporter la table D1 `records` (ou `GET /api/data` de la v11 avec `demo:false`), puis l'importer via Profil → Importer (`POST /api/import`). Lire `docs/passation/04_MIGRATION_DONNEES.md`.
- Authentification : instance mono-utilisateur (`TEMPO_USER_ID`). Brancher un vrai fournisseur avant tout usage partagé.
- Dictée : Web Speech API du navigateur (Chrome / Edge / Safari) ; pas encore de transcription serveur ni d'import d'enregistrement.
- Pas d'envoi d'e-mail / LinkedIn intégré (copie ou `mailto:`), pas de notifications push planifiées.
- Prochaines itérations proposées : import et lecture de CV + matching explicable, transcription serveur, rappels push, CRM d'équipe partagé et personnages des collaborateurs.
