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
  - `npm run audit:phase11` : échec, 2 constats (`report-utils.ts`, `remote.ts`).
  - `npx vitest run --coverage` : échec, 1 timeout i18n à 5 s ; relance `--testTimeout=15000` réussie, couverture 53,15 % statements, 40,45 % branches, 38,30 % fonctions, 52,80 % lignes.
  - `npm run test:e2e` : NON VÉRIFIÉ, processus interrompu par le délai d'audit après 184 s sans résultat exploitable.

## 1. Synthèse exécutive

Dorify possède une fondation saine : typage strict, découpage par fonctionnalités, client API généré, cache de requêtes, routes paresseuses, i18n contrôlée et chaîne CI complète. La réutilisation est réelle pour les cartes, modales, en-têtes, états et pagination, mais demeure incomplète pour les boutons, tableaux, champs et recherches temporisées. Deux règles qualité internes échouent actuellement et les très grands composants augmentent le coût de changement. Aucun défaut de sécurité critique n'est démontré dans ce frontend ; les contrôles serveur restent hors périmètre et donc non vérifiés.

- Notes : Réutilisation **6,5/10** ; Architecture **7,5/10** ; Qualité **7/10** ; Sécurité frontend **8/10** ; Accessibilité **7,5/10** ; Performance **7/10** ; Tests **7/10**. Note globale pondérée : **7,2/10**.
- Score de réutilisation estimé : **65 %**. Méthode reproductible : moyenne de l'adoption sur quatre familles comparables : tableaux `1/(1+8)=11 %`, modales `22/(22+0)=100 %`, en-têtes `15/15=100 %`, champs spécialisés exportés et réellement utilisés `2/6=33 %`, soit 61 % ; bonus de 4 points pour les 21 consommateurs de `Card`, 12 de `Pagination`, 13 d'états vide/erreur. Les boutons sont exclus du ratio car aucun composant `Button` n'existe ; les 201 balises natives constituent précisément une opportunité.
- Top 10 : (1) rétablir `audit:phase11`; (2) extraire un `useDebouncedFilter`; (3) créer un `Button`; (4) migrer les huit tableaux métier vers un tableau partagé extensible ; (5) découper les six composants >400 lignes ; (6) centraliser les query keys restantes ; (7) relever et imposer les seuils de couverture ; (8) fiabiliser puis exécuter l'E2E en CI/local ; (9) remplacer les couleurs/mesures CSS répétées par des tokens ; (10) faire auditer API, multi-tenant, cookies/CORS et RGPD dans le dépôt backend.

## 2. Tableau de suivi des constats

| ID | Domaine | Sévérité | Constat | Fichiers:lignes | Action recommandée | Effort | Statut |
|----|---------|----------|---------|-----------------|--------------------|--------|--------|
| REU-01 | Réutilisation | 🟠 Majeur | 8 tableaux métier contournent `DataTable`. | `src/design-system/components/DataTable.tsx:10-47`; `src/features/onboarding/UsersAdminPage.tsx:216-217`; `src/features/onboarding/TranslationsAdminPage.tsx:256-257`; `src/features/persons/PersonsPage.tsx:211-212`; `src/features/onboarding/components/SettingsWorkspace.tsx:190,333`; `src/features/onboarding/components/OnboardingWizard.tsx:656`; `src/features/public-experiences/components/kiosk/KioskWizard.tsx:463`; `src/features/health/HealthPage.tsx:137` | Étendre `DataTable` (actions, responsive, états) puis migrer les listes administratives en premier. | L | [ ] À faire |
| REU-02 | Réutilisation | 🟠 Majeur | La recherche temporisée et son seuil sont réimplémentés au moins 5 fois. | `src/features/onboarding/UsersAdminPage.tsx:66-74`; `src/features/onboarding/TranslationsAdminPage.tsx:58-66`; `src/features/queue-operations/MyQueuesPage.tsx:37-45`; `src/features/users/UserAssignmentModal.tsx:49-57`; `src/features/users/QueueOperatorsModal.tsx:36-39` | Créer `useDebouncedValue/useSearchFilter` avec délai, normalisation et longueur minimale configurables. | M | [ ] À faire |
| REU-03 | Réutilisation | 🟡 Mineur | Aucun `Button` partagé malgré 201 `<button>` applicatifs et plusieurs conventions de classes. | `src/design-system/components/Modal.tsx:40-49,79-86`; `src/features/users/QueueOperatorsModal.tsx:89-104`; `src/app/layouts/Topbar.tsx:63-133` | Créer un `Button` polymorphe (variant, size, pending, icon, label) et migrer progressivement. | L | [ ] À faire |
| REU-04 | Réutilisation | 🟡 Mineur | API partagée morte ou sous-utilisée : `FilterDrawer` 0 usage ; 4 inputs spécialisés 0 usage ; `EntityPicker` 1 usage. | `src/design-system/components/FilterDrawer.tsx:5-34`; `src/design-system/components/FormField.tsx:96-141`; `src/design-system/components/EntityPicker.tsx:3-39` | Supprimer les exports morts ou les adopter avec tests et documentation d'usage. | S | [ ] À faire |
| REU-05 | Design | 🟠 Majeur | 262 lignes contenant une couleur hexadécimale hors `tokens.css`, plus 1 091 lignes CSS contenant une valeur en px et 72 media queries. | `src/design-system/styles/tokens.css:3-43`; `src/design-system/styles/layouts/shell.css:4-26,68-86,309-321`; `src/design-system/styles/print/documents.css:22-36` | Introduire tokens couleur/rayon/espace/breakpoint ; exclure explicitement les contraintes physiques d'impression (`mm`, `pt`). | L | [ ] À faire |
| REU-06 | Granularité | 🟠 Majeur | Plusieurs composants mêlent requêtes, mutations, état et rendu sur 400 à 1 100 lignes. | `src/features/onboarding/components/OnboardingWizard.tsx:1-1100`; `src/features/public-experiences/components/kiosk/KioskWizard.tsx:1-767`; `src/features/appointments/AppointmentActionDialog.tsx:1-551`; `src/features/onboarding/TranslationsAdminPage.tsx:1-513`; `src/features/appointments/AppointmentsPage.tsx:1-483`; `src/features/queue-operations/QuickRegistration.tsx:1-459` | Extraire hooks de contrôleur, sections visuelles et schémas/formateurs ; conserver un orchestrateur mince. | L | [ ] À faire |
| ARC-01 | Architecture | 🟠 Majeur | Des DTO de rapport sont recopiés hors du client généré ; le garde-fou CI le détecte. | `src/features/supervision/report-utils.ts:3-8`; `tools/phase11-audit.mjs:42-46` | Générer/importer les modèles OpenAPI ou renommer en view models explicitement mappés. | M | [ ] À faire |
| ARC-02 | Architecture | 🟡 Mineur | Des query keys ad hoc coexistent avec le catalogue centralisé. | `src/api/client/query-keys.ts:1-114`; `src/features/onboarding/UsersAdminPage.tsx:83-100,112`; `src/features/users/QueueOperatorsModal.tsx:52-67` | Ajouter les clés manquantes au catalogue et utiliser les invalidations centralisées. | S | [ ] À faire |
| QUA-01 | Qualité | 🟠 Majeur | `audit:phase11` échoue aussi sur un `console.warn` de production. | `src/core/i18n/remote.ts:85-93`; `tools/phase11-audit.mjs:52-55` | Injecter un reporter contrôlé ou rendre `onRejected` obligatoire ; garder la télémétrie sans console directe. | S | [ ] À faire |
| QUA-02 | Typage | 🟡 Mineur | Trois assertions `as never` masquent la relation clé/valeur d'éditeurs. | `src/features/queues/QueueEditor.tsx:38-39`; `src/features/onboarding/components/SiteEditor.tsx:71` | Typer les setters par clé (`K extends keyof T`, `T[K]`) ou séparer setters numériques. | S | [ ] À faire |
| SEC-01 | Session | 🟡 Mineur | L'expiration efface tout le stockage de l'origine, pas uniquement les clés Dorify. | `src/core/auth/session-actions.ts:64-73`; `src/core/scope/scope-store.ts:12-13,38-40` | Supprimer seulement les clés possédées ; préserver préférences non sensibles et intégrations partageant l'origine. | S | [ ] À faire |
| SEC-02 | CSP | 🔵 Amélioration | La CSP autorise encore `style-src 'unsafe-inline'`. | `vite.config.ts:35-46` | Évaluer nonce/hash ou extraction complète des styles inline avant retrait. | M | [ ] À faire |
| A11Y-01 | Accessibilité | 🟡 Mineur | L'audit axe existe mais l'E2E complet n'a pas abouti pendant cet audit. | `e2e/visual-layout.spec.ts:470-479`; `playwright.config.ts:3-15` | Stabiliser le serveur Playwright, publier le rapport et bloquer la CI sur violations sérieuses. | M | [ ] À faire |
| PERF-01 | Performance | 🟡 Mineur | Le bundle initial reste à 376,11 kB JS / 118,94 kB gzip malgré le lazy-loading ; aucune limite de budget n'est configurée. | `src/app/App.tsx:19-71`; `vite.config.ts:60-65`; `package.json:6-22` | Ajouter analyse et budget CI ; isoler les dépendances lourdes si le budget mesuré est dépassé. | M | [ ] À faire |
| TST-01 | Tests | 🟠 Majeur | Couverture globale modérée et sans seuil : 53,15 % statements, 40,45 % branches, 38,30 % fonctions ; hooks critiques à 0–18 %. | `vitest.config.ts:4-19`; `src/features/queue-operations/hooks/useQueueOperations.ts:26-151`; `src/features/persons/hooks/usePersons.ts:29-100` | Fixer des seuils progressifs et tester mutations, invalidations, erreurs et courses réseau. | L | [ ] À faire |
| TST-02 | Tests | 🟡 Mineur | Le test d'alignement i18n dépasse parfois le timeout par défaut sous couverture. | `src/core/i18n/i18n.test.ts:5-17`; `vitest.config.ts:4-19` | Précharger/importer directement les catalogues en test ou définir un timeout ciblé documenté. | S | [ ] À faire |

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
7. **Types/schémas** : quatre interfaces `Report*Dto` recopient le contrat API (`report-utils.ts:3-8`), confirmé automatiquement par l'échec de `phase11` (ARC-01). Aucun `any` applicatif ni `@ts-ignore` trouvé ; trois `as never` restent (QUA-02).
8. **Textes/constantes** : l'audit i18n réussit ; les constantes de pagination restent répétées (`UsersAdminPage.tsx:41`, `TranslationsAdminPage.tsx:25`) mais sont locales et explicites. Les seuils de recherche 3/4 et délais 300/350 ms divergent (`UsersAdminPage.tsx:66-72`; `UserAssignmentModal.tsx:49-53`) et doivent devenir des options nommées.
9. **Granularité** : six fichiers dépassent 450 lignes, dont deux dépassent 750 (REU-06). Les plus gros orchestrent données, mutations et rendu ; aucun prop drilling >8 props n'a été démontré sur les composants partagés (`Modal.tsx:6-26` en expose 8).

### 3.2 Normes de code et architecture

- Séparation globalement cohérente par feature, alias `@` configuré (`vite.config.ts:60-65`) et aucun import relatif profond `../../../` trouvé dans `src/`.
- Les pages utilisent TanStack Query et les façades métier, mais ARC-02 fragilise les invalidations. Les routes sont lazy-loadées (`src/app/App.tsx:19-71`).
- Gestion d'erreur centralisée par normalisation HTTP (`src/api/client/http-client.ts:84-112`), notifications et error boundary (`src/app/AppErrorBoundary.tsx:21-77`). Le `catch` du logout est volontairement documenté et garantit le nettoyage local (`src/core/auth/session-actions.ts:55-61`).
- Outillage : lint/typecheck/build/tests unitaires réussissent. La CI annoncée n'est pas verte localement puisque `audit:phase11` échoue sur ARC-01 et QUA-01.
- Dépendances : `npm audit` ne remonte aucune vulnérabilité. Paquets inutilisés, doublons fonctionnels et versions obsolètes : **NON VÉRIFIÉS** par outil spécialisé.

### 3.3 Sécurité SaaS

- Positif : access token uniquement en mémoire (`src/core/auth/access-token.ts:1-12`), refresh avec cookie credentialed et verrou de requête (`src/api/client/http-client.ts:20-24,36-65`), Bearer exclu des routes publiques (`http-client.ts:43-49,75-82`), CSP/referrer (`vite.config.ts:35-55`; `index.html:4-8`), `.env` ignoré (`.gitignore:6-9`). Aucune occurrence de `dangerouslySetInnerHTML`, `innerHTML=` ou `eval(` dans le code auteur.
- Les gardes frontend contrôlent authentification, type utilisateur et permissions (`src/core/permissions/ProtectedRoute.tsx:11-27`) ; le scope actif refuse un identifiant hors périmètre (`src/core/scope/scope-store.ts:15-36`). Ce sont des protections UX, pas une preuve d'autorisation serveur.
- SEC-01 et SEC-02 sont des durcissements, pas des exploits démontrés.
- Auth serveur endpoint par endpoint, isolation multi-tenant, validation serveur, SQL/SSRF/upload, flags exacts du cookie, CORS, rate limiting, suppression/export/consentement RGPD : **NON VÉRIFIÉS**, backend absent.

### 3.4 Accessibilité, UX technique et performance

- `Modal` s'appuie sur Radix et fournit titre/description/fermeture (`src/design-system/components/Modal.tsx:29-53`). `DataTable` fournit caption, scopes et zone scrollable focalisable (`DataTable.tsx:21-46`). `FormField` relie label, aide, erreur et ARIA (`src/design-system/components/FormField.tsx:18-94`).
- Une règle `prefers-reduced-motion` existe (`src/design-system/styles/base.css:22-31`) et les layouts ont des adaptations 900/620 px (`src/design-system/styles/layouts/shell.css:309-321`).
- Axe WCAG 2.2 AA est codé sur quatre thèmes (`e2e/visual-layout.spec.ts:470-485`), mais son résultat de cette exécution demeure non vérifié (A11Y-01). Les contrastes réels et la navigation clavier exhaustive ne peuvent donc pas être certifiés.
- Lazy-loading de toutes les pages (`src/app/App.tsx:19-71`) et pagination partagée (`src/design-system/components/Pagination.tsx:4-34`). PERF-01 recommande un budget mesuré, sans qualifier arbitrairement le bundle d'anormal.
- Les états vides/erreur existent (`src/design-system/components/FeedbackState.tsx:5-42`) mais la couverture à 0 % de ce fichier montre que leur contrat visuel n'est pas protégé.

### 3.5 Tests et maintenabilité

- 174 tests unitaires/intégration réussissent ; 11 specs E2E couvrent session, scope, desk, rendez-vous, kiosk, expériences publiques, smoke, pilotage, ergonomie et layout (`e2e/session.spec.ts:1`; `e2e/scope.spec.ts:1`; `e2e/appointments.spec.ts:1`).
- Couverture mesurée : 53,15/40,45/38,30/52,80 %. Aucun seuil n'est configuré (`vitest.config.ts:4-19`) ; TST-01 cible les hooks à forte valeur.
- La CI est complète (`.github/workflows/ci.yml:1-27`), mais l'E2E local a expiré et un test i18n est sensible à la charge (TST-02).
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

1. Reproduire d'abord `npm run audit:phase11`, corriger ARC-01/QUA-01 dans deux commits séparés, puis exécuter `npm run lint && npm run typecheck && npm test && npm run build`.
2. Pour chaque extraction UI, ajouter un test de contrat avant modification, conserver classes/ARIA/i18n, puis migrer un seul écran à la fois. Ne pas modifier le rendu sans validation visuelle desktop/mobile/RTL/quatre thèmes.
3. Un commit par lot logique ; ne jamais éditer `src/api/generated/` à la main. Toute évolution DTO part de l'OpenAPI et de `npm run api:generate`.
4. Terminé Lot 1 : `audit:phase11`, lint, typecheck, tests, build et E2E verts. Lot 2 : duplications ciblées supprimées et usages inventoriés. Lot 3 : composants <400 lignes ou dérogation motivée, seuils de couverture actifs. Lot 4 : exports morts traités, stockage/CSP/budget documentés.
5. Mettre ce fichier à jour à chaque commit : cocher le statut, dater le journal, ajouter décision et preuve `fichier:lignes`, réviser le score uniquement avec le même calcul.

## 8. Journal des mises à jour

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-10-19 | Codex | Audit exhaustif du frontend, inventaire de réutilisation, contrôles qualité/sécurité/accessibilité/tests, plan de remédiation et résultats de commandes. |
