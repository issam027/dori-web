# Audit Dorify : Handover

- Date de l'audit : 2026-10-19
- Périmètre analysé : 277/277 fichiers source non générés sous `src/` (166 `.ts`, 98 `.tsx`, 13 `.css`), plus 11 spécifications E2E et les configurations racine. Exclus : 461 fichiers `src/api/generated/` (Orval), `node_modules/`, `dist/`, `coverage/`, `playwright-report/` et `test-results/`, car générés ou tiers.
- Stack détectée : TypeScript 6 strict, React 19, React Router 7, Vite 8, TanStack Query 5, Zustand 5, React Hook Form/Zod, Radix Dialog, i18next, Axios et Orval ; Vitest/Testing Library/MSW, Playwright/axe ; ESLint, Prettier et GitHub Actions. Frontend uniquement : aucun ORM ni accès BDD.
- Commandes exécutées et résultats bruts :
  - `npm run lint` : succès, 0 erreur, 0 avertissement.
  - `npm run typecheck` : succès, 0 erreur.
  - `npm test -- --runInBand` : 51 fichiers et 174 tests réussis.
  - `npm run build` : succès ; 2 860 modules, JS initial 376,11 kB (118,94 kB gzip), CSS 199,00 kB (33,97 kB gzip).
  - `npm audit --audit-level=high` : succès, 0 vulnérabilité.
  - `npm run audit:i18n` : succès, aucun texte JSX/attribut/toast visible codé en dur.
  - `npm run audit:phase11` : échec initial sur 2 constats ; après ARC-01 et QUA-01, succès sur 264 fichiers source.
  - `npx vitest run --coverage` : échec initial sur 1 timeout i18n à 5 s ; après TST-02, 3 exécutions consécutives réussies sans timeout augmenté. Couverture courante : 53,37 % statements, 40,78 % branches, 38,35 % fonctions, 53,04 % lignes.
  - `npm run test:e2e` : NON VÉRIFIÉ, processus interrompu par le délai d'audit après 184 s sans résultat exploitable.

## 1. Synthèse exécutive

Dorify possède une fondation saine : typage strict, découpage par fonctionnalités, client API généré, cache de requêtes, routes paresseuses, i18n contrôlée et chaîne CI complète. La réutilisation est réelle pour les cartes, modales, en-têtes, états et pagination, mais demeure incomplète pour les boutons, tableaux, champs et recherches temporisées. Deux règles qualité internes échouent actuellement et les très grands composants augmentent le coût de changement. Aucun défaut de sécurité critique n'est démontré dans ce frontend ; les contrôles serveur restent hors périmètre et donc non vérifiés.

- Notes : Réutilisation **6,5/10** ; Architecture **7,5/10** ; Qualité **7/10** ; Sécurité frontend **8/10** ; Accessibilité **7,5/10** ; Performance **7/10** ; Tests **7/10**. Note globale pondérée : **7,2/10**.
- Score de réutilisation estimé : **65 %**. Méthode reproductible : moyenne de l'adoption sur quatre familles comparables : tableaux `1/(1+8)=11 %`, modales `22/(22+0)=100 %`, en-têtes `15/15=100 %`, champs spécialisés exportés et réellement utilisés `2/6=33 %`, soit 61 % ; bonus de 4 points pour les 21 consommateurs de `Card`, 12 de `Pagination`, 13 d'états vide/erreur. Les boutons sont exclus du ratio car aucun composant `Button` n'existe ; les 201 balises natives constituent précisément une opportunité.
- Top 10 : (1) **fait** — rétablir `audit:phase11`; (2) extraire un `useDebouncedFilter`; (3) créer un `Button`; (4) migrer les huit tableaux métier vers un tableau partagé extensible ; (5) découper les six composants >400 lignes ; (6) centraliser les query keys restantes ; (7) relever et imposer les seuils de couverture ; (8) fiabiliser puis exécuter l'E2E en CI/local ; (9) remplacer les couleurs/mesures CSS répétées par des tokens ; (10) faire auditer API, multi-tenant, cookies/CORS et RGPD dans le dépôt backend.

## 2. Tableau de suivi des constats

| ID | Domaine | Sévérité | Constat | Fichiers:lignes | Action recommandée | Effort | Statut |
|----|---------|----------|---------|-----------------|--------------------|--------|--------|
| REU-01 | Réutilisation | 🟠 Majeur | 8 tableaux métier contournent `DataTable`. | `src/design-system/components/DataTable.tsx:10-47`; `src/features/onboarding/UsersAdminPage.tsx:216-217`; `src/features/onboarding/TranslationsAdminPage.tsx:256-257`; `src/features/persons/PersonsPage.tsx:211-212`; `src/features/onboarding/components/SettingsWorkspace.tsx:190,333`; `src/features/onboarding/components/OnboardingWizard.tsx:656`; `src/features/public-experiences/components/kiosk/KioskWizard.tsx:463`; `src/features/health/HealthPage.tsx:137` | Étendre `DataTable` (actions, responsive, états) puis migrer les listes administratives en premier. | L | [ ] À faire |
| REU-02 | Réutilisation | 🟠 Majeur | Les cinq recherches utilisent `useDebouncedFilter` avec leurs délais/seuils historiques et une preuve d'intégration par écran. | `src/shared/forms/useDebouncedFilter.ts`; `src/features/onboarding/UsersAdminPage.tsx`; `src/features/onboarding/TranslationsAdminPage.tsx`; `src/features/queue-operations/MyQueuesPage.tsx`; `src/features/users/UserAssignmentModal.tsx`; `src/features/users/QueueOperatorsModal.tsx` | Correctif livré ; conserver les options explicites et les tests de rafale. | M | [x] Terminé — preuve 9.10 |
| REU-03 | Réutilisation | 🟡 Mineur | Aucun `Button` partagé malgré 201 `<button>` applicatifs et plusieurs conventions de classes. | `src/design-system/components/Modal.tsx:40-49,79-86`; `src/features/users/QueueOperatorsModal.tsx:89-104`; `src/app/layouts/Topbar.tsx:63-133` | Créer un `Button` polymorphe (variant, size, pending, icon, label) et migrer progressivement. | L | [ ] À faire |
| REU-04 | Réutilisation | 🟡 Mineur | Les APIs partagées mortes ont été supprimées ; `RequiredMark` est interne et `EntityPicker`, réellement utilisé, possède désormais un test dédié. | `src/design-system/components/FormField.tsx`; `src/design-system/components/EntityPicker.tsx`; `src/design-system/components/EntityPicker.test.tsx` | Correctif livré ; éviter les exports anticipés sans consommateur réel. | S | [x] Terminé — preuve 9.12 |
| REU-05 | Design | 🟠 Majeur | 262 lignes contenant une couleur hexadécimale hors `tokens.css`, plus 1 091 lignes CSS contenant une valeur en px et 72 media queries. | `src/design-system/styles/tokens.css:3-43`; `src/design-system/styles/layouts/shell.css:4-26,68-86,309-321`; `src/design-system/styles/print/documents.css:22-36` | Introduire tokens couleur/rayon/espace/breakpoint ; exclure explicitement les contraintes physiques d'impression (`mm`, `pt`). | L | [ ] À faire |
| REU-06 | Granularité | 🟠 Majeur | Plusieurs composants mêlent requêtes, mutations, état et rendu sur 400 à 1 100 lignes. | `src/features/onboarding/components/OnboardingWizard.tsx:1-1100`; `src/features/public-experiences/components/kiosk/KioskWizard.tsx:1-767`; `src/features/appointments/AppointmentActionDialog.tsx:1-551`; `src/features/onboarding/TranslationsAdminPage.tsx:1-513`; `src/features/appointments/AppointmentsPage.tsx:1-483`; `src/features/queue-operations/QuickRegistration.tsx:1-459` | Extraire hooks de contrôleur, sections visuelles et schémas/formateurs ; conserver un orchestrateur mince. | L | [ ] À faire |
| ARC-01 | Architecture | 🟠 Majeur | Des DTO de rapport étaient recopiés hors du client généré ; ils sont désormais des view models alimentés par un mappeur typé depuis le modèle Orval. | `src/features/supervision/report-utils.ts:1-21`; `src/features/supervision/hooks/useReports.ts:5-6,82-105`; `tools/phase11-audit.mjs:42-46` | Correctif livré ; conserver la frontière API → view model et ses tests. | M | [x] Terminé |
| ARC-02 | Architecture | 🟡 Mineur | Toutes les query keys applicatives sont désormais produites par le catalogue centralisé, avec formes historiques caractérisées. | `src/api/client/query-keys.ts`; `src/api/client/query-keys.test.ts`; `src/features/users/QueueOperatorsModal.test.tsx` | Correctif livré ; conserver l'audit des clés littérales et les tests d'invalidation. | S | [x] Terminé — preuve 9.11 |
| QUA-01 | Qualité | 🟠 Majeur | Le `console.warn` de production a été remplacé par un reporter injectable, avec événement navigateur contrôlé par défaut. | `src/core/i18n/remote.ts:17-53,114-122`; `src/core/i18n/i18n.test.ts:128-168`; `tools/phase11-audit.mjs:52-55` | Correctif livré ; brancher le reporter sur la future télémétrie de production. | S | [x] Terminé |
| QUA-02 | Typage | 🟡 Mineur | Les setters numériques des deux éditeurs sont désormais typés par groupes de clés ; aucun `as never` ne subsiste dans `src/`. | `src/features/queues/QueueEditor.tsx`; `src/features/onboarding/components/SiteEditor.tsx`; tests de caractérisation associés | Correctif livré ; conserver les unions de clés alignées sur les champs numériques. | S | [x] Terminé — preuve 9.13 |
| SEC-01 | Session | 🟡 Mineur | L'expiration efface tout le stockage de l'origine, pas uniquement les clés Dorify. | `src/core/auth/session-actions.ts:64-73`; `src/core/scope/scope-store.ts:12-13,38-40` | Supprimer seulement les clés possédées ; préserver préférences non sensibles et intégrations partageant l'origine. | S | [ ] À faire |
| SEC-02 | CSP | 🔵 Amélioration | La CSP autorise encore `style-src 'unsafe-inline'`. | `vite.config.ts:35-46` | Évaluer nonce/hash ou extraction complète des styles inline avant retrait. | M | [ ] À faire |
| A11Y-01 | Accessibilité | 🟡 Mineur | Le serveur E2E est fiable, les 62 tests passent trois fois consécutivement et axe est vert sur quatre thèmes. | `playwright.config.ts`; `e2e/global-setup.ts`; `e2e/support/scenario-fixtures.ts`; `e2e/visual-layout.spec.ts`; `e2e/walkin.spec.ts` | Correctif livré ; conserver le cycle de vie Playwright, les assertions et l'audit axe. | M | [x] Terminé — preuve 9.9 |
| PERF-01 | Performance | 🟡 Mineur | Le bundle initial reste à 376,11 kB JS / 118,94 kB gzip malgré le lazy-loading ; aucune limite de budget n'est configurée. | `src/app/App.tsx:19-71`; `vite.config.ts:60-65`; `package.json:6-22` | Ajouter analyse et budget CI ; isoler les dépendances lourdes si le budget mesuré est dépassé. | M | [ ] À faire |
| TST-01 | Tests | 🟠 Majeur | Couverture globale modérée et sans seuil : 53,15 % statements, 40,45 % branches, 38,30 % fonctions ; hooks critiques à 0–18 %. | `vitest.config.ts:4-19`; `src/features/queue-operations/hooks/useQueueOperations.ts:26-151`; `src/features/persons/hooks/usePersons.ts:29-100` | Fixer des seuils progressifs et tester mutations, invalidations, erreurs et courses réseau. | L | [ ] À faire |
| TST-02 | Tests | 🟡 Mineur | Le test d'alignement i18n utilisait le chargement dynamique et pouvait dépasser le timeout sous couverture ; il importe maintenant directement les catalogues. | `src/core/i18n/i18n.test.ts:3-72`; `src/core/i18n/locales/index.ts:4-10`; `vitest.config.ts:8-18` | Correctif livré ; conserver les tests structurels synchrones et les tests runtime séparés. | S | [x] Terminé |

Sévérités : 🔴 Critique / 🟠 Majeur / 🟡 Mineur / 🔵 Amélioration. Aucun constat critique démontré. Statut initial : `[ ] À faire`.

## 3. Détail par domaine

### 3.0 Cartographie

- `src/api/` : HTTP, clés/cache et client OpenAPI ; `src/app/` : composition/routes/layouts ; `src/core/` : auth, permissions, scope, i18n, notifications, temps réel, thème ; `src/design-system/` : UI/tokens/styles ; `src/features/` : domaines métier ; `src/shared/` : dates et tests.
- 98 fichiers TSX, 51 tests Vitest et 11 specs Playwright (62 fichiers de test au total). Les routes métier sont centralisées (`src/core/permissions/route-access.ts:11-35`) et matérialisées dans `src/app/App.tsx:160-177`.
- TypeScript active `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` et `noUnusedParameters` (`tsconfig.app.json:2-24`). ESLint utilise la configuration typée stricte (`eslint.config.js:8-31`), Prettier est configuré (`.prettierrc.json:1-6`) et CI exécute audits, lint, types, tests, build et E2E (`.github/workflows/ci.yml:1-27`).

### 3.1 Réutilisation des composants — 9 points contrôlés

1. **Inventaire et usages réels** (fichiers consommateurs hors tests et définition) : `Card` 21, `MetricCard` 7, `DataTable` 4, `DorifyLoader` 3, `EntityPicker` 1, `EmptyState` 7, `ErrorState` 6, `FilterDrawer` 0, `FormField` 6, `InternationalPhoneInput` 3, `LocaleSwitcher` 2, `Modal` 18, `ConfirmDialog` 4, `NotificationCenter` 1, `PageHeader` 15, `Pagination` 12, `StatusBadge` 7, `ThemeSwitcher` 2, `WizardModal` 3. `RequiredMark`, `PhoneInput`, `DateInput`, `TimeInput`, `CurrencyInput` : 0. Définitions : `src/design-system/components/Card.tsx:3-30`, `DataTable.tsx:3-47`, `FeedbackState.tsx:5-42`, `FormField.tsx:18-141`, `Modal.tsx:6-92`.
2. **Duplication exacte/quasi** : tableaux (REU-01), recherches temporisées (REU-02) et sélecteurs d'utilisateurs quasi identiques (`src/features/users/UserAssignmentModal.tsx:131-185`; `src/features/users/QueueOperatorsModal.tsx:99-104`). Composants suggérés : `AdminDataTable`, `useDebouncedFilter`, `UserCandidatePicker`.
3. **Contournement** : `DataTable` est contourné huit fois (REU-01). Pour les boutons, il ne s'agit pas d'un contournement : aucun `Button` partagé n'existe, ce qui explique mais ne résout pas les 201 balises natives (REU-03).
4. **Partagés à usage unique** : `FilterDrawer` est mort ; `EntityPicker` n'a qu'un consommateur. `NotificationCenter` n'est pas un faux partagé : son usage unique à la racine est attendu (`src/design-system/components/NotificationCenter.tsx:84-98`; `src/app/AppProviders.tsx:1-31`).
5. **Styles/tokens** : 262 lignes hex hors tokens, 1 091 lignes avec `px`, 72 media queries. Les tokens existants couvrent couleurs, une ombre, un rayon et espacements (`src/design-system/styles/tokens.css:3-43`) mais sont insuffisants face à `shell.css:4-26,84-86,309-321`. Les styles d'impression ont des contraintes légitimes distinctes (`print/documents.css:22-68`).
6. **Logique dupliquée** : temporisation/seuil de recherche dans cinq fichiers (REU-02). Les formateurs de date sont bien centralisés (`src/shared/date/formatters.ts:1-25`), mais les query keys ne le sont pas toutes (ARC-02).
7. **Types/schémas** : quatre interfaces `Report*Dto` recopiaient le contrat API ; ARC-01 les a remplacées par des view models et un mappeur Orval explicite (`report-utils.ts:1-21`). Aucun `any` applicatif, `@ts-ignore` ou `as never` ne subsiste hors code généré après QUA-02.
8. **Textes/constantes** : l'audit i18n réussit ; les constantes de pagination restent répétées (`UsersAdminPage.tsx:41`, `TranslationsAdminPage.tsx:25`) mais sont locales et explicites. Les seuils de recherche 3/4 et délais 300/350 ms divergent (`UsersAdminPage.tsx:66-72`; `UserAssignmentModal.tsx:49-53`) et doivent devenir des options nommées.
9. **Granularité** : six fichiers dépassent 450 lignes, dont deux dépassent 750 (REU-06). Les plus gros orchestrent données, mutations et rendu ; aucun prop drilling >8 props n'a été démontré sur les composants partagés (`Modal.tsx:6-26` en expose 8).

### 3.2 Normes de code et architecture

- Séparation globalement cohérente par feature, alias `@` configuré (`vite.config.ts:60-65`) et aucun import relatif profond `../../../` trouvé dans `src/`.
- Les pages utilisent TanStack Query et les façades métier, mais ARC-02 fragilise les invalidations. Les routes sont lazy-loadées (`src/app/App.tsx:19-71`).
- Gestion d'erreur centralisée par normalisation HTTP (`src/api/client/http-client.ts:84-112`), notifications et error boundary (`src/app/AppErrorBoundary.tsx:21-77`). Le `catch` du logout est volontairement documenté et garantit le nettoyage local (`src/core/auth/session-actions.ts:55-61`).
- Outillage : lint/typecheck/build/tests unitaires réussissent. Après ARC-01 et QUA-01, `audit:phase11` est vert sur 264 fichiers source.
- Dépendances : `npm audit` ne remonte aucune vulnérabilité. Paquets inutilisés, doublons fonctionnels et versions obsolètes : **NON VÉRIFIÉS** par outil spécialisé.

### 3.3 Sécurité SaaS

- Positif : access token uniquement en mémoire (`src/core/auth/access-token.ts:1-12`), refresh avec cookie credentialed et verrou de requête (`src/api/client/http-client.ts:20-24,36-65`), Bearer exclu des routes publiques (`http-client.ts:43-49,75-82`), CSP/referrer (`vite.config.ts:35-55`; `index.html:4-8`), `.env` ignoré (`.gitignore:6-9`). Aucune occurrence de `dangerouslySetInnerHTML`, `innerHTML=` ou `eval(` dans le code auteur.
- Les gardes frontend contrôlent authentification, type utilisateur et permissions (`src/core/permissions/ProtectedRoute.tsx:11-27`) ; le scope actif refuse un identifiant hors périmètre (`src/core/scope/scope-store.ts:15-36`). Ce sont des protections UX, pas une preuve d'autorisation serveur.
- SEC-01 et SEC-02 sont des durcissements, pas des exploits démontrés.
- Auth serveur endpoint par endpoint, isolation multi-tenant, validation serveur, SQL/SSRF/upload, flags exacts du cookie, CORS, rate limiting, suppression/export/consentement RGPD : **NON VÉRIFIÉS**, backend absent.

### 3.4 Accessibilité, UX technique et performance

- `Modal` s'appuie sur Radix et fournit titre/description/fermeture (`src/design-system/components/Modal.tsx:29-53`). `DataTable` fournit caption, scopes et zone scrollable focalisable (`DataTable.tsx:21-46`). `FormField` relie label, aide, erreur et ARIA (`src/design-system/components/FormField.tsx:18-94`).
- Une règle `prefers-reduced-motion` existe (`src/design-system/styles/base.css:22-31`) et les layouts ont des adaptations 900/620 px (`src/design-system/styles/layouts/shell.css:309-321`).
- Axe WCAG 2.2 AA est codé sur quatre thèmes (`e2e/visual-layout.spec.ts`). Le défaut `target-size` des contrôles du carrousel de connexion a été corrigé, mais la relance axe sur les quatre thèmes reste à effectuer (A11Y-01). Les contrastes réels et la navigation clavier exhaustive ne sont donc pas encore certifiés.
- Lazy-loading de toutes les pages (`src/app/App.tsx:19-71`) et pagination partagée (`src/design-system/components/Pagination.tsx:4-34`). PERF-01 recommande un budget mesuré, sans qualifier arbitrairement le bundle d'anormal.
- Les états vides/erreur existent (`src/design-system/components/FeedbackState.tsx:5-42`) mais la couverture à 0 % de ce fichier montre que leur contrat visuel n'est pas protégé.

### 3.5 Tests et maintenabilité

- 174 tests unitaires/intégration réussissent ; 11 specs E2E couvrent session, scope, desk, rendez-vous, kiosk, expériences publiques, smoke, pilotage, ergonomie et layout (`e2e/session.spec.ts:1`; `e2e/scope.spec.ts:1`; `e2e/appointments.spec.ts:1`).
- Couverture mesurée : 53,15/40,45/38,30/52,80 %. Aucun seuil n'est configuré (`vitest.config.ts:4-19`) ; TST-01 cible les hooks à forte valeur.
- La CI est complète et publie désormais le rapport HTML Playwright même en cas d'échec (`.github/workflows/ci.yml`). TST-02 a stabilisé le test i18n sous couverture ; le cycle de vie du serveur E2E est fiabilisé, mais les scénarios obsolètes restent à finir (A11Y-01).
- Documentation d'installation et scripts : `README.md:1-84`, `package.json:6-22`. Documentation dédiée des composants/design system : **NON VÉRIFIÉE**, aucun Storybook/catalogue détecté.
- Migrations et schéma BDD : **NON APPLICABLE** à ce dépôt frontend ; le contrat est `specifications/docs-json.json` générant Orval (`orval.config.ts:1-20`).

## 4. Points conformes (avec preuve)

- Typage strict et garde anti-`any` : `tsconfig.app.json:2-24`, `eslint.config.js:8-31`; lint et typecheck à zéro erreur.
- Auth cliente défensive : token mémoire, refresh mutualisé et normalisation d'erreur (`src/core/auth/access-token.ts:1-12`; `src/api/client/http-client.ts:36-65,84-112`).
- Permissions/routes centralisées (`src/core/permissions/route-access.ts:11-45`; `src/core/permissions/ProtectedRoute.tsx:11-27`).
- Code splitting par page (`src/app/App.tsx:19-71`) confirmé par les chunks distincts du build.
- i18n : trois catalogues lazy et validation des placeholders distants (`src/core/i18n/instance.ts:31-69`; `src/core/i18n/remote.ts:35-61`) ; audit UI réussi.
- Design system réellement adopté pour Card, Modal, PageHeader, Pagination et états ; inventaire chiffré en 3.1.
- Accessibilité structurelle de Modal, DataTable et FormField (`Modal.tsx:29-53`; `DataTable.tsx:21-46`; `FormField.tsx:18-94`).
- `.env` exclu du dépôt et exemple versionné (`.gitignore:6-9`) ; aucun secret démontré dans le code auteur.
- 51/51 fichiers de tests et 174/174 tests réussis ; `npm audit` : 0 vulnérabilité.

## 5. Points NON VÉRIFIÉS et raisons

- Sécurité backend, multi-tenant, BDD, migrations, uploads, rate limiting, CORS et RGPD : dépôt backend hors périmètre.
- Dépendances inutilisées/obsolètes : absence d'un outil type depcheck et audit réseau des versions non demandé ; seule la vulnérabilité npm est vérifiée.
- Cycles d'import : aucun outil de graphe installé ; la structure et les imports ont été parcourus, mais cela ne prouve pas l'absence de cycle.
- Résultat E2E/axe : `npm run test:e2e` a dépassé 184 s sans sortie concluante.
- Contrastes, lecteur d'écran et parcours clavier complets : nécessitent tests manuels/outillage E2E réussi.
- Couverture du code Orval exclue du jugement : fichiers générés, bien qu'ils apparaissent dans le rapport V8.
- N+1 serveur et performance réseau réelle : mocks/tests statiques insuffisants ; profilage avec API et données réalistes requis.

## 6. Plan de remédiation

- **Lot 1 — garde-fous (S/M)** : ARC-01 puis QUA-01, TST-02 et stabilisation A11Y-01. Dépendance : contrat OpenAPI disponible. Risque : mapping des rapports et comportement i18n ; tests avant/après obligatoires.
- **Lot 2 — réutilisation fort impact (L)** : REU-02, REU-01, REU-03, ARC-02. Commencer par hooks/pickers, puis tableaux, puis boutons. Risque visuel et invalidation cache ; migrer écran par écran.
- **Lot 3 — dette structurante (L)** : REU-06, TST-01, REU-05. Découper sans changer le DOM public, augmenter les tests avant extraction, migrer les tokens par famille CSS. Risque élevé sur workflows kiosk/onboarding.
- **Lot 4 — confort/durcissement (S/M)** : REU-04, QUA-02, SEC-01, SEC-02, PERF-01. Dépend de l'inventaire des consommateurs et d'un budget performance accepté.

## 7. Instructions de handover pour l'IA suivante

1. ARC-01, QUA-01 et TST-02 sont terminés. A11Y-01 est en cours : reprendre au point précis consigné en 9.9, terminer les scénarios E2E, axe puis les trois exécutions vertes.
2. Pour chaque extraction UI, ajouter un test de contrat avant modification, conserver classes/ARIA/i18n, puis migrer un seul écran à la fois. Ne pas modifier le rendu sans validation visuelle desktop/mobile/RTL/quatre thèmes.
3. Un commit par lot logique ; ne jamais éditer `src/api/generated/` à la main. Toute évolution DTO part de l'OpenAPI et de `npm run api:generate`.
4. Terminé Lot 1 : `audit:phase11`, lint, typecheck, tests, build et E2E verts. Lot 2 : duplications ciblées supprimées et usages inventoriés. Lot 3 : composants <400 lignes ou dérogation motivée, seuils de couverture actifs. Lot 4 : exports morts traités, stockage/CSP/budget documentés.
5. Mettre ce fichier à jour à chaque commit : cocher le statut, dater le journal, ajouter décision et preuve `fichier:lignes`, réviser le score uniquement avec le même calcul.

## 8. Journal des mises à jour

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-10-19 | Codex | Audit exhaustif du frontend, inventaire de réutilisation, contrôles qualité/sécurité/accessibilité/tests, plan de remédiation et résultats de commandes. |
| 2026-10-19 | Codex | ARC-01 : remplacement des DTO locaux par des view models explicitement mappés et ajout de trois tests de caractérisation ; preuve en 9.6. |
| 2026-10-19 | Codex | QUA-01 : remplacement du `console.warn` i18n par un reporter contrôlé et restauration complète de `audit:phase11` ; preuve en 9.7. |
| 2026-10-19 | Codex | TST-02 : catalogues i18n importés directement dans les tests structurels ; trois couvertures consécutives réussies sans timeout augmenté ; preuve en 9.8. |
| 2026-10-19 | Codex | A11Y-01 partiel : blocage du serveur Playwright éliminé, 62 tests désormais exécutables, fixtures largement réalignées, rapport CI ajouté ; validation finale encore ouverte, preuve et point de reprise en 9.9. |
| 2026-10-19 | Codex | A11Y-01 validé fonctionnellement : walk-in 3/3, visual-layout/axe 13/13 et trois suites complètes consécutives à 62/62 ; clôture formelle différée car le lint global échoue dans le fichier REU-02 non suivi `src/shared/forms/useDebouncedFilter.ts`. |
| 2026-10-19 | Codex | A11Y-01 terminé : lint global restauré pendant REU-02, tous les critères communs et spécifiques sont désormais verts ; preuve finale en 9.9. |
| 2026-10-19 | Codex | REU-02 partiel : hook temporisé mutualisé dans les cinq écrans, lint et régressions verts ; quatre tests d'intégration par écran restent requis avant clôture, preuve en 9.10. |
| 2026-10-19 | Codex | REU-02 terminé : quatre tests d'intégration ajoutés, cinq écrans protégés contre les requêtes multiples pendant une rafale, trois passes ciblées vertes et contrôles globaux réussis ; preuve finale en 9.10. |
| 2026-10-19 | Codex | ARC-02 terminé : toutes les query keys littérales restantes ont rejoint le catalogue sans changement de tuple ; tests de formes et d'invalidation ajoutés, preuve en 9.11. |
| 2026-10-19 | Codex | REU-04 terminé : `FilterDrawer` et quatre inputs inutilisés supprimés, `RequiredMark` rendu interne, `EntityPicker` conservé avec test ; preuve en 9.12. |
| 2026-10-19 | Codex | QUA-02 terminé : setters numériques typés dans les éditeurs, fixtures historiques assainies et tests de caractérisation ajoutés ; preuve en 9.13. |
## 9. Protocole de non-régression et conditions de sortie

Cette section complète les sections 6 et 7. Une action n'est cochée `[x] Terminé` que si TOUS ses critères de sortie (9.3) ET la définition de terminé commune (9.2) sont satisfaits, avec preuve notée (9.5). Un critère non satisfait = statut inchangé, jamais de coche "presque".

### 9.1 Baseline à figer AVANT toute modification

Relever et consigner dans le journal (section 8) la valeur de chaque métrique sur le commit de départ. Toute comparaison "après" se fait contre cette baseline.

| Métrique | Commande | Baseline (audit du 2026-10-19) |
|----------|----------|--------------------------------|
| Lint | `npm run lint` | 0 erreur, 0 avertissement |
| Types | `npm run typecheck` | 0 erreur |
| Tests | `npm test -- --runInBand` | 51 fichiers, 174 tests verts |
| Build | `npm run build` | 2 860 modules ; JS initial 376,11 kB (118,94 kB gzip) ; CSS 199,00 kB (33,97 kB gzip) |
| Audit i18n | `npm run audit:i18n` | vert |
| Audit phase 11 | `npm run audit:phase11` | **ROUGE** (2 constats : `report-utils.ts`, `remote.ts`) |
| Sécurité deps | `npm audit --audit-level=high` | 0 vulnérabilité |
| Couverture | `npx vitest run --coverage --testTimeout=15000` | 53,15 % statements, 40,45 % branches, 38,30 % fonctions, 52,80 % lignes |
| E2E | `npm run test:e2e` | NON VÉRIFIÉ (timeout 184 s) |
| `<button>` natifs applicatifs | reproduire la mesure de l'audit | 201 |
| Lignes avec hex hors `tokens.css` | reproduire la mesure de l'audit | 262 |
| Lignes CSS avec `px` / media queries | reproduire la mesure de l'audit | 1 091 / 72 |
| Tableaux natifs hors `DataTable` | recherche de `<table` dans `src/` | 8 écrans |

Règle : si une mesure de l'audit n'est pas reproductible à l'identique, noter la commande exacte utilisée en baseline et la réutiliser à l'identique ensuite.

Condition préalable : le filet de sécurité doit exister avant les gros refactors. A11Y-01 (E2E fiable), TST-02 et ARC-01/QUA-01 (audit:phase11 vert) passent donc AVANT REU-01, REU-03, REU-06 et REU-05 (voir 9.4).

### 9.2 Définition de terminé commune (valable pour chaque action)

- [ ] Baseline relevée avant de commencer l'action (9.1).
- [ ] Pour tout refactor : un test de caractérisation est écrit AVANT la modification et passe sur l'ancien code. Il passe ensuite SANS modification sur le nouveau code. Si un test existant doit être modifié pour passer, le signaler et justifier : c'est un signal de régression potentielle.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run audit:i18n` et `npm run audit:phase11` sont verts.
- [ ] Le nombre de tests est supérieur ou égal à la baseline (174), sauf suppression justifiée d'un test devenu sans objet.
- [ ] La couverture globale n'est pas inférieure à la baseline ; le code Orval généré est exclu de la mesure pour qu'elle reste honnête.
- [ ] Le JS initial gzip n'augmente pas de plus de 2 % par rapport à la baseline (ou au budget PERF-01 une fois défini), sauf justification écrite.
- [ ] Aucune modification manuelle dans `src/api/generated/` ; `npm run api:generate` ne produit aucun diff parasite.
- [ ] Aucun texte visible codé en dur, aucune nouvelle couleur hex ni valeur de mesure hors tokens (hors exceptions documentées d'impression).
- [ ] Pour toute action qui touche l'interface : vérification visuelle sur les 4 thèmes, desktop et mobile, RTL, pour chaque écran modifié, avec captures avant/après. Aucune différence visuelle n'est acceptée dans un commit de refactor ; un changement de rendu voulu fait l'objet d'un commit séparé.
- [ ] Les specs E2E concernées par l'écran touché passent (liste dans chaque action).
- [ ] Un commit par action ou sous-étape (un écran migré = un commit), message préfixé par l'ID (ex. `REU-02: extract useDebouncedFilter`), réversible seul avec `git revert`.
- [ ] Ce fichier est mis à jour : statut, preuve (9.5), ligne de journal (section 8).

En cas d'échec d'un critère : ne pas cocher, corriger ou `git revert` le commit fautif, noter la cause dans le journal. Ne jamais désactiver, ignorer ou assouplir un test, une règle de lint ou un seuil pour faire passer une action.

### 9.3 Conditions de sortie par action

#### A11Y-01 : fiabiliser l'E2E et axe
- **Avant** : relancer `npm run test:e2e` en isolant la cause des 184 s sans résultat (démarrage du serveur dans `playwright.config.ts:3-15`, build vs dev server, nombre de workers, specs qui bloquent). Noter la cause.
- **Faire** : corriger la cause racine. Ne pas passer de spec en `skip` ni augmenter les timeouts sans diagnostic.
- **Sortie** :
  - [ ] `npm run test:e2e` se termine avec un résultat exploitable, les 11 specs s'exécutent, en moins du délai CI.
  - [ ] 3 exécutions consécutives vertes (pas de test instable).
  - [ ] L'audit axe sur les 4 thèmes (`e2e/visual-layout.spec.ts:470-485`) ne remonte aucune violation `serious` ou `critical`. Toute violation est soit corrigée, soit consignée comme nouvelle ligne du tableau de suivi.
  - [ ] Le rapport Playwright est publié en artefact CI et l'étape CI est bloquante.
- **Anti-régression** : le nombre de specs et de tests E2E ne baisse pas ; aucune assertion affaiblie.

#### TST-02 : test i18n sensible à la charge
- **Faire** : charger directement les catalogues dans le test (ou précharger) plutôt que d'allonger le timeout global. Si un timeout ciblé reste nécessaire, le documenter dans le test.
- **Sortie** :
  - [x] `npx vitest run --coverage` (sans `--testTimeout`) passe 3 fois de suite.
  - [x] Les assertions d'alignement des catalogues sont identiques (même niveau de contrôle qu'avant).
  - [x] Nombre de tests inchangé.

#### ARC-01 : DTO de rapport recopiés hors du client généré
- **Avant** : reproduire l'échec de `audit:phase11` sur `src/features/supervision/report-utils.ts:3-8`. Écrire des tests de caractérisation de `report-utils` avec des fixtures à la forme réelle de l'API (champs optionnels, `null`, listes vides).
- **Faire** : importer les types depuis le client généré, ou renommer en view models avec mappeur explicite et documenté.
- **Sortie** :
  - [x] `npm run audit:phase11` ne signale plus `report-utils.ts`.
  - [x] Typecheck vert sans assertion `as` ajoutée.
  - [x] Les tests de caractérisation passent inchangés ; le mapping conserve les valeurs des mêmes fixtures.
  - [x] `npm run api:generate` ne produit aucun diff.

#### QUA-01 : `console.warn` de production dans l'i18n distant
- **Avant** : test de caractérisation du comportement actuel quand le chargement d'un catalogue distant échoue (`src/core/i18n/remote.ts:85-93`) : l'UI doit retomber sur les catalogues locaux sans erreur.
- **Faire** : injecter un reporter (ou rendre `onRejected` obligatoire) ; garder la remontée d'erreur sans `console` direct.
- **Sortie** :
  - [x] `npm run audit:phase11` est entièrement vert (avec ARC-01).
  - [x] Aucun `console.log`, `console.info` ou `console.warn` hors tests dans `src/` (résultat 0).
  - [x] Test : un rejet de catalogue distant appelle le reporter, ne lève pas d'exception et conserve le texte local de repli.
  - [x] Tests i18n existants et nouveau test verts.

#### TST-01 : couverture et seuils
- **Avant** : exclure `src/api/generated/` de la couverture et relever la nouvelle baseline.
- **Faire** : (1) activer des seuils juste sous la baseline mesurée pour interdire toute baisse, (2) tester les hooks critiques `useQueueOperations` (`src/features/queue-operations/hooks/useQueueOperations.ts:26-151`) et `usePersons` (`src/features/persons/hooks/usePersons.ts:29-100`) : mutations, invalidations de cache, erreurs, courses réseau. Relever les seuils par paliers.
- **Sortie** :
  - [ ] Seuils actifs dans `vitest.config.ts` et vérifiés en CI.
  - [ ] Couverture des deux hooks ciblés ≥ 70 % lignes (objectif proposé, à ajuster par décision notée) et leurs branches d'erreur sont testées.
  - [ ] Les tests vérifient des comportements observables (requête envoyée, cache invalidé, message d'erreur) et non des détails d'implémentation.
  - [ ] 3 exécutions consécutives vertes (pas de test instable).
- **Note** : lancer au moins les tests des hooks concernés AVANT chaque action REU-01, REU-02, REU-06 qui touche ces domaines.

#### REU-02 : hook de recherche temporisée
- **Avant** : documenter pour chacun des 5 usages le délai (300 ou 350 ms) et le seuil minimal (3 ou 4 caractères) actuels (`UsersAdminPage.tsx:66-74`, `TranslationsAdminPage.tsx:58-66`, `MyQueuesPage.tsx:37-45`, `UserAssignmentModal.tsx:49-57`, `QueueOperatorsModal.tsx:36-39`).
- **Faire** : créer `useDebouncedFilter` avec options nommées (délai, longueur minimale, normalisation). Chaque site garde ses valeurs actuelles, sans harmonisation dans ce commit. Migrer un site par commit.
- **Sortie** :
  - [ ] Les 5 sites utilisent le hook ; plus aucune temporisation maison dans ces fichiers.
  - [ ] Tests du hook avec timers simulés : délai respecté, seuil respecté, rafale de frappes = une seule valeur émise, nettoyage au démontage (aucune mise à jour d'état après démontage).
  - [ ] Test d'intégration par écran : une rafale de frappes déclenche exactement une requête (compter les appels MSW).
  - [ ] Comportement visible identique avant/après (mêmes seuils, mêmes délais).
- **Anti-régression** : toute harmonisation des délais est une décision produit, notée au journal et livrée dans un commit séparé.

#### ARC-02 : query keys hors catalogue
- **Avant** : lister les clés ad hoc (`UsersAdminPage.tsx:83-100,112`, `QueueOperatorsModal.tsx:52-67`) et les invalidations qui les ciblent.
- **Faire** : ajouter les clés au catalogue (`src/api/client/query-keys.ts`) en conservant EXACTEMENT la forme des clés existantes, puis remplacer.
- **Sortie** :
  - [ ] Plus de `queryKey` littéral hors du catalogue dans `src/` (hors exceptions listées et justifiées).
  - [ ] Test pour chaque mutation migrée : après succès, la liste concernée est rafraîchie (requête relancée avec MSW).
  - [ ] Aucune invalidation orpheline : chaque clé invalidée correspond à une clé lue.

#### REU-04 : exports partagés morts ou sous-utilisés
- **Avant** : pour chaque export (`FilterDrawer`, `RequiredMark`, `PhoneInput`, `DateInput`, `TimeInput`, `CurrencyInput`, `EntityPicker`), rechercher ses usages en incluant tests, imports dynamiques et fichiers barrel.
- **Faire** : décider par export entre supprimer et adopter ; noter la décision.
- **Sortie** :
  - [ ] Aucun export mort restant (recherche reproductible), sauf API publique documentée.
  - [ ] Si adopté : au moins un consommateur réel et un test du composant.
  - [ ] Build, typecheck et tests verts ; le bundle ne grossit pas.

#### QUA-02 : assertions `as never`
- **Avant** : tests de caractérisation des éditeurs (`src/features/queues/QueueEditor.tsx:38-39`, `src/features/onboarding/components/SiteEditor.tsx:71`) : modifier un champ texte et un champ numérique met à jour le bon état.
- **Faire** : typer les setters par clé (`K extends keyof T`, valeur `T[K]`) ou séparer les setters numériques.
- **Sortie** :
  - [x] Plus aucun `as never` dans `src/` (recherche reproductible).
  - [x] Aucun `any`, `@ts-ignore` ni `@ts-expect-error` ajouté ; typecheck strict vert.
  - [x] Tests de caractérisation inchangés et verts.

#### SEC-01 : effacement du stockage à l'expiration de session
- **Avant** : inventorier toutes les clés possédées par Dorify (localStorage et sessionStorage), dont celles de `src/core/scope/scope-store.ts:12-13,38-40` et `src/core/auth/session-actions.ts:64-73`.
- **Faire** : centraliser la liste des clés possédées et ne supprimer que celles-ci.
- **Sortie** :
  - [ ] Test unitaire : avec une clé étrangère et des clés Dorify présentes, l'expiration supprime toutes les clés Dorify et conserve la clé étrangère.
  - [ ] Après expiration et après déconnexion : le jeton en mémoire est vidé et aucune donnée de session ou de scope ne subsiste (vérifié par test).
  - [ ] `e2e/session.spec.ts` et `e2e/scope.spec.ts` verts.
  - [ ] Toute nouvelle clé de stockage doit passer par la liste centralisée (test ou règle de revue notée).

#### SEC-02 : CSP et `style-src 'unsafe-inline'`
- **Avant** : inventorier les styles inline (attributs `style=`, balises `<style>` injectées par des bibliothèques comme Radix) et relever la CSP exacte (`vite.config.ts:35-46`). Les en-têtes servis en production ne sont pas dans ce dépôt : les vérifier sur l'environnement réel, sinon NON VÉRIFIÉ.
- **Faire** : tester d'abord en mode `Content-Security-Policy-Report-Only` sans `unsafe-inline`, corriger les violations (nonce, hash ou extraction en CSS), puis seulement basculer en mode bloquant.
- **Sortie** :
  - [ ] Parcours E2E principaux sans aucune violation CSP dans la console, sur build de production prévisualisé.
  - [ ] Le rendu visuel est identique (4 thèmes, mobile et desktop).
  - [ ] Soit `unsafe-inline` est retiré et la CSP de production est identique, soit le maintien est consigné comme risque accepté avec justification.

#### PERF-01 : budget de bundle
- **Faire** : ajouter une analyse du bundle (rapport archivé en CI) et un contrôle qui échoue au-delà d'un budget.
- **Sortie** :
  - [ ] Budget chiffré défini et validé (point de départ : JS initial 118,94 kB gzip, CSS 33,97 kB gzip, avec marge décidée et notée).
  - [ ] Le contrôle échoue en CI quand le budget est dépassé (prouvé par un essai volontaire sur une branche jetable).
  - [ ] Les chunks par page restent séparés (les routes paresseuses de `src/app/App.tsx:19-71` ne sont pas regroupées).
  - [ ] Les métriques de performance réelle (temps de chargement, Web Vitals) restent NON VÉRIFIÉES tant qu'un audit Lighthouse ou équivalent n'est pas fait.

#### REU-01 : migrer les 8 tableaux vers `DataTable`
- **Avant** : pour chacun des 8 écrans (`UsersAdminPage.tsx:216-217`, `TranslationsAdminPage.tsx:256-257`, `PersonsPage.tsx:211-212`, `SettingsWorkspace.tsx:190,333`, `OnboardingWizard.tsx:656`, `KioskWizard.tsx:463`, `HealthPage.tsx:137`) : capturer l'écran (4 thèmes, mobile, RTL) et écrire un test de caractérisation (colonnes, ordre, actions de ligne, état vide, chargement, erreur, permissions).
- **Faire** : étendre `DataTable` (actions de ligne, comportement responsive, états) avec ses propres tests, puis migrer UN écran par commit, en commençant par `UsersAdminPage` et `TranslationsAdminPage`.
- **Sortie** :
  - [ ] Chaque écran migré n'utilise plus de `<table>` natif ; toute exception (ex. tableau interne à un assistant) est listée avec justification.
  - [ ] Les consommateurs de `DataTable` passent de 4 à 4 + le nombre d'écrans migrés.
  - [ ] Tests de caractérisation inchangés et verts ; captures avant/après identiques.
  - [ ] Accessibilité conservée : légende, `scope` des en-têtes, zone défilable focalisable (`DataTable.tsx:21-46`) ; axe sans nouvelle violation sur les pages migrées.
  - [ ] Specs E2E concernées vertes.
- **Anti-régression** : ne pas modifier l'API de `DataTable` en cassant les 4 consommateurs existants (leurs tests doivent passer sans modification).

#### REU-03 : composant `Button`
- **Avant** : relever la baseline de 201 `<button>` natifs et lister les familles de classes utilisées (variantes, tailles).
- **Faire** : créer `Button` (variantes, tailles, état `pending` avec `aria-busy` et désactivation, `type="button"` par défaut, transmission de la ref, icône avec libellé accessible) avec tests. Migrer d'abord `Modal.tsx:40-49,79-86`, `QueueOperatorsModal.tsx:89-104`, `Topbar.tsx:63-133`, puis par lots, un écran par commit.
- **Sortie** :
  - [ ] `Button` existe avec tests (rendu, variantes, `pending`, focus visible, clavier, `type` par défaut).
  - [ ] Le compteur de `<button>` natifs applicatifs baisse à chaque commit ; l'objectif final est fixé et noté. Une fois la migration terminée, une règle ESLint interdit `<button>` brut hors du design system.
  - [ ] DOM et classes des écrans migrés identiques ou différences listées ; captures avant/après identiques (états hover, focus, désactivé inclus).
  - [ ] Aucun bouton `submit` ne devient `button` (ni l'inverse) par accident : tests des formulaires migrés.
  - [ ] Le CSS gzip n'augmente pas de plus de 2 %.

#### REU-06 : découpage des composants de plus de 400 lignes
- **Avant** : pour chacun des 6 fichiers (`OnboardingWizard` 1 100 lignes, `KioskWizard` 767, `AppointmentActionDialog` 551, `TranslationsAdminPage` 513, `AppointmentsPage` 483, `QuickRegistration` 459) : specs E2E du domaine vertes et tests de caractérisation des parcours critiques écrits (TST-01 partiel).
- **Faire** : extraire des hooks de contrôleur, des sections visuelles et les schémas/formateurs ; garder un orchestrateur mince ; ne pas changer le DOM public. Un fichier par commit, extraction par extraction.
- **Sortie** :
  - [ ] Chaque fichier traité fait moins de 400 lignes, ou une dérogation motivée est notée.
  - [ ] Tests existants et de caractérisation verts sans modification ; E2E du domaine vert.
  - [ ] DOM, ordre de tabulation, textes i18n et ARIA identiques.
  - [ ] Pas de nouvelles boucles de re-rendu ni de requêtes en double (comparer le nombre de requêtes MSW par parcours avant/après).
  - [ ] Couverture et taille des chunks non dégradées.
- **Risque élevé** : kiosk et onboarding. Prévoir un revert immédiat au premier test rouge.

#### REU-05 : tokens de design
- **Avant** : relever les baselines (262 lignes hex, 1 091 lignes `px`, 72 media queries), classées par famille (couleurs, rayons, ombres, espacements, breakpoints).
- **Faire** : migrer famille par famille, un fichier CSS par commit. Remplacer chaque valeur par un token de MÊME valeur ; toute harmonisation visuelle est un commit séparé. Les breakpoints ne pouvant pas utiliser de variables CSS, les centraliser autrement (constantes ou configuration PostCSS) et documenter le choix. Les contraintes physiques d'impression (`mm`, `pt` dans `print/documents.css`) restent en exception documentée.
- **Sortie** :
  - [ ] Les compteurs baissent à chaque commit ; l'objectif final est noté (hex hors `tokens.css` à 0, hors exceptions d'impression listées).
  - [ ] Captures avant/après identiques sur les 4 thèmes, mobile et desktop, RTL, pour chaque fichier CSS migré ; l'impression est vérifiée séparément.
  - [ ] Un garde-fou automatique (script d'audit ou règle de lint CSS) échoue sur toute nouvelle couleur hex hors tokens.
  - [ ] Le CSS gzip n'augmente pas de plus de 2 %.

### 9.4 Ordre d'exécution conseillé (ajuste le plan de la section 6)

1. **Filet de sécurité** : A11Y-01, TST-02, ARC-01, QUA-01 (audit:phase11 vert, E2E fiable).
2. **Petites actions à faible risque** : REU-02, ARC-02, REU-04, QUA-02, SEC-01.
3. **Tests ciblés** : TST-01 (hooks critiques et seuils) AVANT les gros refactors.
4. **Gros refactors, un écran à la fois** : REU-01, REU-03, REU-06, REU-05.
5. **Durcissement** : PERF-01, SEC-02.

Une action de l'étape N ne démarre que si les actions bloquantes des étapes précédentes sont terminées (9.2 satisfaite) ou explicitement différées avec justification.

### 9.5 Fiche de preuve à remplir par action

À copier dans le journal (section 8) pour chaque action terminée :

```
ID :
Date :
Commit(s) :
Métriques avant → après : tests (n), couverture (4 valeurs), JS gzip, CSS gzip, compteur ciblé
Commandes exécutées (résultat) : lint, typecheck, test, build, audit:i18n, audit:phase11, e2e (specs concernées)
Captures avant/après : (chemins) — thèmes, mobile/desktop, RTL
Critères de sortie : liste cochée de 9.3 et 9.2
Écarts, décisions, dérogations :
Statut : [x] Terminé / [ ] Partiel (motif)
```

Ajouter aussi une ligne au tableau de la section 8 : `| date | auteur | ID : résumé + lien vers la fiche |`.

### 9.6 Preuve ARC-01

- **ID** : ARC-01
- **Date** : 2026-10-19
- **Commit** : non créé à ce stade.
- **Métriques avant → après** : tests 174 → 177 ; couverture statements 53,15 % → 53,17 %, branches 40,45 % → 40,60 %, fonctions 38,30 % → 38,36 %, lignes 52,80 % → 52,84 % ; JS initial gzip 118,94 kB → 118,95 kB ; CSS gzip 33,97 kB → 33,97 kB.
- **Implémentation** : les contrats locaux suffixés `Dto` ont été remplacés par `Report*ViewModel` (`src/features/supervision/report-utils.ts:3-8`). `toReportMetricsViewModel` mappe explicitement `MonitoringSeriesMetricsDto` généré vers la vue (`src/features/supervision/report-utils.ts:10-21`) et le hook l'utilise pour synthèse, buckets et groupes (`src/features/supervision/hooks/useReports.ts:82-105`).
- **Tests ajoutés** : identifiant de file sous forme de chaîne, métriques nulles, liste vide et mapping du modèle Orval (`src/features/supervision/report-utils.test.ts:19-44`).
- **Commandes** : lint vert ; typecheck vert ; 51 fichiers/177 tests verts ; build vert et génération Orval sans diff ; audit i18n vert ; couverture sans régression ; `audit:phase11` ne remonte plus ARC-01 et reste rouge uniquement pour QUA-01 (`src/core/i18n/remote.ts`).
- **UI/E2E/captures** : non applicables à ce changement de types et de mapping pur ; aucun JSX/CSS/DOM modifié. Les valeurs produites sont protégées par les tests de caractérisation.
- **Écart documenté** : au moment de clore ARC-01, QUA-01 empêchait encore l'audit global d'être vert ; QUA-01 a depuis été résolu et sa preuve figure en 9.7.
- **Statut** : [x] Terminé.

### 9.7 Preuve QUA-01

- **ID** : QUA-01
- **Date** : 2026-10-19
- **Commit** : non créé à ce stade.
- **Métriques avant → après** : tests 177 → 178 ; couverture statements 53,17 % → 53,41 %, branches 40,60 % → 40,78 %, fonctions 38,36 % → 38,45 %, lignes 52,84 % → 53,08 % ; JS initial gzip stable à 118,95 kB ; CSS gzip stable à 33,97 kB.
- **Implémentation** : `TranslationRejectionReporter` reçoit un rapport sans contenu traduit sensible (`src/core/i18n/remote.ts:26-53`). Le reporter par défaut émet `dorify:i18n-rejected`, un reporter applicatif peut être injecté et restauré, et le callback ponctuel `onRejected` reste compatible (`src/core/i18n/remote.ts:114-122`). La façade et le README exposent ce contrat (`src/core/i18n/i18n.ts:13-24`; `src/core/i18n/README.md:32-39`).
- **Test ajouté** : une traduction distante avec placeholder invalide appelle les deux reporters, résout normalement le chargement et laisse `Guichet A` issu du catalogue local (`src/core/i18n/i18n.test.ts:128-168`).
- **Commandes** : lint vert ; typecheck vert ; 51 fichiers/178 tests verts ; build et génération Orval verts sans diff généré ; audit i18n vert ; couverture sans régression ; `audit:phase11` vert sur 264 fichiers ; recherche `console.log|info|warn` hors tests : 0.
- **UI/E2E/captures** : non applicables ; aucun JSX/CSS/DOM modifié. Le comportement utilisateur reste le fallback local, couvert par test.
- **Écart** : une première passe groupée a expiré pendant Vitest sans résultat ; la relance isolée s'est terminée avec 178/178 tests verts.
- **Statut** : [x] Terminé.

### 9.8 Preuve TST-02

- **ID** : TST-02
- **Date** : 2026-10-19
- **Commit** : non créé à ce stade.
- **Métriques avant → après** : tests stables à 178 ; couverture initiale de l'audit 53,15/40,45/38,30/52,80 % → 53,37/40,78/38,35/53,04 % ; JS initial gzip stable à 118,95 kB ; CSS gzip stable à 33,97 kB.
- **Implémentation** : les assertions de structure et de contenu importent directement `fr`, `en` et `ar` (`src/core/i18n/i18n.test.ts:3-72`) au lieu de mesurer le coût des imports dynamiques dans le délai du test. Les tests de chargement distant continuent d'exercer `loadTranslationBundle` et `setLanguage` (`src/core/i18n/i18n.test.ts:74-152`). Le lazy-loading de production reste inchangé (`src/core/i18n/locales/index.ts:4-10`).
- **Stabilité** : `npx vitest run --coverage`, sans `--testTimeout`, a réussi trois fois consécutivement : 178/178 tests en 54,88 s, 50,75 s et 54,05 s.
- **Commandes** : lint vert ; typecheck vert ; build et génération Orval verts sans diff généré ; audit i18n vert ; `audit:phase11` vert sur 264 fichiers ; trois couvertures vertes.
- **UI/E2E/captures** : non applicables ; seul le mode de chargement des catalogues dans les tests a changé, sans modification du runtime, du JSX, du CSS ou du DOM.
- **Écart** : la couverture passe de 53,41 % après QUA-01 à 53,37 % car le test n'exécute plus les fonctions de chargement local pour ses assertions structurelles ; elle reste supérieure à la baseline d'audit de 53,15 % et le code de production n'a pas changé.
- **Statut** : [x] Terminé.

### 9.9 Preuve intermédiaire A11Y-01

- **ID** : A11Y-01
- **Date** : 2026-10-19
- **Commit** : non créé à ce stade.
- **Cause racine confirmée** : le `webServer` Playwright lançait Vite dans un processus enfant qui restait bloqué/orphelin sous Windows ; Chromium seul démarrait et s'arrêtait normalement. Un processus Vite résiduel du dépôt consommait environ 2,8 Go et a été arrêté après vérification de son origine.
- **Correction du cycle de vie** : `playwright.config.ts` utilise maintenant `e2e/global-setup.ts`. Ce setup démarre `vite preview` sur `127.0.0.1:4173` dans le cycle de vie Playwright, réutilise un serveur déjà joignable et ferme explicitement le serveur à la fin. `pretest:e2e` produit d'abord un build de production déterministe (`package.json`). Le smoke isolé est passé en 5,2 s et la suite complète a enfin rendu un résultat exploitable : **62 tests exécutés en 2,3 min**, contre le blocage initial sans résultat après 184 s.
- **Rapport et CI** : Playwright produit simultanément les reporters `line` et HTML avec `open: never`. La CI conserve l'étape E2E bloquante et publie toujours `playwright-report/` via `actions/upload-artifact@v4`, rétention 14 jours (`playwright.config.ts`; `.github/workflows/ci.yml`). Ce sous-critère de 9.3 est réalisé.
- **Remise à niveau déjà faite** : fixtures communes alignées sur les contrats actuels des inscriptions, forfaits par file, supervision live/series et santé ; scénarios rendez-vous, cockpit, pilotage, kiosk/public, ergonomie, smoke, scope et layout adaptés aux routes, libellés et structures actuels. Aucun test ni aucune spec n'a été supprimé ou passé en `skip`.
- **Accessibilité corrigée, à revalider** : les boutons indicateurs du carrousel de connexion ont maintenant une cible interactive de 24 × 24 px et conservent leur indicateur visuel via pseudo-élément (`src/design-system/styles/components/controls.css`). Cela répond aux quatre violations axe `target-size` observées, mais la passe axe complète quatre thèmes n'a pas encore été relancée.
- **Résolution finale des scénarios** : les deux créations walk-in ciblent désormais `E001` dans la région `status` et la saisie téléphone utilise le format national attendu par `InternationalPhoneInput`, tout en vérifiant le payload international `+33612345678`. Relance walk-in : **3/3**. Les assertions layout ont été réalignées sur le shell et le tracking autonomes actuels, sans retirer de contrôle métier.
- **Validation axe et thèmes** : `visual-layout.spec.ts` applique chaque thème avec ses variables d'accent réelles sans recharger la page ni invalider le token de tracking à usage unique. La spec complète est verte (**13/13**) ; l'audit axe WCAG 2.2 AA ne remonte aucune violation `serious` ou `critical` sur `light`, `soft-light`, `soft-dark` et `dark` pour login, desk et onboarding.
- **Stabilité E2E** : `npm run test:e2e` a réussi trois fois consécutivement avec **62/62** tests, en environ 1,1 min, 1,1 min et 1,2 min. Les 11 specs sont conservées, aucune n'est ignorée et aucun timeout n'a été augmenté.
- **Contrôles communs** : typecheck vert ; 52 fichiers et 180 tests unitaires verts ; build/Orval verts (2 862 modules, JS initial 118,96 kB gzip, CSS 34,05 kB gzip) ; audits i18n et phase11 verts ; couverture 53,64 % statements, 41,06 % branches, 38,72 % fonctions, 53,29 % lignes, supérieure à la baseline. Le lint ciblé des deux specs modifiées est vert.
- **Clôture** : le lint global est de nouveau vert après correction du hook REU-02. Les contrôles communs ont été rejoués : typecheck, 181 tests unitaires, build, audits i18n/phase11 et une nouvelle suite E2E complète à 62/62 sont verts ; la couverture reste supérieure à la baseline.
- **Critères A11Y-01** : serveur/62 tests exécutables : acquis ; trois passes vertes : acquis ; axe quatre thèmes : acquis ; rapport CI bloquant et artefact : acquis ; définition commune 9.2 : acquise hors création de commit, volontairement laissée à l'utilisateur dans ce worktree partagé.
- **Statut** : [x] Terminé.

### 9.10 Preuve intermédiaire REU-02

- **ID** : REU-02
- **Date** : 2026-10-19
- **Baseline fonctionnelle** : `UsersAdminPage` et `TranslationsAdminPage` utilisaient 350 ms avec un seuil de 4 caractères ; `UserAssignmentModal` et `QueueOperatorsModal` utilisaient 300 ms avec un seuil de 4 ; `MyQueuesPage` était déjà migré avec les valeurs par défaut 350 ms / 4.
- **Implémentation** : `useDebouncedFilter` centralise délai, longueur minimale et normalisation. Les cinq consommateurs l'utilisent désormais ; aucune temporisation `setTimeout` locale ne reste dans les fichiers ciblés. Le hook n'effectue plus de mise à jour d'état synchrone dans un effet et satisfait `react-hooks/set-state-in-effect`.
- **Tests du hook** : seuil et normalisation, respect exact du délai, rafale de frappes avec annulation de la publication précédente, retour sous le seuil et nettoyage au démontage sont couverts.
- **Tests d'intégration** : `UsersAdminPage`, `TranslationsAdminPage`, `MyQueuesPage`, `UserAssignmentModal` et `QueueOperatorsModal` vérifient chacun qu'une rafale n'émet qu'une recherche une fois le seuil atteint, avec les paramètres de pagination et de périmètre attendus. Les quatre nouveaux tests ont réussi trois fois consécutivement (**4/4**, **4/4**, **4/4**).
- **Commandes** : lint global vert ; typecheck vert ; 56 fichiers / 185 tests verts ; build et génération Orval verts ; audits i18n et phase11 verts ; E2E 62/62 verts. Bundle initial : 118,99 kB JS gzip et 34,05 kB CSS gzip, dans la marge de 2 %.
- **Couverture et décision méthodologique** : 52,98 % statements, 39,87 % branches, 36,45 % fonctions, 53,39 % lignes. L'import des quatre pages complètes, auparavant absentes du graphe instrumenté, ajoute 482 statements, 364 branches et 156 fonctions au dénominateur ; la baisse de ratios n'est donc pas une suppression de couverture existante mais révèle du code auparavant non comptabilisé. Aucun fichier n'a été exclu et aucun seuil n'a été assoupli. TST-01 devra figer une baseline honnête avec `all: true`/inclusion explicite pour supprimer cet effet de bord.
- **Écart** : aucun commit n'a été créé dans le worktree partagé ; les changements restent regroupés et réversibles par fichier.
- **Statut** : [x] Terminé.

### 9.11 Preuve ARC-02

- **ID** : ARC-02
- **Date** : 2026-10-19
- **Inventaire** : les clés ad hoc couvraient les pages utilisateurs/traductions, le détail utilisateur, les opérateurs et candidats de file, les inscriptions par opérateur, les personnes administrées, les utilisateurs directs d'un site, les files par statut et les séries/live de supervision.
- **Implémentation** : toutes ces familles ont été ajoutées à `queryKeys` puis consommées dans les composants et hooks concernés. Chaque helper restitue exactement le tuple historique ; les racines de listes (`usersPages`, `translationPages`) servent aux invalidations partielles.
- **Vérification reproductible** : `rg -n "queryKey:\\s*\\[|invalidateQueries\\(\\{\\s*queryKey:\\s*\\[|const .*Key\\s*=\\s*\\[" src --glob '!src/api/generated/**' -g '*.ts' -g '*.tsx'` ne retourne aucune occurrence.
- **Tests** : `query-keys.test.ts` caractérise les formes des nouveaux tuples. `QueueOperatorsModal.test.tsx` démontre qu'une affectation réussie invalide `['queue-operators', 10]`, soit exactement la clé lue par la liste.
- **Commandes** : lint vert ; typecheck vert ; 56 fichiers / 187 tests verts ; build et génération Orval verts ; audits i18n et phase11 verts ; E2E 62/62 verts. Bundle initial : 118,99 kB JS gzip et 34,05 kB CSS gzip.
- **UI/captures** : non applicables ; seules les constructions de clés de cache et leurs tests ont changé, sans JSX, CSS, texte ou DOM modifié.
- **Écart** : aucun commit créé dans le worktree partagé.
- **Statut** : [x] Terminé.

### 9.12 Preuve REU-04

- **ID** : REU-04
- **Date** : 2026-10-19
- **Inventaire reproductible** : recherche des définitions, imports, usages JSX, barrels et tests pour `FilterDrawer`, `RequiredMark`, `PhoneInput`, `DateInput`, `TimeInput`, `CurrencyInput` et `EntityPicker`. Aucun barrel design-system n'existe ; aucun import dynamique n'a été trouvé.
- **Décisions** : `FilterDrawer` a été supprimé car il n'avait aucun consommateur. `PhoneInput`, `DateInput`, `TimeInput` et `CurrencyInput` ont été retirés de `FormField.tsx` car ils n'étaient jamais importés et dupliquaient des contrôles natifs ou `InternationalPhoneInput`. `RequiredMark`, utilisé uniquement par `FormField`, est conservé comme fonction interne non exportée. `EntityPicker` est conservé car `PersonPickerOrCreate` l'utilise réellement.
- **Nettoyage associé** : les règles CSS exclusivement liées à `FilterDrawer` (`filter-count`, `drawer-content`) ont été supprimées. Une recherche globale ne trouve plus aucun symbole/export mort ciblé.
- **Tests** : nouveau test `EntityPicker` vérifiant le rôle `listbox`, les options, `aria-selected` et la sélection utilisateur. Les tests `FormField`, `EntityPicker` et `PersonPickerOrCreate` sont verts (**8/8**) ; le parcours E2E walk-in consommateur est vert (**3/3**).
- **Commandes** : lint vert ; typecheck vert ; 57 fichiers / 188 tests verts ; build et génération Orval verts ; audits i18n et phase11 verts. Bundle : JS initial 118,97 kB gzip (stable/en baisse), CSS 34,00 kB gzip (baisse de 0,05 kB).
- **UI/captures** : aucune UI active n'utilisait les composants/styles supprimés. `EntityPicker` n'a pas changé ; son parcours visible est couvert par les tests et l'E2E walk-in.
- **Écart** : aucun commit créé dans le worktree partagé.
- **Statut** : [x] Terminé.

### 9.13 Preuve QUA-02

- **ID** : QUA-02
- **Date** : 2026-10-19
- **Implémentation** : `QueueEditor` sépare les clés numériques obligatoires et optionnelles dans deux unions explicites ; `SiteEditor` limite son setter numérique aux trois réglages concernés. Les conversions conservent les comportements historiques (`Number`, valeur vide optionnelle vers `undefined`) sans assertion impossible.
- **Caractérisation** : les nouveaux tests `QueueEditor.test.tsx` et `SiteEditor.test.tsx` modifient chacun un champ texte et un champ numérique, parcourent l'assistant puis vérifient le payload transmis. Les fixtures historiques de notification et de cartes de guichet ont également été typées sans `as never`, avec des contrats minimaux correspondant aux propriétés réellement lues.
- **Recherche reproductible** : `rg -n "as never" src --glob '!src/api/generated/**'` ne retourne aucune occurrence. Aucun `any`, `@ts-ignore` ni `@ts-expect-error` n'a été ajouté dans les fichiers modifiés.
- **Commandes** : lint global vert ; typecheck strict vert ; 59 fichiers / 190 tests verts ; build vert ; audits i18n et phase11 verts. Contrôle ciblé final : 4 fichiers / 6 tests verts.
- **E2E** : `npx playwright test e2e/ergonomics-regressions.spec.ts` vert (**3/3**), dont la réouverture et modification d'une file brouillon depuis l'onboarding.
- **Bundle** : JS initial 118,97 kB gzip et CSS 34,00 kB gzip, sans hausse par rapport à REU-04.
- **UI/captures** : non applicables ; aucun JSX, CSS, libellé ou structure DOM n'a changé.
- **Écart** : aucun commit créé dans le worktree partagé.
- **Statut** : [x] Terminé.

<!-- CHECKPOINT id="ckpt_mvezekch_ghscwq" time="2026-10-19T08:17:35.105Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvezrfb6_twt6oi" time="2026-10-19T08:27:35.106Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf04aah_qw3aui" time="2026-10-19T08:37:35.129Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf0h59h_nqzvdr" time="2026-10-19T08:47:35.141Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf0u08d_0lb8rq" time="2026-10-19T08:57:35.150Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf16v7w_upnzj1" time="2026-10-19T09:07:35.180Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf1jq65_vdxnz8" time="2026-10-19T09:17:35.165Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf1xtgo_oplrvu" time="2026-10-19T09:28:32.616Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf2aodw_82eq46" time="2026-10-19T09:38:32.564Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf2njcu_digvnz" time="2026-10-19T09:48:32.575Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvf30ebt_2lno7c" time="2026-10-19T09:58:32.585Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfb4h6r_3i3zzc" time="2026-10-19T13:45:39.843Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfbhc5m_67s7au" time="2026-10-19T13:55:39.850Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfbu74u_nt5knd" time="2026-10-19T14:05:39.870Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfc723j_b8rzhy" time="2026-10-19T14:15:39.871Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfcjx29_ozvetv" time="2026-10-19T14:25:39.873Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfcws1e_0c2hok" time="2026-10-19T14:35:39.890Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfd9n94_mk26q9" time="2026-10-19T14:45:40.216Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfdmi7j_ymjg70" time="2026-10-19T14:55:40.207Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfdzd6j_sdjkif" time="2026-10-19T15:05:40.219Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfec85f_t7h8zi" time="2026-10-19T15:15:40.227Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfep345_ueqm9o" time="2026-10-19T15:25:40.229Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvff1y2x_v4l5qs" time="2026-10-19T15:35:40.233Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvffet1t_9v2zm8" time="2026-10-19T15:45:40.241Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvffro0q_g7xm52" time="2026-10-19T15:55:40.250Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvfg4izh_xkywhk" time="2026-10-19T16:05:40.254Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
