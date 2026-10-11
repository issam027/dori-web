# Audit technique de consolidation — DORIFY Web

Date : 2026-10-11  
Périmètre : `src`, `e2e`, `tools`, TypeScript, Vite, ESLint et tests.  
Nature : audit statique et structurel uniquement. Aucun code applicatif n’est modifié.

## 1. Objectif et règles

Cet audit recense le code à supprimer, factoriser, déplacer, découper ou optimiser sans modifier le comportement fonctionnel.

- Une tâche n’est cochée qu’après modification, tests et non-régression.
- Séparer déplacement mécanique et changement de comportement.
- Conserver les contrats publics avant de changer les implémentations.
- Ne jamais modifier manuellement `src/api/generated`.
- Supprimer un élément supposé mort seulement après recherche statique, build et tests.
- Préférer de petits lots réversibles à une réorganisation massive.
- Capturer une baseline avant toute optimisation réseau ou cache.

## 2. Photographie actuelle

Contrôles : fichiers, tailles, imports inter-features, exports, API, timers, APIs navigateur, dossiers vides, CSS et configuration du compilateur.

- 199 fichiers sous `src`.
- TypeScript strict avec `noUnusedLocals` et `noUnusedParameters`, mais ces règles ne trouvent pas les exports publics inutilisés.
- 13 dossiers sources vides.
- 83 imports directs de `@/api/generated`, dans 46 fichiers de features.
- 12 feuilles CSS, 1 035 sélecteurs distincts, 248 sélecteurs redéclarés, 320 couleurs hexadécimales, aucun `!important`.
- Gros fichiers : `SettingsWorkspace.tsx` 1 061 lignes, `OnboardingWizard.tsx` 885, `KioskWizard.tsx` 760, `i18n.ts` 917, `ManualNotificationWizard.tsx` 412, `QuickRegistration.tsx` 403.
- CSS volumineux : `features/application.css` 1 986 lignes, `experiences/kiosk.css` 991, `components/controls.css` 741.

Points solides à conserver : TypeScript strict, OpenAPI typé, clés React Query centralisées, fonctions métier pures déjà extraites, lazy loading, tests unitaires et E2E.

Priorités : **P0** risque/incohérence à traiter tôt ; **P1** forte dette ou coût réseau ; **P2** cohérence/optimisation ; **P3** opportunité.

## 3. Code mort et arborescence

### T1 — Modules sans consommateur — P0

Définitions sans import applicatif détecté :

- `core/errors/FeatureErrorBoundary.tsx` ;
- `core/permissions/Can.tsx` ;
- `core/permissions/useDeskShortcuts.ts` ;
- `design-system/patterns/NetworkState.tsx` ;
- `features/queue-operations/Receipt80mm.tsx` ;
- `PhoneInput`, `DateInput`, `TimeInput`, `CurrencyInput` dans `FormField.tsx`.

Pourquoi : ces faux contrats augmentent la surface de maintenance. `Receipt80mm` paraît remplacé par les deux documents d’impression actuels et `FeatureErrorBoundary` par la variante embarquée de `AppErrorBoundary`.

Comment : décider adoption ou suppression, puis recherche de symbole, lint, typecheck, Vitest et E2E concernés.

- [ ] T1.1 Confirmer fonctionnellement chaque élément orphelin.
- [ ] T1.2 Supprimer les modules remplacés et leurs styles.
- [ ] T1.3 Retirer ou adopter les contrôles exportés inutilisés.
- [ ] T1.4 Ajouter Knip ou équivalent en CI.

### T2 — Dossiers vides et arborescence fantôme — P0

Dossiers confirmés : `features/cockpit`, `display`, `kiosk`, `notes`, `notifications`, `reports`, `sites`, `tiers`, `tracking`, `translations`, puis `shared/currency`, `forms`, `pagination`.

Pourquoi : ils suggèrent une architecture différente de la réalité (`public-experiences`, `supervision`, `queue-operations`) et rendent le placement d’un nouveau fichier ambigu.

- [ ] T2.1 Supprimer les treize dossiers vides.
- [ ] T2.2 Ajouter « aucun dossier vide » à l’audit structurel.
- [ ] T2.3 Documenter les bounded contexts dans `docs/architecture.md`.

### T3 — CSS mort et historique — P1

Constat : 248 sélecteurs redéclarés. Une partie est légitime (responsive, thèmes, impression), l’autre vient de surcharges historiques. `application.css` reste un agrégat de 1 986 lignes et des styles `receipt-80mm` subsistent.

Comment : couverture CSS Playwright/Chromium sur routes, quatre thèmes, trois viewports et impression. Ne supprimer qu’après couverture des états dynamiques.

- [ ] T3.1 Produire la couverture CSS par route/thème/viewport.
- [ ] T3.2 Supprimer les règles des composants morts confirmés.
- [ ] T3.3 Classer et consolider les 248 doublons.
- [ ] T3.4 Remplacer les hexadécimaux par des tokens, hors QR/papier noir-blanc.

## 4. Frontières de responsabilités

### T4 — Stabiliser les domaines — P0

Incohérences observées :

- `onboarding` mélange création initiale et configuration permanente ;
- `supervision` mélange rapports, notifications et salle de contrôle ;
- `public-experiences` mélange borne, display, tracking, impression, audio et confidentialité ;
- `queue-operations` mélange cockpit, mes files, accueil rapide, passages et impression ;
- `portfolio` possède l’API sites tandis que leur administration vit dans `onboarding` ;
- `core/auth/session-actions.ts` dépend de `features/queue-operations/operation-store.ts` : le noyau dépend d’une feature.

Cible progressive :

```text
src/
  app/                  composition, routes, providers, shell
  api/generated/        Orval uniquement
  api/infrastructure/   HTTP, transport, refresh
  core/                 auth, permissions, scope, i18n, thème
  design-system/        UI sans métier
  domains/
    sites/ queues/ people/ registrations/ users/ notifications/ reporting/
  features/
    desk/ my-queues/ appointments/ site-setup/ site-settings/
    kiosk/ room-display/ tracking/
  shared/               utilitaires réellement transverses
```

- [ ] T4.1 Formaliser `app → features → domains → api/core`, jamais l’inverse.
- [ ] T4.2 Retirer la dépendance core → store queue-operations via orchestrateur de reset ou domaine.
- [ ] T4.3 Séparer `site-setup` et `site-settings`.
- [ ] T4.4 Séparer reporting, notifications et control-room.
- [ ] T4.5 Décider un seul modèle pour les trois expériences publiques.
- [ ] T4.6 Ajouter une règle ESLint de frontières.

### T5 — Imports directs entre features — P1

Constat : appointments importe persons/queues/portfolio ; cockpit importe persons/portfolio/queues ; supervision importe persons/queues/queue-operations ; portfolio importe reporting via supervision.

Pourquoi : les hooks et composants de présentation deviennent des API publiques involontaires.

Comment : déplacer les contrats réutilisés dans les domaines. `dateInTimeZone` doit aller dans `shared/date`, pas dans appointments.

- [ ] T5.1 Déplacer les fonctions temporelles génériques vers `shared/date`.
- [ ] T5.2 Exposer des façades de domaines pour personnes, files, sites et rapports.
- [ ] T5.3 Interdire l’import d’une page par une autre feature.
- [ ] T5.4 Contrôler les cycles avec dependency-cruiser ou équivalent.

## 5. Gros fichiers et séparation des responsabilités

### T6 — `SettingsWorkspace.tsx` — P0

Emplacement : `features/onboarding/components/SettingsWorkspace.tsx`, 1 061 lignes.

Constat : données, mutations, cinq états de modales, navigation, pagination, panneaux sites/files/utilisateurs/niveaux/notifications/traductions, trois formulaires et un `Select` local sont réunis.

Pourquoi : modification et test d’un onglet impliquent l’ensemble ; `Select` concurrence le design system ; la pagination est locale et uniquement cliente.

Découpage proposé : `SettingsWorkspace` orchestrateur, `useSettingsWorkspace`, `SettingsHeader`, six composants `sections/*`, puis `dialogs/TierDialog`, `NotificationRuleDialog`, `TranslationDialog`.

- [ ] T6.1 Extraire chaque section sans modifier props ni markup.
- [ ] T6.2 Extraire chaque formulaire avec schéma et mutation.
- [ ] T6.3 Remplacer `useAdminPagination` par pagination serveur ou primitive partagée.
- [ ] T6.4 Remplacer le `Select` local par le contrôle commun.
- [ ] T6.5 Ajouter un test d’intégration par onglet.

### T7 — `OnboardingWizard.tsx` — P0

Emplacement : 885 lignes. Il possède état UI, persistance locale, reprise, création/suppression serveur, compensation d’échec, édition des files et cinq étapes.

Pourquoi : la transaction métier est liée au DOM. Les reprises et rollbacks sont difficiles à tester.

Comment : service `siteSetupWorkflow`, hook contrôleur, étape par fichier et état discriminé (`draft`, `creatingSite`, `creatingQueues`, `associatingTiers`, `activating`, `completed`, `rollingBack`, `failed`).

- [ ] T7.1 Extraire transaction serveur et compensation.
- [ ] T7.2 Remplacer les booléens par une machine d’état.
- [ ] T7.3 Déplacer chaque étape dans son fichier.
- [ ] T7.4 Tester reprise, idempotence, suppression et échec partiel sans DOM.

### T8 — `KioskWizard.tsx` — P0

Emplacement : 760 lignes. Il gère identité, téléphone, rendez-vous, catalogue, tarification, règles, création, récupération du token, QR, impression, watchdog et reset. Deux fonctions construisent presque la même URL tracking.

Pourquoi : ce parcours critique mélange effets navigateur, transaction et présentation.

- [ ] T8.1 Fusionner les deux constructeurs d’URL dans une fonction pure testée.
- [ ] T8.2 Extraire construction DTO et validation.
- [ ] T8.3 Extraire impression et nettoyage listeners/timers dans un hook.
- [ ] T8.4 Donner un vrai composant à chaque étape.
- [ ] T8.5 Tester double soumission, erreur API, timeout et impression.

### T9 — Autres composants multifonctions — P1

- `ManualNotificationWizard.tsx` (412) : contrôleur, recherche et étapes ; utiliser réellement sa machine comme source unique.
- `QuickRegistration.tsx` (403) : personne, file/niveau, créneau, résultat ; partager le sélecteur avec appointments.
- `AppointmentActionDialog.tsx` (362) : détail, annulation, reprogrammation.
- `AppointmentsPage.tsx` (328) : modèle calendrier et mapping statut/couleur.
- `DeskPage.tsx` (302) : orchestrateur seulement, commandes dans un contrôleur.
- `LoginPage.tsx` (300) : carrousel et comptes démo.
- `ProfilePage.tsx` (294) : profil et mot de passe.
- `SidebarAccordion.tsx` (246) : définition menu, responsive, rendu.
- `App.tsx` (246) : éliminer la double source de routes.

- [ ] T9.1 Fixer une limite indicative de 300 lignes, exceptions documentées.
- [ ] T9.2 Traiter chaque fichier avec snapshot comportemental avant déplacement.

## 6. API, données et performances

### T10 — Isoler le client généré — P0

Constat : 83 imports directs dans 46 fichiers. Les façades sont inégales ; `auth/api/password-api.ts` et `profile/api/profile-api.ts` réexportent la même opération.

Pourquoi : les composants connaissent noms OpenAPI et réponses Axios. Une régénération diffuse dans toute l’UI. L’objectif antérieur « aucun import direct » n’est donc pas atteint architecturalement.

Comment : autoriser `api/generated` uniquement dans des adaptateurs, retourner des DTO et centraliser par domaine.

- [ ] T10.1 Migrer les 46 fichiers domaine par domaine.
- [ ] T10.2 Fusionner les doublons password/profile dans une façade account.
- [ ] T10.3 Masquer `AxiosResponse` derrière les adaptateurs.
- [ ] T10.4 Ajouter `no-restricted-imports` hors adaptateurs.
- [ ] T10.5 Adapter les mocks MSW aux façades.

### T11 — Schémas N+1 — P0/P1

Constats :

- `usePersonsByIds` : une requête/personne ;
- `usePersonNotesPresence` : une requête/personne ;
- `useDashboardSummaries` : une requête/site ;
- `useDisplaySnapshot` : une requête/file toutes les 5 secondes ;
- `useKioskCatalog` : statut/file puis règles/niveau ;
- `useDeskSession` : sessions et threads/file ;
- `useReports` : jours × files, jusqu’à sept jours ;
- `findCreatedRegistrationTrackingToken` recharge 100 inscriptions pour retrouver celle créée.

Pourquoi : coût croissant, particulièrement sur Vercel/Aiven et avec polling ; chargements partiels instables.

Comment : endpoints batch/agrégés en priorité ; sinon limiter concurrence, dédupliquer IDs, configurer `staleTime`, suspendre hors visibilité et retourner le token dès la création.

- [ ] T11.1 Mesurer les requêtes par parcours.
- [ ] T11.2 Ajouter batch personnes et présence de notes.
- [ ] T11.3 Ajouter snapshot display agrégé par site ou flux unique.
- [ ] T11.4 Remplacer jour×file par endpoint rapport d’intervalle.
- [ ] T11.5 Retourner le tracking token à la création.
- [ ] T11.6 Suspendre polling/timers onglet caché.

### T12 — Rationaliser React Query — P1

Constat : hooks mélangeant réponse Axios et DTO ; `invalidateQueueOperations` invalide six familles ; plusieurs `pageSize: 100` ; pagination settings côté client.

- [ ] T12.1 Convention unique : les hooks retournent des DTO.
- [ ] T12.2 Invalider les clés site/file/inscription exactes.
- [ ] T12.3 Définir `staleTime`, `gcTime`, retry/refetch par catégorie.
- [ ] T12.4 Passer les settings à pagination serveur de 10.
- [ ] T12.5 Dédupliquer/trier les IDs avant `useQueries`.

### T13 — Unifier polling et temps réel — P1

Constat : gateway pour tracking, `refetchInterval` ailleurs et `setInterval` dans plusieurs pages. Les politiques de pause, erreur, backoff et nettoyage divergent.

- [ ] T13.1 Recenser tous les timers et propriétaires.
- [ ] T13.2 Centraliser dans React Query ou un gateway unique.
- [ ] T13.3 Ajouter backoff, jitter et pause visibilité/réseau.
- [ ] T13.4 Tester l’absence de timers/listeners après démontage.

## 7. État global et effets navigateur

### T14 — Durée de vie des stores — P1

Session, scope, préférences, marque et opérations ont des persistances différentes. Site actif et passages vivent en `sessionStorage`, nom mémorisé en `localStorage`; le nettoyage auth connaît directement le store métier.

- [ ] T14.1 Matrice store/donnée/persistance/reset/version.
- [ ] T14.2 Registre applicatif de nettoyage à la déconnexion.
- [ ] T14.3 Tester migration et corruption de chaque état persisté.

### T15 — Encapsuler les APIs navigateur — P1

Les accès `window`, `document`, `history`, `location`, `navigator`, print, clipboard, vibration et storage sont dispersés. Cela complique les tests et le nettoyage.

- [ ] T15.1 Service d’impression commun, templates kiosque/passage séparés.
- [ ] T15.2 Injecter location/history dans la logique tracking pure.
- [ ] T15.3 Encapsuler vibration, audio et clipboard avec détection de capacité.
- [ ] T15.4 Tester les fallbacks sans API navigateur.

### T16 — Dialogues natifs — P2

`DeskPage.tsx` utilise encore `window.confirm`, contrairement au système de modales.

- [ ] T16.1 Remplacer par `ConfirmDialog` et rechercher les autres dialogues natifs.

## 8. Internationalisation

### T17 — Découper `i18n.ts` — P0

`i18n.ts` fait 917 lignes, plus deux fallbacks générés de 680 et 165 lignes. Configuration, FR/EN/AR, marque, chargement serveur, versions et concurrence sont réunis.

Risque précis : `loadTranslationBundle` indexe les versions par locale/catégorie mais retire le namespace `translation` entier avant d’ajouter un bundle. Deux catégories successives peuvent conceptuellement s’écraser.

Comment : `config`, `fallbacks/{fr,en,ar}`, `remote-bundles`, `brand-normalization`; namespace distinct `ihm`, `sms`, `error` ou fusion contrôlée.

- [ ] T17.1 Extraire langues et configuration.
- [ ] T17.2 Formaliser serveur > fallback local par namespace.
- [ ] T17.3 Tester deux catégories successives sans perte.
- [ ] T17.4 Générer les fallbacks et interdire leur édition manuelle.
- [ ] T17.5 Retirer les anciennes clés DORI après vérification.

## 9. Design system et CSS

### T18 — Finir la modularisation — P1

`application.css` reste catch-all. `public-kiosk` traverse display/kiosk, `tracking-called` display/application et `receipt-80mm` application/print. La responsabilité dépend encore de la cascade.

- [ ] T18.1 Ventiler `application.css` par feature.
- [ ] T18.2 Créer `experiences/shared.css` seulement pour les règles réellement communes.
- [ ] T18.3 Fusionner les contrôles répétés après comparaison du style calculé.
- [ ] T18.4 Ajouter Stylelint : ordre, doublons, couleurs hors tokens.

### T19 — Primitives concurrentes — P1

`SettingsWorkspace` possède un `Select` local ; champs/actions natifs sont souvent stylés par classes globales malgré le design system.

- [ ] T19.1 Inventorier boutons/input/select/textarea natifs.
- [ ] T19.2 Créer `Button`, `SelectField`, `TextField`, `FormGrid`, `DialogActions` manquants.
- [ ] T19.3 Interdire de nouveaux contrôles métier stylés localement.

## 10. Routage et contexte

### T20 — Source unique des routes — P0

`route-access.ts` porte chemins/permissions et `App.tsx` un second `protectedRouteViews`. Profile/change-password restent séparés. Une divergence peut afficher un placeholder silencieux.

Comment : manifeste typé avec path, lazy loader, frame, permissions, types utilisateur, besoin de site et métadonnées de menu ; générer routeur/sidebar/topbar/gardes.

- [ ] T20.1 Créer le manifeste sans changer les URLs.
- [ ] T20.2 Générer routes et menus depuis lui.
- [ ] T20.3 Tester unicité, vue et accès de chaque route.

### T21 — Règles de contexte site — P1

Le besoin de site actif est réparti entre `site-context-rules`, shell, routeur et hooks.

- [ ] T21.1 Mettre cette métadonnée dans le manifeste.
- [ ] T21.2 Fournir `useRequiredSite` et supprimer les contrôles redondants.

## 11. Tests et qualité continue

### T22 — Pyramide de tests — P1

Les fonctions pures sont couvertes, mais les gros orchestrateurs ont peu de tests par rapport à leurs branches. Des E2E attendent 150 ms arbitrairement. Le scénario QR peut rester bloqué jusqu’au timeout.

- [ ] T22.1 Mesurer branches critiques et couverture des gros fichiers.
- [ ] T22.2 Remplacer les sleeps par attentes réseau/DOM.
- [ ] T22.3 Diagnostiquer le blocage `kiosk-qr.spec.ts`.
- [ ] T22.4 Tester impression sans dialogue système réel.
- [ ] T22.5 Tester les fuites timers/listeners.

### T23 — Audits statiques manquants — P1

- [ ] T23.1 Knip pour exports, fichiers et dépendances inutilisés.
- [ ] T23.2 dependency-cruiser pour frontières et cycles.
- [ ] T23.3 Stylelint et contrôle des tokens.
- [ ] T23.4 Budget chunks ; bundle principal actuel proche de 490 kB non compressé.
- [ ] T23.5 Couverture Vitest et seuils progressifs.

### T24 — Scripts, artefacts et génération — P2

Les logs des scripts d’audit sont normaux. Il faut vérifier `.gitignore`, rapports/captures/profils temporaires. `api/generated/models` contient 413 fichiers : rechercher des DTO dupliqués au niveau schéma/générateur, jamais en éditant la sortie.

- [ ] T24.1 Auditer `.gitignore` et artefacts.
- [ ] T24.2 Détecter modèles générés équivalents et corriger la source OpenAPI.
- [ ] T24.3 Documenter génération et contrôle du diff.

## 12. Optimisations à mesurer

### T25 — Budgets et profilage — P2

Ne pas mémoriser, virtualiser, changer de transport temps réel ou globaliser un état sans profilage.

- [ ] T25.1 Analyse de bundle reproductible.
- [ ] T25.2 React Profiler sur cockpit, calendrier, settings, borne.
- [ ] T25.3 Requêtes, volume et polling sur 15 minutes.
- [ ] T25.4 Budgets JS, CSS, requêtes, interactivité et mémoire.

## 13. Ordre recommandé

1. **Lot A — nettoyage sûr** : baseline, T1, T2, T20, T23.
2. **Lot B — frontières** : T10, T4, T5, T14.
3. **Lot C — orchestrateurs** : T6, T7, T8, T9.
4. **Lot D — performance** : mesures T25, puis T11, T12, T13.
5. **Lot E — consolidation** : T17, T18/T19, T22, documentation finale.

## 14. Définition de terminé

- [ ] Aucun dossier source vide ni module applicatif orphelin.
- [ ] Aucun composant métier n’importe `api/generated`.
- [ ] Dépendances conformes à la direction documentée, sans cycle.
- [ ] Gros orchestrateurs séparés du métier et des effets navigateur.
- [ ] N+1 supprimés ou acceptés avec métriques.
- [ ] Routes, permissions, menus et contexte site ont une source unique.
- [ ] Précédence i18n serveur/local testée par namespace.
- [ ] CSS mort et duplications contrôlés automatiquement.
- [ ] Unitaires, intégration, E2E, build, lint et typecheck passent.
- [ ] Budgets bundle, réseau et polling vérifiés en CI.
- [ ] Chaque refactor possède une preuve dans le journal.

## 15. Journal de validation

```md
### AAAA-MM-JJ — Txx, intitulé

- Cases cochées :
- Fichiers déplacés/supprimés :
- Contrats conservés ou modifiés :
- Tests exécutés :
- Mesures avant/après :
- Risques ou suites :
```
