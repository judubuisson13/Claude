# Migration : procédure à terminer avec un export réel

## Périmètre de cette livraison

Fourni : contexte produit, code source, schéma SQL, documentation et exemple fictif créé avec la fonction actuelle `buildPlan`. Non fourni : base D1 de production, pièces originales de CV/audio, sessions, secrets et préférences de l’appareil. L’archive ne constitue donc pas une sauvegarde complète des données utilisateur.

## Export à réaliser avant changement d’hébergement

1. Geler les écritures le temps du transfert final, ou prévoir une reprise des modifications intervenues depuis la sauvegarde.
2. Avec un accès autorisé à D1, sauvegarder la table `records`, y compris `user_id`, `id`, `kind`, `data`, `version`, `updated_at`. Conserver une copie intacte.
3. À défaut, un utilisateur authentifié peut récupérer ses fiches via `GET /api/data` dans l’application. Exiger `demo:false`. Cet export API n’est pas une sauvegarde serveur complète : vérifier quels champs de métadonnées il contient et documenter ceux absents. Ne pas utiliser les fixtures comme données réelles.
4. Exporter séparément, sur l’appareil de l’utilisateur, les préférences `tempo-avatar` et `tempo-universe`, si leur conservation est souhaitée. Ne pas exporter l’ensemble du stockage navigateur ni des jetons de session.
5. Inventorier les fichiers originaux réellement disponibles. Le seul champ `filename` ne permet pas de reconstruire le contenu d’un CV.

## Import à développer dans l’environnement cible

- Conserver les identifiants et les liens ; décider explicitement de la correspondance entre identité Sites et nouveau compte utilisateur.
- Conserver le JSON sans supprimer les champs historiques inconnus. Sauvegarder versions et horodatages, ou documenter leur conversion.
- Valider les types, les dates, les versions et les références compte/contact/opportunité/tâche/activité. Ne pas interpréter `activity.links` comme une liste d’identifiants : il s’agit de libellés ; les identifiants sont notamment dans `relatedIds` et les champs `...Id`.
- Faire un import d’essai isolé et idempotent. Ne pas appeler indifféremment les deux API actuelles : `/api/data` attend une version de départ, `/api/debrief` une version cible et seulement certains types.
- Aucun script d’import de production n’est livré ici, puisque l’export réel, les droits et l’environnement cible ne sont pas encore établis.

## Contrôles avant bascule

- Comparer le nombre de fiches par utilisateur et type, puis les identifiants et les contenus.
- Vérifier que les références attendues pointent vers la bonne fiche ; signaler les références manquantes plutôt que les supprimer.
- Vérifier quelques comptes avec contacts, tâches, opportunités et historique de débrief ; vérifier les profils et compétences.
- Comparer les indicateurs et XP calculés avant/après avec le même algorithme.
- Vérifier l’isolation des utilisateurs et l’absence de fixtures mélangées aux vraies données.
- Garder l’ancienne application et sa sauvegarde jusqu’à validation de la reprise ; prévoir une marche arrière.

Le lien du site permet d’ouvrir l’expérience existante s’il est accessible. Il ne donne pas à lui seul à Claude un accès à la base ni le droit de migrer les comptes.
