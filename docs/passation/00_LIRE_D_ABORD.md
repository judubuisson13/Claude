# Reprendre Tempo dans Claude

1. Lire `01_PASSATION_COMPLETE.md` : le message initial à Claude figure au début.
2. Examiner `source/app/adventure.tsx`, `source/app/debrief.tsx`, `source/app/debrief-model.ts` et les API avant tout changement.
3. Utiliser `02_MODELE_DONNEES.json` pour l’enveloppe des fiches et `03_EXEMPLE_FICTIF.json` pour observer les liens effectivement produits par le code.
4. Lire `04_MIGRATION_DONNEES.md` avant de déplacer de vraies données.
5. Le répertoire `source/` contient les fichiers source de référence. `05_SOURCE_CENTRALE.txt` en regroupe les fichiers principaux pour faciliter leur lecture dans un chat ; ce n’est pas une autre version.

Le projet n’est pas à reconstruire de zéro. Il faut préserver le métier et poursuivre l’expérience de jeu conversationnel mobile. Le code exporté n’est pas un export de la base de production. Aucune connexion à Claude ni transfert automatique de comptes n’a été effectué.

Si l’interface Claude ne lit pas le ZIP, le décompresser et joindre d’abord `01_PASSATION_COMPLETE.md`, `05_SOURCE_CENTRALE.txt` et les JSON. Dans un environnement de développement Claude, ouvrir directement `source/`.
