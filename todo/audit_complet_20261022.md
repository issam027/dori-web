# Audit complet de DORI Web — 22 octobre 2026

## 1. Objet, périmètre et méthode

Ce document est un audit technique, architectural et fonctionnel du dépôt `dori-web`. Il sert également de backlog de remise à niveau. Chaque action est formulée sous forme de checkpoint Markdown (`- [ ]`) afin de pouvoir suivre son avancement directement dans ce fichier.

Périmètre analysé :

- code applicatif de `src/` ;
- proxy serverless de `api/` ;
- configuration Vite, TypeScript, ESLint, Vitest, Playwright, Orval et Vercel ;
- tests unitaires, composants et E2E ;
- spécifications de `specifications/` ;
- documentation et ancien handover ;
- artefacts de build, couverture et rapports présents dans le dépôt.

Méthode : lecture statique, cartographie des routes et domaines, recherche des dépendances directes au client généré, inventaire des pollers/timers, mesure des plus gros fichiers, revue des garde-fous et tentative d'exécution des contrôles du projet.

Limites : cet audit ne valide ni le backend, ni les données réelles, ni l'infrastructure Vercel effective, ni les matériels kiosque/imprimante/écran. Les parcours E2E avec un backend réel et la recette humaine n'ont pas été exécutés pendant cet audit. Les commandes globales `lint` et la série complète de contrôles ont dépassé le délai d'exécution local ; elles doivent donc être rejouées dans un environnement propre. L'audit des tokens a, lui, fourni un échec reproductible détaillé plus bas.

## 2. Synthèse exécutive

### Verdict

L'application possède un socle sérieux et déjà largement fonctionnel : React 19, TypeScript strict, découpage par domaines, React Query, Zustand, client OpenAPI généré, internationalisation FR/EN/AR/ar-TN, RBAC côté interface, gestion de session avec refresh single-flight, design system, tests unitaires et E2E, audits automatisés et CI.

Elle n'est cependant pas encore au niveau « production durable » sans réserves. Les principaux risques sont :

1. les frontières d'architecture ne sont pas réellement appliquées ;
2. les routes, menus et règles de contexte ont plusieurs sources de vérité ;
3. plusieurs écrans critiques sont trop volumineux et mélangent réseau, état, règles métier et rendu ;
4. les stratégies temps réel/polling peuvent multiplier les appels API ;
5. la couverture n'est pas assortie de seuils et la vérification complète n'est pas actuellement démontrée ;
6. l'observabilité de production est presque absente ;
7. des pans fonctionnels restent incomplets ou nécessitent une décision produit/backend ;
8. la configuration légale, sécurité HTTP, RGPD et matériels doit être validée hors frontend.

### Indicateurs constatés

| Indicateur                                                     |                      Valeur observée | Lecture                                                |
| -------------------------------------------------------------- | -----------------------------------: | ------------------------------------------------------ |
| Fichiers de tests                                              |                                   77 | 66 tests unitaires/composants et 11 spécifications E2E |
| Fichiers générés API                                           |                                  463 | contrat backend fortement structurant                  |
| Adaptateurs API de feature                                     |                                   11 | migration architecturale seulement partielle           |
| Fichiers de production important directement `@/api/generated` |                                   69 | couplage fort entre UI, DTO et client Orval            |
| Plus gros composant                                            | `OnboardingWizard.tsx`, 1 110 lignes | risque élevé de régression et test difficile           |
| Plus grosse feuille applicative                                |      `application.css`, 4 316 lignes | propriété et maintenance des styles floues             |
| Dossiers source vides                                          |                                    2 | `shared/currency`, `shared/pagination`                 |
| Seuils de couverture                                           |                                aucun | une baisse de couverture ne bloque pas la CI           |
| Outil d'observabilité externe                                  |                         aucun trouvé | erreurs réelles et performance non mesurées            |

### Priorités proposées

- **P0 — Bloquant livraison** : rendre la chaîne de validation verte, corriger l'audit tokens, figer les contrats critiques et valider sécurité/configuration de production.
- **P1 — Risque fort** : imposer les frontières, unifier le routage, réduire les N+1/pollers et découper les principaux orchestrateurs.
- **P2 — Qualité produit** : compléter les fonctions métier confirmées, accessibilité, couverture et observabilité.
- **P3 — Évolutions** : sujets nécessitant une décision produit, un contrat API ou une architecture dédiée.

## 3. Architecture actuelle

### 3.1 Vue logique

```text
Navigateur
  ├─ React Router : routes publiques, protégées et expériences appareil
  ├─ AppProviders : session, requêtes, i18n, thème, notifications
  ├─ Features : pages, composants, hooks et quelques adaptateurs API
  ├─ React Query : cache serveur, mutations et invalidations
  ├─ Zustand : session, scope, préférences, notifications, état opérateur
  └─ Axios / client Orval généré
          ├─ développement : VITE_API_BASE_URL
          └─ production : même origine → /api/proxy → backend
```

### 3.2 Points solides

- TypeScript est configuré avec les règles ESLint strictes et `no-explicit-any`.
- Le client API est généré depuis OpenAPI avec Orval et sa dérive peut être contrôlée par `api:check`.
- Les accès HTTP sont centralisés dans un client Axios : credentials, bearer token, correlation ID, normalisation des erreurs et refresh du token.
- Le refresh concurrent est sérialisé par `refreshPromise`, ce qui est une bonne base contre les tempêtes de `401`.
- Les données serveur sont majoritairement confiées à React Query, avec une stratégie globale raisonnable de retry et de `staleTime`.
- Les états clients transverses sont isolés dans des stores ciblés.
- Les pages sont chargées paresseusement depuis `App.tsx`.
- Le design system contient des primitives partagées et testées.
- L'i18n est structurée par langue et domaine, avec gestion RTL et validation de catalogues.
- La CI contrôle génération API, audits, lint, types, tests, build, budget bundle et E2E.

### 3.3 Dette de frontières

La convention de `docs/frontend-architecture.md` demande que les pages et composants ignorent Axios, les enveloppes HTTP et les contrôleurs Orval. En pratique, 69 fichiers de production importent directement le généré. Le problème n'est pas l'usage des types DTO en soi, mais l'absence de frontière stable : une évolution OpenAPI peut diffuser jusque dans les formulaires et composants.

Conséquences :

- changements backend coûteux et difficiles à isoler ;
- tests obligés de construire des DTO complets ;
- logique de mapping et d'erreur dispersée ;
- risque de duplication des appels et invalidations ;
- composants trop conscients du transport.

#### Checkpoint A — frontière API

- [ ] Inventorier les 69 imports de production et les classer : type seul, contrôleur, constante ou enum.
- [ ] Autoriser explicitement les types générés uniquement dans `api/`, `hooks/` et `model/api-types.ts` si une exception est réellement utile.
- [ ] Créer les adaptateurs manquants pour appointments, notifications, reports, users, queue-operations et public-experiences.
- [ ] Faire retourner aux pages des modèles ou view-models métier, pas des réponses Axios/Orval.
- [ ] Centraliser les mutations et leurs invalidations dans des hooks métier.
- [ ] Ajouter une règle ESLint `no-restricted-imports` interdisant le généré dans les pages et composants.
- [ ] Supprimer la façade de changement de mot de passe dupliquée entre auth et profile.
- [ ] Critère de sortie : aucun composant/page n'importe un contrôleur généré ; la règle ESLint bloque toute régression.

## 4. Routage, navigation, permissions et scope

Les routes sont décrites dans `route-access.ts`, rendues dans `App.tsx`, répétées dans `SidebarAccordion.tsx`, `CommandPalette.tsx`, `Topbar.tsx` et `site-context-rules.ts`. Cette duplication peut produire une route accessible par URL mais absente du menu, une permission différente entre menu et garde, ou une page nécessitant un site actif sans redirection cohérente.

Le frontend protège correctement l'expérience utilisateur avec `ProtectedRoute`, mais le RBAC frontend ne constitue jamais une sécurité : chaque endpoint backend doit contrôler permissions et périmètre.

#### Checkpoint B — manifeste de routes

- [ ] Créer un manifeste typé unique contenant `path`, composant lazy, cadre, libellé, icône, permissions, types d'utilisateur, besoin de site et visibilité menu/palette.
- [ ] Générer les routes React, la sidebar, la palette et les titres depuis ce manifeste.
- [ ] Définir clairement la sémantique des permissions multiples : actuellement `hasAnyPermission` implique un OR.
- [ ] Ajouter un test d'unicité des chemins et identifiants.
- [ ] Ajouter un test garantissant qu'une route navigable possède une vue et une règle d'accès.
- [ ] Ajouter une table de tests profils × routes × scopes, incluant accès direct par URL.
- [ ] Vérifier côté API que tous les endpoints appliquent RBAC et scope ; documenter cette validation dans le runbook de sécurité.
- [ ] Critère de sortie : ajouter une route ne nécessite de modifier qu'un manifeste et, éventuellement, son composant.

## 5. Gestion d'état, données et temps réel

### Constat

React Query et Zustand sont globalement employés à bon escient. Le risque principal se situe dans les requêtes en éventail et le rafraîchissement :

- portfolio lance des requêtes par site ;
- files et opérations lancent des requêtes par file/session ;
- affichage public et kiosque lancent plusieurs `useQueries` ;
- certaines requêtes publiques sont rafraîchies toutes les 5 secondes ;
- opérations et files utilisent 15 secondes ;
- santé utilise 30 secondes ;
- des timers locaux supplémentaires existent dans login, control room, display, audio et watchdog.

Le `PollingRealtimeGateway` évite deux rafraîchissements simultanés pour une instance, mais ne mutualise pas les instances, n'applique pas de backoff/jitter et ne suspend pas explicitement son intervalle quand l'onglet est caché.

#### Checkpoint C — stratégie de synchronisation

- [ ] Produire un tableau ressource → propriétaire du cache → fréquence → déclencheur → arrêt → comportement hors ligne/onglet caché.
- [ ] Instrumenter le nombre de requêtes par parcours et fixer un budget réseau par écran.
- [ ] Dédupliquer les identifiants avant chaque `useQueries`.
- [ ] Demander des endpoints batch/agrégés pour portfolio, affichage, files et règles de forfait si le budget est dépassé.
- [ ] Centraliser les intervalles par ressource afin d'éviter plusieurs pollers concurrents.
- [ ] Suspendre le polling non critique quand `document.visibilityState !== 'visible'`.
- [ ] Ajouter backoff et jitter après erreurs successives.
- [ ] Définir la reprise réseau/offline et afficher un état de données périmées.
- [ ] Tester montage/démontage, nettoyage des listeners/timers et absence de requêtes après unmount.
- [ ] Décider si le besoin métier justifie SSE/WebSocket ; ne pas l'introduire sans contrat serveur et métriques.
- [ ] Critère de sortie : budgets mesurés, aucun doublon de polling et comportement documenté pour chaque écran live.

## 6. Authentification et sécurité

### Points satisfaisants

- access token conservé en mémoire plutôt qu'en stockage persistant ;
- refresh avec credentials et mécanisme single-flight ;
- opérations publiques exclues de l'ajout du bearer token ;
- correlation ID ajouté aux requêtes ;
- nettoyage ciblé des clés de stockage lors de la déconnexion ;
- redirection obligatoire vers le changement de mot de passe ;
- CSP injectée dans le HTML, protection de framing, referrer policy et proxy same-origin en production.

### Risques et validations nécessaires

- Une CSP via balise `<meta>` ne remplace pas tous les vrais en-têtes HTTP et `frame-ancestors` doit être envoyé en en-tête pour être fiable.
- `style-src 'unsafe-inline'` réduit la protection contre les injections.
- Le proxy doit être audité contre SSRF, fuite de cookies, transfert excessif d'en-têtes et méthodes inattendues.
- Les attributs Secure, HttpOnly, SameSite, Path, Domain, rotation et révocation du refresh cookie dépendent du backend/infrastructure.
- Les données personnelles, leur rétention, leur export et leur anonymisation ne sont pas démontrées par le frontend.
- Aucune solution de collecte d'erreurs ou de performance de production n'est visible.

#### Checkpoint D — sécurité de livraison

- [ ] Ajouter des tests concurrents de plusieurs `401` : un seul refresh, rejeu correct et expiration atomique en cas d'échec.
- [ ] Tester l'absence de bearer token sur toutes les routes publiques, y compris les variantes d'URL.
- [ ] Auditer `api/proxy.ts` : allowlist d'origine, chemin, méthode, taille, timeout, en-têtes et gestion des cookies.
- [ ] Configurer les vrais en-têtes HTTP : CSP, HSTS, X-Content-Type-Options, Permissions-Policy et Referrer-Policy.
- [ ] Retirer progressivement `'unsafe-inline'` via classes, nonce ou hash.
- [ ] Vérifier les cookies refresh dans un navigateur sur le domaine final.
- [ ] Tester accès direct, changement de site, permissions insuffisantes et utilisateur technique.
- [ ] Définir rétention, anonymisation, export et suppression RGPD des personnes, notes et notifications.
- [ ] Vérifier que logs et télémétrie excluent token, téléphone, email, notes et contenu de notification.
- [ ] Exécuter un scan de dépendances en CI et traiter toute vulnérabilité haute/critique.
- [ ] Critère de sortie : preuves enregistrées pour les en-têtes, cookies, tests RBAC et scan de dépendances.

## 7. Maintenabilité du code

### Fichiers à risque

| Fichier                       | Taille observée | Action recommandée                                                |
| ----------------------------- | --------------: | ----------------------------------------------------------------- |
| `OnboardingWizard.tsx`        |    1 110 lignes | extraire machine de workflow, contrôleur de transaction et étapes |
| `KioskWizard.tsx`             |      782 lignes | isoler état, confidentialité, impression et étapes                |
| `UsersAdminPage.tsx`          |      680 lignes | extraire requêtes, filtres, tableau/cartes et dialogues           |
| `ReportVisualizations.tsx`    |      657 lignes | séparer modèle de graphiques et visualisations                    |
| `AppointmentActionDialog.tsx` |      578 lignes | isoler règles par action et formulaires                           |
| `ControlRoomPage.tsx`         |      545 lignes | séparer orchestration live et sections                            |
| `TranslationsAdminPage.tsx`   |      529 lignes | isoler formulaire, comparaison et mutations                       |
| `AppointmentsPage.tsx`        |      503 lignes | extraire agenda, filtres et commandes                             |
| `application.css`             |    4 316 lignes | répartir la propriété des styles par feature                      |
| `admin.css`                   |    1 118 lignes | découper par écran/composant                                      |

Le découpage ne doit pas être mécanique. Une extraction est utile si elle isole une responsabilité testable, un état ou une frontière réseau.

#### Checkpoint E — modularisation

- [ ] Ajouter des tests de caractérisation avant de modifier onboarding et kiosque.
- [ ] Extraire d'abord les transformations pures et machines d'état.
- [ ] Extraire ensuite les hooks contrôleurs et effets navigateur.
- [ ] Garder les composants de rendu pilotés par props et callbacks.
- [ ] Découper le CSS par propriétaire fonctionnel, sans dupliquer les sélecteurs.
- [ ] Supprimer les dossiers vides `src/shared/currency` et `src/shared/pagination`, ou les remplir uniquement lorsqu'une abstraction réelle existe.
- [ ] Installer/configurer un détecteur de code mort et dépendances inutilisées, avec exclusions du généré et des fixtures.
- [ ] Ajouter une détection des cycles et violations de couches.
- [ ] Critère de sortie : pages principales lisibles comme composition, logique métier testable sans DOM et frontières contrôlées automatiquement.

## 8. Qualité, tests et chaîne de livraison

### État observé

- 77 fichiers de tests existent : 66 unitaires/composants et 11 E2E.
- Playwright couvre session, scope, rendez-vous, guichet, walk-in, kiosque/QR, expériences publiques, supervision et ergonomie.
- Axe est utilisé dans la suite de layout visuel.
- Vitest produit une couverture V8 texte/HTML, mais aucun seuil n'est défini.
- La CI est complète sur le papier.
- L'audit `audit:tokens` échoue actuellement sur 12 couleurs hexadécimales dans `src/design-system/styles/print/documents.css` (`#fff`, `#111`, `#999`, `#bbb`, `#777`).
- `lint` n'a pas terminé dans la fenêtre locale de 120 secondes ; il faut mesurer et corriger sa durée, sans conclure ici à une erreur de code.
- L'exécution complète de `verify` n'est donc pas démontrée par cet audit.

#### Checkpoint F — pipeline vert et fiable

- [ ] Corriger l'audit tokens : utiliser des variables d'impression dédiées ou documenter une exception contrôlée dans l'outil.
- [ ] Relancer `npm ci && npm run verify` dans un clone propre avec Node 22.18+ et npm 11+.
- [ ] Enregistrer durée et résultat de chaque étape ; définir un timeout CI explicite.
- [ ] Diagnostiquer le lint lent (périmètre, cache, project service TypeScript) et viser moins de 2 minutes.
- [ ] Ajouter des seuils initiaux de couverture, puis les relever progressivement.
- [ ] Prioriser la couverture branches sur auth/refresh, permissions, scope, mutations, invalidations et machines d'état.
- [ ] Ajouter des tests contractuels sur les adaptateurs à partir d'exemples OpenAPI.
- [ ] Ajouter des tests de non-régression pour les courses : double clic, mutations concurrentes, changement de scope pendant chargement.
- [ ] Vérifier que `api:check` ne modifie aucun fichier non généré et que le généré correspond au contrat publié.
- [ ] Publier couverture, traces et captures Playwright comme artefacts CI.
- [ ] Critère de sortie : `npm run verify` vert deux fois de suite sur un environnement propre et temps de pipeline connu.

## 9. Performance frontend

### Risques principaux

- coût réseau des requêtes en éventail et pollings rapprochés ;
- gros volumes CSS globaux et risque de styles inutilisés ;
- gros composants rendant les optimisations ciblées difficiles ;
- écrans de listes dont le volume maximum réel n'est pas documenté ;
- graphiques, QR code, impression et catalogues i18n à tester sur appareils faibles ;
- absence de métriques Web Vitals et de suivi des erreurs réelles.

#### Checkpoint G — performance mesurée

- [ ] Définir budgets : JS/CSS initial, chunks par route, nombre de requêtes et temps interactif.
- [ ] Mesurer Lighthouse/Web Vitals sur login, desk, control-room, kiosk, display et tracking.
- [ ] Mesurer avec réseau lent et appareil CPU limité représentatif du kiosque.
- [ ] Vérifier pagination/virtualisation sur personnes, rendez-vous, utilisateurs, traductions et notifications.
- [ ] Auditer les rerenders des écrans live avec React Profiler.
- [ ] Charger à la demande les fonctions lourdes non nécessaires au premier rendu.
- [ ] Ajouter une télémétrie de performance respectueuse des données personnelles.
- [ ] Critère de sortie : budgets automatisés et aucun parcours critique hors budget sans dérogation documentée.

## 10. Accessibilité, responsive et internationalisation

### Points positifs

- primitives de formulaire et modales partagées ;
- tests composants sur plusieurs éléments du design system ;
- i18n riche couvrant quatre variantes et prise en charge RTL ;
- scénarios E2E visuels/ergonomiques et usage d'Axe ;
- interfaces dédiées mobile pour plusieurs listes.

### Reste à prouver

L'accessibilité automatisée ne couvre qu'une partie des problèmes. Les parcours clavier, lecteur d'écran, zoom, contraste calculé, live regions, graphiques et matériel tactile exigent une recette humaine.

#### Checkpoint H — recette inclusive

- [ ] Construire une matrice routes × rôles × desktop/mobile × thème × langue/RTL.
- [ ] Tester tout au clavier : ordre du focus, piège de focus, retour de focus, raccourcis et échappement.
- [ ] Tester NVDA ou VoiceOver sur login, création personne, inscription, appel et kiosque.
- [ ] Vérifier zoom 200 %, reflow 320 px et cibles tactiles.
- [ ] Vérifier noms accessibles, erreurs de champs, annonces live et tableaux.
- [ ] Fournir une alternative textuelle utile aux graphiques.
- [ ] Tester les quatre thèmes et le contraste réel de tous les états.
- [ ] Vérifier troncature et ordre visuel en anglais, arabe et arabe tunisien.
- [ ] Automatiser Axe sur chaque route critique, pas uniquement un scénario visuel.
- [ ] Critère de sortie : aucune violation critique/sérieuse et recette humaine signée.

## 11. Audit fonctionnel par domaine

### 11.1 Authentification et profil — largement présent

Présent : connexion, hydratation de session, refresh, déconnexion, mémorisation ciblée du nom, mot de passe obligatoire, profil, redirections et protections de routes.

- [ ] Tester compte bloqué/désactivé, mauvais mot de passe, refresh expiré et déconnexion multi-onglets.
- [ ] Clarifier les règles de mot de passe et les afficher avant soumission.
- [ ] Vérifier le comportement après retour sur l'URL initialement demandée.
- [ ] Ajouter une gestion explicite de session expirée compréhensible et accessible.

### 11.2 Portefeuille et sélection de site — présent avec risque N+1

Présent : liste des sites, résumés et contexte actif.

- [ ] Remplacer les résumés par site par un endpoint agrégé si la volumétrie le nécessite.
- [ ] Définir le comportement lorsqu'un site mémorisé devient inaccessible.
- [ ] Tester changement de site pendant qu'une mutation ou requête est en cours.
- [ ] Afficher clairement l'âge des données si les résumés sont périmés.

### 11.3 Guichet et opérations de file — cœur fonctionnel présent

Présent : occupation/session opérateur, files, inscriptions, appel, détails, actions et impression de passage.

- [ ] Formaliser la machine d'état inscription/session et les transitions autorisées.
- [ ] Désactiver ou rendre idempotentes les commandes pendant une mutation.
- [ ] Tester deux opérateurs agissant simultanément sur la même inscription.
- [ ] Prévoir le message de conflit et le rafraîchissement après `409`.
- [ ] Valider impression sur imprimante thermique réelle et comportement si popup bloquée.

### 11.4 Personnes et notes — CRUD présent, vision 360 incomplète

Présent : liste, création/modification, activation/désactivation et notes.

- [ ] Décider puis implémenter la détection/fusion des doublons.
- [ ] Ajouter un historique consolidé rendez-vous, passages, notes et notifications si le backend le permet.
- [ ] Définir visibilité, audit immuable, catégories et épinglage des notes.
- [ ] Implémenter les règles RGPD : base légale, rétention, anonymisation, export et suppression.
- [ ] Masquer les PII selon rôle et contexte d'affichage.

### 11.5 Rendez-vous — gestion principale présente

Présent : liste/agenda, création ou édition, actions et check-in selon permissions.

- [ ] Documenter fuseau horaire, DST, locale et stockage des dates.
- [ ] Tester collisions, créneaux passés, annulation, no-show, arrivée anticipée/tardive et double check-in.
- [ ] Clarifier disponibilités multi-jours et capacité par file/ressource.
- [ ] Extraire les règles d'action de `AppointmentActionDialog` vers un modèle testable.

### 11.6 Supervision et control room — présent, temps réel à consolider

Présent : indicateurs, états de files, alertes SLA et actions de supervision.

- [ ] Définir fraîcheur attendue et source de chaque KPI.
- [ ] Tester reset/forçage avec confirmation, permission, audit et gestion de conflit.
- [ ] Éviter le cumul entre timer local, polling React Query et passerelle temps réel.
- [ ] Afficher perte de connexion, données périmées et reprise.

### 11.7 Rapports — visualisation présente

Présent : métriques, visualisations et analyses temporelles.

- [ ] Faire valider les formules KPI par le métier et le backend.
- [ ] Documenter inclusions/exclusions, fuseau, bornes de période et arrondis.
- [ ] Tester jeux vides, valeurs extrêmes et données partielles.
- [ ] Ajouter export seulement avec contrat d'audit, permissions et volumétrie validés.
- [ ] Rendre tous les graphiques accessibles par tableau ou résumé équivalent.

### 11.8 Notifications — administration présente, cycle complet à confirmer

Présent : liste, assistant de notification manuelle, règles/actions et suivi d'éléments.

- [ ] Clarifier brouillon, planification, envoi, annulation, échec et rejeu.
- [ ] Ajouter aperçu par canal et locale avant envoi.
- [ ] Vérifier consentement, opt-out, déduplication, fuseau et limites d'envoi.
- [ ] Afficher l'état réel de livraison fourni par le backend, sans le confondre avec l'acceptation API.

### 11.9 Kiosque — parcours présent, validation matérielle indispensable

Présent : choix de parcours, rendez-vous/QR, sans rendez-vous, règles de forfait, ticket, impression et watchdog de confidentialité.

- [ ] Tester scanner QR et saisie alternative sur matériel réel.
- [ ] Tester imprimante absente, papier vide, erreur impression et réimpression contrôlée.
- [ ] Garantir purge des PII après succès, erreur, timeout, navigation et crash.
- [ ] Tester réseau intermittent et éviter toute double inscription.
- [ ] Valider tailles tactiles, contraste, clavier virtuel et mode plein écran verrouillé.
- [ ] Définir un runbook de redémarrage et diagnostic opérateur.

### 11.10 Écran de salle — présent, confidentialité et résilience à valider

Présent : affichage des appels, rotations, audio et mode appareil.

- [ ] Prouver qu'aucune PII non autorisée n'est affichée ou annoncée.
- [ ] Tester 1080p/4K, burn-in, reconnexion, reprise après veille et lecture audio bloquée.
- [ ] Définir le fallback si Web Speech ou l'audio n'est pas disponible.
- [ ] Tester changements rapides d'appels et absence d'annonce obsolète.

### 11.11 Tracking public — présent

Présent : accès public, QR/URL, statut et alertes navigateur.

- [ ] Vérifier opacité, entropie, expiration, révocation et non-énumérabilité du token côté backend.
- [ ] Empêcher cache/indexation et fuite du token via referrer ou logs.
- [ ] Tester URL expirée, inscription annulée/terminée et réseau dégradé.
- [ ] Demander consentement avant son/vibration et proposer une alternative visuelle.

### 11.12 Onboarding et paramètres — riche mais fortement couplé

Présent : workflow site/files/services, brouillon local, paramètres et ressources.

- [ ] Brancher réellement `settings-schemas.ts` aux formulaires ou supprimer les schémas morts.
- [ ] Aligner les schémas sur les DTO et états actuels.
- [ ] Déplacer la validation de traduction vers le domaine translations.
- [ ] Garantir reprise/compatibilité/version du brouillon local après déploiement.
- [ ] Définir compensation et reprise en cas d'échec partiel d'une création multi-étapes.
- [ ] Découper `OnboardingWizard` après tests de caractérisation.

### 11.13 Utilisateurs, rôles et affectations — administration courante présente

Présent : utilisateurs, assistant de compte, affectations et opérateurs de file.

- [ ] Afficher rôles et périmètres effectifs avec leur origine.
- [ ] Implémenter retrait de rôle et édition de permissions avec garde-fous si le contrat le permet.
- [ ] Empêcher la suppression/rétrogradation du dernier manager habilité.
- [ ] Tester anti-escalade : un administrateur ne peut accorder plus que ses propres droits.
- [ ] Décider opérations en masse/copie d'équipe selon besoin métier.

### 11.14 Niveaux de service et tarifs — association présente, catalogue incomplet

- [ ] Créer une vue catalogue : création, modification et consultation.
- [ ] Protéger archivage/suppression lorsqu'un niveau est utilisé.
- [ ] Ajouter duplication et aperçu kiosque.
- [ ] Valider devise, arrondis, taxes éventuelles et affichage localisé.

### 11.15 Traductions — CRUD présent, gouvernance à compléter

- [ ] Comparer FR/EN/AR/ar-TN et détecter les clés manquantes.
- [ ] Valider placeholders et HTML interdit avant publication.
- [ ] Prévisualiser l'impact et invalider correctement les bundles distants.
- [ ] Ajouter historique/rollback et import/export uniquement si le backend garantit versionnement et permissions.

### 11.16 Santé, légal et configuration — présent mais dépendant du déploiement

- [ ] Fournir les vraies valeurs légales par pays/locale et les faire valider juridiquement.
- [ ] Vérifier que le build production échoue bien avec valeurs fictives.
- [ ] Définir ce que la page santé peut révéler selon le rôle.
- [ ] Ajouter runbooks d'incident, rollback et vérification post-déploiement.

## 12. Observabilité et exploitation

Aujourd'hui, l'Error Boundary écrit dans la console en développement. Aucun Sentry, OpenTelemetry, Datadog ou mécanisme équivalent n'a été trouvé. Le correlation ID est une bonne base mais ne sert pas encore à une investigation frontend visible.

#### Checkpoint I — exploitation

- [ ] Choisir une solution d'erreurs frontend et définir filtrage/redaction des PII.
- [ ] Envoyer version, route normalisée, environnement, navigateur et correlation ID, jamais les tokens ni contenus sensibles.
- [ ] Suivre taux d'erreur, échec de refresh, latence API, Web Vitals et indisponibilité des écrans live.
- [ ] Définir SLO/alertes pour login, inscription, appel, check-in, kiosque et tracking.
- [ ] Ajouter numéro de version/commit dans l'interface de diagnostic.
- [ ] Écrire runbooks : API indisponible, session cassée, kiosque, écran, impression et rollback.
- [ ] Critère de sortie : une erreur simulée est retrouvable de bout en bout via correlation ID sans exposer de PII.

## 13. Documentation et expérience développeur

Le README est trop court pour un nouveau contributeur. La documentation d'architecture est utile mais décrit une cible encore non imposée. L'ancien handover contient des constats pertinents mais aussi un long historique de checkpoints automatiques et ne doit pas devenir la source de vérité permanente.

#### Checkpoint J — documentation exploitable

- [ ] Compléter le README : prérequis exacts, installation, `.env.local`, commandes, proxy, API, tests et dépannage.
- [ ] Documenter la génération Orval et la procédure de mise à jour du contrat.
- [ ] Ajouter des diagrammes courts pour session/refresh, scope site et synchronisation live.
- [ ] Documenter conventions de feature, dépendances autorisées et exemple de référence.
- [ ] Documenter déploiement Vercel, variables, headers, rollback et smoke test.
- [ ] Documenter i18n locale/distante et gouvernance des traductions.
- [ ] Archiver ou remplacer le handover historique par ce backlog et des ADR pérennes.
- [ ] Corriger les problèmes d'encodage visibles lors de certaines lectures console et imposer UTF-8 dans l'éditeur/CI.

## 14. Plan d'exécution recommandé

### Lot 0 — Baseline reproductible (1 à 2 jours)

- [ ] Créer un environnement propre et exécuter `npm ci`.
- [ ] Corriger `audit:tokens`.
- [ ] Diagnostiquer le timeout lint.
- [ ] Exécuter `npm run verify` et conserver les artefacts.
- [ ] Capturer couverture, bundle, durées et liste des vulnérabilités.
- [ ] Geler la baseline dans la CI.

**Checkpoint de lot :** toutes les étapes CI sont vertes, chronométrées et reproductibles.

### Lot 1 — Sécurité et production (2 à 5 jours frontend + coordination backend/infra)

- [ ] Tests refresh concurrents et expiration.
- [ ] Audit du proxy et des en-têtes réels.
- [ ] Validation cookies, CORS, domaines et configuration légale.
- [ ] Matrice RBAC/scope sur routes et endpoints critiques.
- [ ] Décision et plan RGPD.

**Checkpoint de lot :** dossier de preuves sécurité signé par frontend, backend et infrastructure.

### Lot 2 — Frontières et routage (1 à 2 semaines)

- [ ] Manifeste de routes unique.
- [ ] Règle ESLint sur le client généré.
- [ ] Migration API par domaine, en commençant par appointments et users.
- [ ] Tests contractuels et de navigation.

**Checkpoint de lot :** aucune duplication de métadonnées de route et aucun contrôleur Orval dans les composants/pages.

### Lot 3 — Synchronisation et performance (1 semaine + éventuels endpoints backend)

- [ ] Inventaire/budgets réseau.
- [ ] Mesures des N+1.
- [ ] Batch endpoints ou stratégie de limitation.
- [ ] Politique visibilité, backoff et offline.
- [ ] Web Vitals et observabilité.

**Checkpoint de lot :** budgets réseau et rendu respectés sur matériel cible.

### Lot 4 — Découpage des écrans critiques (2 à 3 semaines progressives)

- [ ] Onboarding.
- [ ] Kiosque.
- [ ] Utilisateurs et rendez-vous.
- [ ] Supervision, rapports et traductions.
- [ ] CSS par feature.

**Checkpoint de lot :** chaque extraction est protégée par des tests et n'altère pas les parcours E2E.

### Lot 5 — Complétude fonctionnelle (à prioriser par le produit)

- [ ] Personnes/RGPD/doublons/historique.
- [ ] Rôles effectifs et anti-escalade.
- [ ] Catalogue des niveaux de service.
- [ ] Gouvernance des traductions.
- [ ] États complets des notifications.
- [ ] Cas limites rendez-vous et concurrence guichet.

**Checkpoint de lot :** critères d'acceptation écrits, contrat API disponible et recette métier signée pour chaque sujet retenu.

### Lot 6 — Recette finale (3 à 5 jours minimum)

- [ ] Matrice rôles/routes/langues/thèmes/viewports.
- [ ] Accessibilité manuelle et automatique.
- [ ] Matériels kiosque, scanner, écran et imprimante.
- [ ] Réseau lent, offline, reprise et charge raisonnable.
- [ ] Smoke test production et rollback testé.

**Checkpoint de lot :** procès-verbal de recette, écarts acceptés et responsables nommés.

## 15. Définition de fini globale

La livraison peut être considérée prête lorsque tous les éléments suivants sont vrais :

- [ ] `npm run verify` est vert dans un clone propre et sur la branche livrée.
- [ ] Aucun niveau high/critical non accepté dans les dépendances.
- [ ] Les vraies variables légales et d'infrastructure sont validées.
- [ ] Les en-têtes et cookies sont vérifiés sur le domaine final.
- [ ] Les routes et endpoints critiques respectent RBAC et scope.
- [ ] Aucun contrôleur généré n'est importé par les composants/pages.
- [ ] Les budgets réseau, bundle et Web Vitals sont respectés.
- [ ] Les parcours critiques ont tests unitaires, intégration et E2E stables.
- [ ] L'accessibilité critique/sérieuse est corrigée et la recette clavier/lecteur d'écran est faite.
- [ ] Kiosque, scanner, écran, audio et impression sont validés sur matériels cibles.
- [ ] Les politiques RGPD et de rétention sont documentées et implémentées.
- [ ] L'observabilité et les runbooks permettent de diagnostiquer sans exposer de PII.
- [ ] Les écarts fonctionnels restants sont explicitement arbitrés par le produit.

## 16. Sujets à ne pas lancer sans cadrage préalable

Les thèmes suivants ne sont pas de simples tâches frontend. Ils exigent une décision produit, un contrat API, des permissions, une stratégie de données, un modèle de sécurité et des métriques de succès : vue client 360 agrégée, disponibilité multi-jours, file virtuelle, SSE/WebSocket, campagnes omnicanales, satisfaction, prévision d'affluence, BI serveur, audit réglementaire, SSO/SCIM, multi-tenant/facturation, gestion de parc, imports de masse, widget embarqué, portail client et mode offline avec mutations.

Pour chacun :

- [ ] écrire le problème utilisateur et le périmètre ;
- [ ] définir les critères de succès ;
- [ ] valider UX et accessibilité ;
- [ ] publier le contrat OpenAPI et les permissions ;
- [ ] définir migration, observabilité et rollback ;
- [ ] seulement ensuite planifier l'implémentation frontend.

## 17. Commandes de contrôle à utiliser

```bash
npm ci
npm run api:check
npm run audit:phase11
npm run audit:i18n
npm run audit:tokens
npm run audit:security
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:bundle
npm run test:e2e
```

La commande agrégée attendue reste :

```bash
npm run verify
```

Ne cocher les checkpoints de validation qu'avec une sortie CI ou un procès-verbal de recette associé, pas sur la seule base d'une lecture du code.

<!-- CHECKPOINT id="ckpt_mvmzslzx_h3mtta" time="2026-10-24T22:50:39.837Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvn05gz1_jk3iaq" time="2026-10-24T23:00:39.853Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvn19r6t_hzkkbh" time="2026-10-24T23:31:59.333Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvn1mm5n_6k98g6" time="2026-10-24T23:41:59.339Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvn1zh4e_cf31vq" time="2026-10-24T23:51:59.343Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvn2cc3a_7nqxsc" time="2026-10-25T00:01:59.350Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvn79x61_ov6u7j" time="2026-10-25T02:20:04.777Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvncnjhm_5rbcrb" time="2026-10-25T04:50:38.314Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvnd0egm_u855ap" time="2026-10-25T05:00:38.326Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvndd9fx_f0telw" time="2026-10-25T05:10:38.349Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvnhv238_rytx0v" time="2026-10-25T07:16:27.092Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvnklitb_zcuodr" time="2026-10-25T08:33:01.055Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvnkydse_cvasds" time="2026-10-25T08:43:01.070Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
