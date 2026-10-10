# Architecture front-end

Cette convention s'applique progressivement à chaque feature. Une migration ne doit jamais créer de dossier vide ni de couche qui ne fait que renommer un type sans isoler une responsabilité.

## Structure d'une feature

Seuls les dossiers utiles à la feature sont créés :

- `api/` : adaptateurs vers le client Orval. Les imports de `@/api/generated` sont réservés à ce dossier, aux hooks métier et, temporairement, aux anciens fichiers `*-actions.ts` en cours de migration.
- `hooks/` : orchestration React Query, état de chargement, erreurs attendues, invalidations et composition de plusieurs adaptateurs.
- `components/` : rendu et interactions visuelles. Un composant reçoit des données métier et des callbacks ; il ne lit ni enveloppe HTTP ni fonction contrôleur.
- `model/` : types métier, schémas de validation et transitions d'état propres à la feature lorsqu'ils apportent une abstraction réelle.
- `utils/` : fonctions pures sans React, réseau ni état global.

Une page compose les hooks et composants. Elle ne connaît ni URL, ni Axios, ni enveloppe API, ni contrôleur Orval. Les fichiers simples peuvent rester à la racine de la feature tant qu'une extraction ne clarifie pas une responsabilité.

## Clés React Query

Les clés partagées sont déclarées dans `src/api/client/query-keys.ts`, jamais sous forme de tableaux littéraux dans les pages.

- La première partie identifie la ressource au pluriel : `['queues']`.
- Les clés vont du général au spécifique : `['queues', 'site', siteId, filters]`.
- Tout élément modifiant le résultat appartient à la clé : scope (`siteId`, `queueId`), filtres normalisés, page, taille de page et langue.
- Une clé de détail est stable : `['persons', 'detail', personId]`.
- Une invalidation cible la fabrique la plus étroite garantissant la cohérence. Un changement de site annule et retire les requêtes hors du nouveau scope.

## Choisir le bon mécanisme

- Fonction d'adaptation `api/` : un appel sans cycle de vie React, conversion du DTO vers le modèle métier ou composition réseau réutilisable.
- Hook : une donnée ou commande consommée par React avec cache, chargement, rafraîchissement, invalidation ou dépendance au scope.
- Store Zustand : état client partagé qui doit survivre au démontage d'un composant, par exemple session, préférences, site actif ou session opérateur. Les données serveur restent dans React Query.
- Fonction `utils/` : calcul déterministe testable sans React.

## Feature pilote

`src/features/health` applique cette convention : `api/health-api.ts` isole Orval, `hooks/useHealth.ts` possède React Query et `HealthPage.tsx` ne dépend que du hook et du design system.
