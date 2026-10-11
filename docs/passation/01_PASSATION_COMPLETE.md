# TEMPO / TEMPO PLAY — Passation à Claude

État de reprise : 11 octobre 2026. Document fondé sur les demandes du porteur du projet et sur le code disponible, pas sur une nouvelle recette en production.

## Message à donner à Claude

> Tu reprends Tempo / Tempo Play, mon application de copilote commercial pour business manager en ESN. Lis cette passation puis le code joint avant de proposer une reconstruction. Je veux poursuivre l’existant, conserver ses fonctions métier et transformer davantage son expérience en jeu conversationnel quotidien. Le cœur du produit : je raconte ma journée pendant 15 à 20 minutes, un copilote personnalisé me pose les bonnes questions, structure et relie les informations, me fait valider les changements, puis montre une évolution animée de mon univers et de mes indicateurs. Le CRM détaillé reste accessible en second niveau. Commence par identifier ce qui existe réellement, les dépendances de l’hébergement et les écarts avec ma vision. Préserve les identifiants, les liens et les données ; ne remplace pas les vraies données par la démonstration. Propose puis réalise une prochaine itération ciblée, sans repartir de zéro. N’annonce pas de migration des données de production tant qu’un export réel n’a pas été fourni et vérifié. Le code, les exemples et les limites techniques sont joints dans l’archive.

## 1. Le concept et l’enjeu

Le porteur de projet est un business manager qui veut être secondé dans sa vie commerciale : développement de comptes, consultants, candidats, opportunités, tâches, relances, chiffres et objectifs. Il trouve les tableaux Excel difficiles à lire et ne veut pas recréer un Salesforce ou un SAP avec davantage de formulaires.

**La valeur différenciante est la transformation du récit commercial en données utiles, reliées entre elles, avec une expérience de jeu qui donne envie de tenir son activité à jour.** La récompense ne doit pas être seulement décorative : on voit les conséquences de ses actions et les prochaines choses à faire.

Usage quotidien cible : 15–20 minutes, particulièrement sur téléphone. Le commercial parle ou écrit, son copilote l’écoute, pose une question pertinente à la fois, repère les informations manquantes et prépare les mises à jour. Les modules détaillés restent disponibles pour consulter ou corriger les données.

L’utilisateur souhaite une vraie expérience d’application pratique sur mobile. L’existant est une application web avec éléments PWA, pas une application native distribuée sur les stores.

## 2. Parcours final attendu

1. Première connexion : quelques situations de travail aident à choisir son style, sa couleur, son avatar, son copilote et son univers. La personnalisation doit aller au-delà du prénom et d’un emoji.
2. Accueil immersif : un territoire vivant, son personnage, son équipe, les sujets du jour et une invitation claire à raconter sa journée.
3. Conversation : texte, dictée et, à terme, import d’enregistrement ou de compte rendu. Exemple : « Combien de clients as-tu vus ? », puis approfondissement de chaque rencontre sans imposer six formulaires identiques.
4. Questions adaptées aux réponses : qui, quel compte/service, problème, besoin, compétences, prix ou budget, stade, preuve du stade, prochaine action, responsable, date. Ne pas redemander ce qui est déjà connu ; permettre de préciser, corriger ou dire « je ne sais pas ».
5. Rapprochement avec l’existant : retrouver les comptes et personnes, repérer les doublons ou ambiguïtés, relier consultants, candidats, besoins et tâches. Demander un CV s’il manque, sans prétendre l’avoir reçu.
6. Synthèse révisable : montrer les créations, mises à jour, liens, points manquants et actions proposées. Validation explicite avant écriture.
7. Enregistrement réussi, puis récapitulatif animé : jauges avant/après, XP, niveau, évolution du jardin/territoire/personnage, relations mieux documentées et missions accomplies.

Ne pas transformer la conversation en simple formulaire de chat. L’utilisateur a plusieurs fois demandé une interaction plus vivante, un copilote incarné, des relances contextuelles et une animation visible en fin de séance.

## 3. Univers, avatars et ludification

- Jardin : cultiver les relations et faire grandir son activité.
- Océan : univers marin, éventuellement requin, explorer et développer son périmètre.
- Pirate : conquête, équipage, progression du territoire.
- Avatar personnel : niveau, style, couleur, évolution ; consultants et candidats représentés dans l’équipe.
- Missions, trophées et récompenses fondés sur des actions réellement enregistrées.
- Les thèmes changent l’analogie et la présentation, pas les règles métier ni la vérité des chiffres.

Couleurs souhaitées, inspirées des typologies comportementales : rouge/action, jaune/relation, vert/continuité et écoute, bleu/analyse et préparation. Le quiz actuel est un questionnaire maison de préférences, **pas un test DISC validé ni un diagnostic d’aptitude**. L’utilisateur doit pouvoir modifier la proposition. Ne pas utiliser ces couleurs pour évaluer ou classer les candidats.

Vision ultérieure : personnages des collaborateurs, CRM d’entreprise partagé, interactions entre équipes et lieux virtuels de réunion. Cette vision n’est pas un module actuellement livré.

## 4. Périmètre métier à conserver

| Domaine | Attentes exprimées |
|---|---|
| Activité | Rendez-vous, débriefs, tâches en temps réel, relances, sujets chauds, rappels et prochaines étapes |
| Objectifs | Court, moyen et long terme, axes de développement, trajectoires et indicateurs compréhensibles |
| Opportunités | Analyser fiches de poste et besoins, préciser budget/compétences/contexte, suggérer angles et profils |
| Matching | Comparer CV et besoin, expliquer les critères satisfaits/manquants, afficher une concordance ; ne pas confondre score et probabilité de réussite |
| Sourcing | Recherche LinkedIn associée, messages d’approche et de relance, propositions de profils |
| Vivier | Conserver et enrichir les candidats, compétences, disponibilité, composition du vivier et KPI |
| Dossiers | CV anonymisé et one-pager de qualité graphique, export et partage numérique rapides |
| Consultants / RH | Suivi individuel, missions, dates, anniversaires, relances, âges et histogrammes |
| Comptes | Organigrammes, interlocuteurs, hiérarchie et influence, technologies, positionnement, cibles pertinentes |
| Prospection | Liens entre comptes/technologies/profils, contacts à réactiver, événements clients et relances |
| Messages | Bibliothèque prospection, entretien de relation, Noël, vacances ; rédaction puis envoi décidé par l’utilisateur |
| Chiffres | Tableaux visuels lisibles, CA et marge lorsque les données le permettent, graphiques à la manière de Power BI |

Les anniversaires et informations RH ne doivent pas alimenter le classement des candidats. Les correspondances professionnelles portent sur compétences, expérience pertinente, disponibilité et contraintes du besoin.

## 5. Évolution du projet

Le parcours est passé d’un CRM classique et de tableaux de bord à la capture narrative, puis au débrief guidé, à la croissance ludique et enfin à une entrée dédiée « Tempo Play ».

- Première direction : couvrir le métier, centraliser les fiches, les chiffres et les modèles de documents.
- Correction majeure : automatiser la saisie depuis le récit ; le commercial ne doit pas remplir une multitude de KPI.
- Correction suivante : questionner les informations manquantes, relier les données et présenter une synthèse.
- Direction ludique : avatars, XP, trophées, jardin puis choix de plusieurs univers.
- Itérations de conversation : popup, questions progressives, réponses modifiables, récit en premier, clarification des limites de l’extraction.
- Version 10 : amélioration du débrief, plan de créations/mises à jour, enregistrement groupé, distinction du mode démo, animation d’impact.
- Version 11 : accueil Tempo Play par défaut, territoire/missions/équipe, quiz de personnalisation en cinq situations et couleurs de style.

Dernier déploiement connu : version 11, le 1er octobre 2026. Source exportée : commit `92f321c196893e03494d7e89220cfe267a3b9bc1`. Adresse connue : https://tempo-julious.jvlious.chatgpt.site — son accès peut nécessiter une autorisation. L’URL n’est pas un substitut au code ni un export de base de données.

## 6. État réel : implémenté, partiel, à construire

| Élément | État du code disponible |
|---|---|
| Accueil Tempo Play | Implémenté : univers, profil, territoire, missions, équipe et accès au CRM |
| Personnalisation | Quiz 5 situations, 4 styles, choix manuel, 8 emojis, prénom ; sauvegarde locale au navigateur |
| Conversation | Popup guidée, un échange à la fois, plusieurs sujets, corrections, synthèse avant validation |
| Extraction du récit | Règles et expressions régulières ; **aucun LLM distant branché** ; compréhension libre limitée |
| Dictée | API SpeechRecognition du navigateur selon compatibilité ; pas de transcription serveur d’audio importé |
| Données liées | Plan de création/enrichissement de comptes, contacts, candidats, consultants, opportunités, tâches, sujets et activités |
| Sauvegarde du débrief | API groupée avec contrôle de version et transaction ; démonstration séparée en mémoire |
| Animation finale | XP/niveau, compteurs et jauge de relation documentée avant/après ; animation réduite accessible |
| Matching | Concordance lexicale déterministe ; pas de modèle prédictif ni analyse sémantique complète des CV |
| CV / one-pager | Présentations depuis les champs structurés, impression navigateur ; anonymisation à auditer |
| Import de CV | Certains contrôles retiennent un nom de fichier ; pas de chaîne complète extraction/stockage des pièces |
| Mapping | Contacts et hiérarchie renseignés, technologies et suggestions locales ; pas d’enrichissement externe automatique |
| Mails et LinkedIn | Modèles et contenu à copier ; pas de connexion d’envoi ou synchronisation |
| RH / rappels | Vues et indicateurs ; pas de service complet de notifications planifiées ou push |
| Finance | Estimations et exemples visuels ; ne pas présenter comme comptabilité ou CA réellement facturé |
| Application mobile | Web responsive/PWA ; pas de binaire natif, pas de synchronisation complète hors ligne |
| Entreprise partagée | Non implémentée ; données actuellement isolées par utilisateur |

Les cartes d’univers et les emojis sont une première interface ludique. Il n’y a pas encore de monde 3D, de simulation élaborée ni de personnages animés sur mesure. Ne pas annoncer la vision finale comme achevée.

## 7. Architecture et fichiers à lire

Stack présente : React 19, TypeScript, Vinext/Vite, conventions Next, Tailwind 4, composants UI, Cloudflare Workers, D1/SQLite et Drizzle. Node attendu ≥ 22.13 ; gestionnaire fixé à pnpm 11.25.0. Le lockfile fourni fait foi pour les versions.

| Fichier | Rôle |
|---|---|
| `app/adventure.tsx` | Accueil ludique et quiz d’avatar |
| `app/debrief.tsx` | Conversation, revue et animation d’impact |
| `app/debrief-model.ts` | Extraction, dates, plan de mises à jour, calcul XP |
| `app/page.tsx` | État central, modules métier, données de démonstration, anciens composants |
| `app/api/data/route.ts` | Lecture et écriture unitaire des fiches |
| `app/api/debrief/route.ts` | Écriture groupée du débrief |
| `db/schema.ts`, `db/index.ts`, `drizzle/` | Schéma, connexion et migration initiale |
| `app/globals.css` | Styles CRM, Play, responsive et animations |
| `app/chatgpt-auth.ts` | Intégration d’authentification de l’environnement actuel |
| `public/manifest.webmanifest`, `public/sw.js` | Éléments PWA |
| `vite.config.ts`, `scripts/`, `build/` | Adaptation du runtime Sites / Cloudflare |

L’archive contient les sources suivies par Git, leurs licences et leurs configurations utiles. Elle exclut historique Git, dépendances installées, builds, caches, ancienne archive, secrets et état local de base de données.

### Reprise technique

Dans `source/`, les commandes de départ sont `pnpm install --frozen-lockfile`, `pnpm dev` et `pnpm build`. Elles ne constituent pas une garantie de portabilité immédiate : vérifier le runtime, les bindings D1 et l’authentification dans l’environnement cible. Le profil par défaut d’une copie propre est `portable`; le déploiement existant utilise aussi des adaptations propres à Sites.

Le binding D1 s’appelle `DB`. Aucun stockage objet R2 n’est configuré. Ne pas transférer un identifiant de projet existant vers un nouveau déploiement sans décider explicitement de la cible. Remplacer les adaptateurs d’hébergement si nécessaire, tout en conservant le modèle métier. Ne jamais rendre fiable un en-tête d’identité librement envoyé par le navigateur : l’en-tête actuel vient de la plateforme d’authentification.

## 8. Structure actuelle des données

Table unique `records` :

```sql
CREATE TABLE records (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
```

`data` contient un objet JSON. Côté application : `{id, kind, version, data}`. Les associations sont des identifiants dans ces objets ; pas de clés étrangères SQL garantissant leur intégrité. Des champs historiques nomment encore un client par texte : ne pas les perdre pendant la normalisation.

| Type | Champs métier principaux, selon la fiche |
|---|---|
| account | name, sector, status, technologies, positioning, lastContact, nextContact, cadence |
| contact | name, accountId, role, service, influence, managerId |
| consultant | name, role, client, accountId, status, skills, tjm, cost, followUp, birth, avatar |
| candidate | name, role, reference, status, skills, summary, experience, education, availability, cvRequired, avatar, filename éventuel |
| opportunity | title, client, accountId, contactId, stage, brief, requirements[], budgetNote, stageEvidence, amount |
| task | title, category, priority, status, due, owner, accountId, contactId, opportunityId, candidateId, consultantId, client, sourceActivityId |
| topic | title, client, accountId, status, priority, urgency, next, nextStep, due, notes, taskId, steps[], done |
| meeting | title, date, time, type, detail |
| goal | title, horizon, axis, current, target, unit, due |
| activity | title, text, source, createdAt, accounts[], consultants[], candidates[], opportunities[], actions[], relatedIds[], links[], missing[], qualityChecked, completeness, tone, details |
| billing | Type déclaré ; ne pas supposer un module de facturation abouti |

Ces champs décrivent l’existant souple, pas un schéma strict exigeant tous les champs dans chaque fiche. `budgetNote` ne doit pas être converti automatiquement en CA : un TJM n’est pas le montant d’une opportunité.

Une conversation utilise le type `Exchange` : client, contact, role, service, story, need, budget, skills, opportunityId, stage, evidence, action, owner, due, candidate, candidateRole, candidateSkills, availability, consultant, consultantRole, hotTopic. Les valeurs inconnues restent vides ; stage vaut initialement « À qualifier » et owner « Moi ».

Préférences locales : `tempo-avatar` (nom, archétype, emoji, couleur, styleKey, styleScores, quizVersion selon version) et `tempo-universe` (thème garden/ocean/pirate et coach). Elles ne sont pas synchronisées avec la base serveur. Une ancienne clé `tempo-items` peut subsister ; ne pas la traiter automatiquement comme source de vérité.

## 9. Contrats API à préserver

- `GET /api/data` : données de l’utilisateur authentifié. Sans identité ou DB, retourne `items: []` et `demo: true`. L’interface peut alors utiliser les fixtures de démonstration.
- `POST /api/data` : fiche unitaire avec **version de départ** : 0 pour créer, n pour mettre à jour. La réponse fournit la version suivante ; conflit en 409.
- `POST /api/debrief` : `{items: [...]}` avec **version cible** : 1 pour une création, n+1 pour une modification. De 1 à 160 objets, identifiants uniques, types autorisés limités aux entités du débrief. Taille JSON maximale par objet : 50 000 caractères.
- La transaction du débrief refuse les conflits et accepte une répétition strictement identique. Elle s’appuie sur un batch D1 et une assertion SQL provoquant l’échec si une écriture ne correspond pas au résultat attendu.
- Les deux conventions de version sont différentes : ne pas réutiliser aveuglément un payload de l’une pour l’autre.
- Aucun endpoint complet d’export, d’import ou de suppression n’est fourni dans cet état.

Le débrief réel doit enregistrer avant d’afficher une réussite. En démo, les changements sont une simulation en mémoire. En cas d’échec, conserver les réponses et ne pas attribuer de progression fictive.

## 10. Règles de progression et de transparence

Le calcul actuel additionne : 120 XP par activité, 25 par action inscrite dans les activités, 45 par tâche « Terminé », 15 par rendez-vous, 45 par opportunité non « Perdu », 30 par candidat et 20 par lien textuel unique d’activité. Niveau = partie entière de XP/300 + 1.

Il s’agit d’un recalcul à partir des fiches courantes, pas d’un journal immuable de récompenses. Des changements de statut peuvent diminuer l’XP. Harmoniser à terme les descriptions de trophées et de missions avec ce calcul. Ne pas utiliser l’XP comme mesure de performance commerciale prédictive.

La jauge de relation du débrief mesure six éléments documentés : compte, contact, fonction, service, récit et action datée. Elle ne mesure ni la confiance du client ni la probabilité de signer. Les chiffres doivent rester explicables, et les données fictives clairement identifiées.

## 11. Dette et limites à traiter

- `app/page.tsx` est très volumineux et concentre plusieurs responsabilités ; des anciens composants de capture/personnalisation restent dans le fichier sans être le parcours actif.
- Extraction limitée aux formulations explicites et aux correspondances de noms : ambiguïtés d’homonymes à résoudre, compréhension multi-actions à améliorer.
- Une seule prochaine action principale par `Exchange` ; pas un moteur général de plans d’action complexes.
- Validation serveur des champs métier à renforcer, types `data:any` à structurer progressivement.
- Certains éléments visuels secondaires sont encore des exemples ou peu raccordés : recherche d’en-tête, compteur de notifications, historique financier et objectifs fixes, certains contrôles de formulaires/sujets. Auditer avant de les annoncer fonctionnels.
- Les informations manquantes d’une ancienne activité ne se recalculent pas nécessairement après modification d’une fiche liée.
- Anonymisation, import des pièces et partage des dossiers doivent faire l’objet d’une vraie chaîne de traitement et d’une vérification des données identifiantes.
- Pas de service d’IA serveur, de transcription audio importé, de calendrier/mail connecté, de notifications planifiées, de multiplayer ni de rôles d’entreprise.

L’avancement connu inclut une compilation TypeScript et un build réussis pour la v11. Il ne constitue pas une recette mobile ou de bout en bout de cette version. Des vérifications antérieures du débrief et de sa logique transactionnelle ne remplacent pas un test de la migration dans le nouvel environnement.

## 12. Recommandations de prochaine itération

Ordre proposé pour Claude, à distinguer des fonctionnalités déjà faites :

1. Reproduire l’existant dans l’environnement choisi et sécuriser l’export/import des données avant toute transformation importante.
2. Donner plus de présence au copilote et au monde : échanges courts, question réellement contextuelle, interactions tactiles et récapitulatif final très visible. Conserver l’accès secondaire aux modules.
3. Brancher une analyse serveur du récit avec sortie structurée validée, provenance des faits, gestion des ambiguïtés, rapprochement avec les fiches et confirmation des changements. Ne pas mettre de clé API dans le navigateur.
4. Construire import/transcription/lecture des CV et stockage des fichiers, puis matching explicable et dossiers anonymisés contrôlables.
5. Fiabiliser les indicateurs réels, les rappels et les intégrations ; ensuite étendre au partage d’entreprise.

Ne pas commencer par réécrire tous les écrans ou ajouter davantage de formulaires. Le critère principal est le temps économisé et la qualité de données obtenue depuis une conversation agréable.

## 13. Scénarios d’acceptation

- Récit fictif : « Client : Lumena ; interlocuteur : Alex Exemple ; fonction : Responsable data ; service : Plateforme ; besoin : Data engineer ; compétences : Python, SQL ; prochaine action : Obtenir le budget ; échéance : 15/10/2026. » L’outil reprend ces faits, demande les informations utiles manquantes et n’invente pas le prix.
- Un compte existant est enrichi sans doublon ; les contacts homonymes ne sont pas fusionnés silencieusement.
- Un candidat sans CV est créé avec le manque explicitement indiqué ; aucun document n’est déclaré analysé sans l’avoir traité.
- Les liens compte/contact/opportunité/tâche/activité sont vérifiables après sauvegarde.
- Une date impossible, telle que 31/02/2027, est refusée. Les dates relatives suivent Europe/Paris.
- Une erreur réseau ou un conflit de version n’affiche pas une réussite ni de XP fictif ; les réponses restent disponibles.
- L’animation après enregistrement reflète les différences réelles et respecte la préférence de réduction des animations.
- Avatar : égalités du quiz compréhensibles, couleur modifiable, préférences conservées sur le même navigateur.
- Sur téléphone : pas de débordement, clavier et dictée utilisables, boutons tactiles, synthèse lisible.

## 14. Ce qui est transféré, et ce qui ne l’est pas

**Ce dossier transfère le contexte, le code et la structure du projet. Il ne contient pas un export de la base de production.** Les exemples inclus sont fictifs. Les fixtures présentes dans le code servent à la démonstration ; ne pas les importer en production.

Pour une migration des données réelles : effectuer un export authentifié ou une sauvegarde D1 autorisée ; conserver id, kind, version, user_id, updated_at et le JSON ; contrôler les volumes par type et tous les liens ; définir la correspondance des utilisateurs dans le nouvel hébergement ; exporter séparément les préférences du navigateur si souhaité. Lire `04_MIGRATION_DONNEES.md` dans l’archive.

Aucun compte Claude, message externe, secret, mot de passe ou clé API n’est inclus. Aucun changement de l’application publiée n’est réalisé pour cette passation.
