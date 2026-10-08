# Handover de réalisation — DORI Web

> Document de pilotage vivant — créé le 8 octobre 2026\
> État courant : cadrage complété avec la SFD Front, implémentation non démarrée\
> Convention : `[ ]` à faire, `[-]` en cours, `[x]` terminé, `[!]` bloqué ou dépendant d’une décision externe.

## 1. Rôle de ce document

Ce fichier est la source de suivi de la construction de l’application DORI Web. Toute action de réalisation doit apparaître ici avant son exécution et être cochée une fois terminée et vérifiée. Une case ne peut être cochée que si son critère de validation est satisfait. Les décisions, écarts au contrat, blocages et résultats de vérification seront consignés dans le journal en fin de document.

## 2. Sources analysées et ordre d’autorité

- [ ] Inventorier le dépôt : il contient actuellement `README.md` et le dossier `specifications/`, sans socle applicatif.

- [x] Lire intégralement `final_ihm_specification.md` et relever les exigences fonctionnelles, techniques, UX, sécurité, accessibilité et tests.

- [x] Inspecter `docs-json.json` : contrat OpenAPI 3.0.0 « Dori API 1.0 », 12 domaines API, 60 chemins, 89 opérations et 123 schémas.

- [x] Inspecter `dori_saas_mockup.html` : rendu visuel, navigation par rôle, 15 vues, 10 modales, 6 panneaux de configuration, interactions et tokens visuels.

- [x] Vérifier initialement les fichiers complémentaires et constater que `spec_front.md`, cité par la spécification finale, n’était pas encore présent.

- [x] Lire intégralement le `spec_front.md` ajouté le 8 octobre 2026 et confronter ses exigences aux trois sources prioritaires.

- [x] Intégrer au présent plan les compléments compatibles de `spec_front.md` et documenter les contradictions résolues par l’ordre d’autorité.

Ordre d’autorité à appliquer en cas d’écart :

1. `docs-json.json` pour les routes, paramètres, DTO, réponses et statuts HTTP ;
2. `final_ihm_specification.md` pour les parcours, permissions, états et architecture ;
3. `dori_saas_mockup.html` pour le rendu, la densité, la composition et les interactions ;
4. `spec_front.md` pour le contexte produit et technique additionnel.

Règle : aucune capacité absente du Swagger ne sera présentée comme persistante. Elle sera explicitement identifiée comme locale, dérivée, matérielle ou dépendante d’une évolution API.

### Arbitrages issus de `spec_front.md`

Les compléments compatibles sont conservés : personnalisation par le nom/logo du site, palette de commandes et raccourcis clavier soumis aux permissions, récapitulatif imprimable 80 mm, QR de tracking si le token est fourni par l’API, watchdog kiosque annoncé et prolongeable, effets visuels/audio non indispensables sur l’écran salle, jauge mobile, référence temporelle serveur et tests de prise de relais/fuseaux.

Les éléments suivants sont écartés ou subordonnés aux sources prioritaires :

- les rooms et événements Socket.IO (`subscribe`, `ping_session`, `registration_called`, `translation_cache_invalidated`, etc.) ne seront pas codés sans contrat temps réel versionné ;
- `next`, `served`, `no-show`, reset, prise de relais et clôture ne feront pas l’objet d’une mise à jour optimiste irréversible ; ils attendront la confirmation serveur ;
- le produit garde les quatre thèmes prescrits par la spécification finale, et pas seulement clair/sombre ;
- l’onboarding reste l’assistant final en six étapes, sans création de ticket ni test d’appel fictif à la recette ;
- le catalogue visible reste limité à `free`, `standard`, `premium` et sa création globale n’est pas exposée dans l’administration de site ;
- les routes et la composition des écrans suivent `final_ihm_specification.md`, même lorsque la SFD Front propose d’anciens chemins `/admin/*` ;
- le sélecteur permanent de file proposé dans la SFD ne remplace pas les cartes par file prescrites pour le cockpit final ;
- le simulateur de capacité ne sera envisagé que comme calcul local explicitement identifié et seulement après le périmètre obligatoire.

## 3. Décisions de cadrage initiales

- [x] Retenir une SPA React 18+ avec TypeScript strict et Vite, conformément au socle recommandé et en l’absence de contrainte d’entreprise contraire.

- [x] Retenir une architecture par fonctionnalités avec séparation `app`, `api`, `core`, `design-system`, `features` et `shared`.

- [x] Prévoir React Router, TanStack Query, Zustand limité à l’état client, React Hook Form et des primitives accessibles.

- [x] Prévoir un client et des types générés depuis `docs-json.json`, sans duplication manuelle des DTO.

- [x] Traiter l’authentification, les permissions, le scope et le site courant comme fondations avant les écrans métier.

- [x] Préserver les quatre thèmes et les expériences privée, kiosque, écran salle et tracking public.

- [x] Considérer la maquette comme référence visuelle, mais remplacer toutes ses données et simulations locales par les opérations API prévues.

## 4. Plan d’exécution

### Phase 0 — Initialisation et garde-fous

- [x] Initialiser le projet Vite React TypeScript sans écraser le dossier `specifications/`.

- [x] Configurer TypeScript avec `strict` et `noUncheckedIndexedAccess`.

- [x] Installer et verrouiller les dépendances runtime et de développement nécessaires.

- [x] Configurer ESLint, Prettier, scripts de contrôle et conventions d’import.

- [x] Mettre en place Vitest, Testing Library, MSW et Playwright.

- [x] Créer l’arborescence fonctionnelle prescrite dans `src/`.

- [x] Ajouter les fichiers d’environnement typés et documenter les URL API, sans secret versionné.

- [x] Ajouter une CI minimale : installation reproductible, génération API, lint, typecheck, tests et build.

- [x] Vérifier que le build vierge, le lint, le typecheck et le premier test passent.

Critère de sortie : le projet démarre localement, compile strictement et possède une chaîne de qualité exécutable.

### Phase 1 — Contrat OpenAPI et couche HTTP

- [x] Copier ou référencer le Swagger de manière reproductible depuis `specifications/docs-json.json`.

- [x] Configurer Orval, ou un générateur équivalent, vers `src/api/generated/`.

- [x] Générer les types, clients, hooks TanStack Query et mocks sans modifier le résultat à la main.

- [x] Ajouter une vérification CI qui échoue si une régénération produit un diff.

- [x] Implémenter le client HTTP personnalisé : URL de base, bearer token en mémoire et en-têtes communs.

- [x] Implémenter la rotation atomique du refresh token avec une seule promesse concurrente.

- [x] Implémenter la propagation du correlation ID sans journaliser de PII.

- [x] Normaliser les erreurs vers `{ code, translationKey, translationParams, data }`.

- [x] Centraliser les query keys par domaine et la sérialisation des filtres/paginations.

- [x] Tester la génération, le refresh concurrent, les erreurs 401/403/409 et les paramètres vides.

Critère de sortie : tous les échanges serveur passent par une couche typée, testée et générée depuis le contrat livré.

### Phase 2 — Fondations transverses

- [x] Mettre en place les providers : router, query client, session, i18n, thème et gestion globale des erreurs.

- [x] Implémenter le store de session, le site courant, les préférences et la purge au logout/changement de site.

- [x] Implémenter `GET /auth/me`, les route guards, `PermissionGuard`/`Can` et les contrôles de scope.

- [x] Calculer l’écran d’arrivée à partir des permissions réelles, sans dépendre du seul nom de rôle.

- [x] Implémenter l’i18n sans chaîne visible codée en dur, avec fallback critique embarqué.

- [x] Charger et mettre en cache les bundles de traduction par locale, catégorie et version.

- [x] Gérer RTL, dates dans le fuseau du site, devises ISO et pluriels.

- [x] Implémenter les quatre thèmes et leur préférence locale persistée.

- [x] Appliquer le white-label autorisé à partir du nom et du logo de site réellement fournis par l’API, avec fallback DORI.

- [x] Créer l’interface `RealtimeGateway`, avec snapshot REST et polling contrôlé tant qu’aucun contrat WebSocket versionné n’est fourni.

- [x] Ajouter les Error Boundaries et les états réseau communs : chargement, vide, erreur, interdit, retry et conflit.

Critère de sortie : session, autorisations, contexte, thème, i18n, erreurs et temps réel sont disponibles à toutes les fonctionnalités.

### Phase 3 — Design system et shell

- [x] Extraire de la maquette les tokens de couleur, espacements, rayons, ombres, typographie et breakpoints.

- [x] Construire `AppShell`, `SidebarAccordion`, `Topbar` et `SiteContextSwitcher`.

- [x] Reproduire le menu accordéon : une section ouverte, catégories sans droit masquées et lien légal ancré en bas.

- [x] Construire `PageHeader`, `Card`, `MetricCard`, `StatusBadge`, `EmptyState` et `ErrorState`.

- [x] Construire `DataTable`, `Pagination`, `FilterDrawer` et les résumés de filtres.

- [x] Construire `Modal`, `WizardModal` et `ConfirmDialog` avec focus piégé et restitué.

- [x] Construire les champs partagés : `FormField`, marque requise, téléphone E.164, date, heure et devise.

- [x] Construire `EntityPicker`, `ThemeSwitcher` et `LocaleSwitcher`.

- [x] Construire une palette de commandes et des raccourcis clavier guichet, filtrés par permissions et inactifs dans les champs de saisie.

- [x] Implémenter les layouts publics : connexion, kiosque, TV, tracking et légal.

- [x] Valider clavier, focus visible, contrastes, reduced motion, cibles tactiles et responsive.

Critère de sortie : toutes les pages peuvent être composées avec des primitives cohérentes, accessibles et conformes à la maquette.

### Phase 4 — Authentification, profil et contexte de site

- [x] Réaliser `/login` avec login, hydratation `/auth/me`, refresh, logout et mémorisation locale non sensible.

- [x] Désactiver l’oubli de mot de passe tant qu’aucun endpoint ne l’expose.

- [x] Forcer le changement de mot de passe lorsque `mustChangePassword` est actif.

- [x] Réaliser `/profile` en page complète avec seuls email et langue modifiables via `UpdateUserDto`.

- [x] Réaliser `/portfolio` avec sites autorisés, synthèses et activation du contexte.

- [x] Masquer le sélecteur pour un utilisateur mono-site.

- [x] Purger et recharger toutes les queries dépendantes lors d’un changement de site.

- [x] Tester login/refresh/logout, changement imposé, droits, mono-site et multi-sites.

Critère de sortie : un utilisateur authentifié accède uniquement aux routes/actions de son scope et travaille dans un unique site actif.

### Phase 5 — Opérations de file

- [x] Réaliser `/desk` : prochains éligibles, prise en charge et une carte guichet par file autorisée.

- [x] Implémenter occupation, consultation seule, reprise confirmée et libération de session.

- [x] Bloquer tout appel sans session active et tout second appel pendant une prise en charge.

- [x] Implémenter appel suivant, servi, absent, ancienneté, SLA, notes et quatre derniers appels.

- [x] Proposer après clôture un récapitulatif local imprimable au format 80 mm, uniquement avec les données confirmées par l’API et sans valeur fiscale.

- [x] Construire `PersonPickerOrCreate` partagé.

- [x] Réaliser l’accueil rapide personne connue/nouvelle, walk-in/RDV et création du ticket après confirmation serveur.

- [x] Réaliser `/my-queues` avec filtres, pagination, positions, SLA, forfait et indicateur de notes.

- [x] Construire `PersonNotesViewer` : une note à la fois, récente par défaut, navigation et ajout séparé.

- [x] Tester les conflits 409, mutations non optimistes irréversibles et verrouillage inter-files.

Critère de sortie : le cycle opérateur complet fonctionne contre l’API et respecte les invariants de session et de prise en charge.

### Phase 6 — Rendez-vous

- [ ] Réaliser `/appointments` avec vues semaine et mois couvrant les horaires effectifs et la pause.

- [ ] Charger inscriptions, détails et disponibilités depuis les endpoints dédiés.

- [ ] Construire `AppointmentEditor` avec personne existante/nouvelle, file, forfait, date et créneau.

- [ ] Préremplir date/heure depuis un emplacement vide et la date depuis un jour mensuel.

- [ ] Construire `AppointmentActionDialog` pour reprogrammer, annuler, modifier forfait/langue et check-in.

- [ ] Afficher le check-in uniquement pour un rendez-vous du jour dans un état compatible.

- [ ] Recharger les disponibilités sur conflit de créneau.

- [ ] Tester création, reprogrammation, annulation, édition et check-in.

Critère de sortie : le planning ne montre que des données API et tous les parcours de rendez-vous prioritaires sont couverts.

### Phase 7 — Supervision, rapports et notifications

- [ ] Réaliser `/control-room` avec charge, guichets, sessions, SLA dérivé, notifications et reset confirmé.

- [ ] Réaliser `/reports` avec filtres, KPI réels et graphiques alimentés uniquement par l’API.

- [ ] Ajouter éventuellement un export CSV local clairement identifié comme tel.

- [ ] Réaliser `/notifications` avec journal paginé, filtres repliés, destinataires masqués et détail.

- [ ] Construire l’assistant d’envoi manuel en deux étapes à partir d’une personne puis d’une inscription.

- [ ] Conserver le brouillon lors du retour d’étape et actualiser le journal après mise en file.

- [ ] Implémenter la réémission uniquement pour les droits et statuts compatibles.

- [ ] Tester reset, calculs SLA, KPI, envoi manuel et réémission.

Critère de sortie : les managers disposent des vues de pilotage prévues sans métrique ou capacité serveur inventée.

### Phase 8 — Expériences publiques et appareil

- [ ] Réaliser `/kiosk` sans navigation SaaS, avec compte technique limité à un site.

- [ ] Implémenter le parcours walk-in kiosque, forfaits, inscription, résultat et impression locale facultative.

- [ ] Implémenter la recherche et le check-in de rendez-vous kiosque sans proposer d’annulation.

- [ ] Purger toutes les données kiosque à la fin et après timeout.

- [ ] Implémenter un watchdog kiosque annoncé, prolongeable et configurable, sans persistance locale des données personnelles.

- [ ] Afficher et imprimer un QR de tracking uniquement lorsque l’API fournit un token ou un lien opaque approprié.

- [ ] Réaliser `/display` en 16:9 sans scroll, avec snapshot et rafraîchissement via `RealtimeGateway`.

- [ ] Garantir qu’un affichage public ne contient aucune PII ; réserver les noms à l’aperçu interne autorisé.

- [ ] Ajouter l’effet d’appel, le carillon Web Audio et la synthèse vocale locale avec réglage, fallback visuel et respect de `prefers-reduced-motion`.

- [ ] Réaliser `/track` par token opaque avec uniquement ticket, file, position, attente, statut et guichet.

- [ ] Ajouter une jauge de progression accessible fondée uniquement sur la position et l’estimation renvoyées par l’API.

- [ ] Protéger le token de tracking des logs, analytics et referers.

- [ ] Ajouter vibration/son/animation uniquement après consentement navigateur.

- [ ] Tester les surfaces à 1080p/4K, sur mobile, en RTL et dans les quatre thèmes.

Critère de sortie : les trois expériences spécialisées fonctionnent sans fuite de données personnelles.

### Phase 9 — Onboarding et administration

- [ ] Réaliser `/onboarding` en six étapes, réservé Root/Admin et reprenable sans recréer les ressources confirmées.

- [ ] Implémenter création du site et valeurs par défaut.

- [ ] Construire `QueueEditor` partagé création/édition avec héritages et surcharges explicites.

- [ ] Implémenter files, guichets et origines de configuration retournées par l’API.

- [ ] Implémenter les associations de forfaits fixes Gratuit, Standard et Premium par file.

- [ ] Construire `UserAccountWizard` partagé avec rôle, site, files et appareils kiosque.

- [ ] Implémenter la checklist finale et l’activation/désactivation réelle du site.

- [ ] Réaliser `/settings/sites` avec CRUD et gestion des managers.

- [ ] Réaliser `/settings/queues` avec CRUD et gestion des opérateurs.

- [ ] Réaliser `/settings/users` avec création, email/langue, état, mot de passe, rôles et anti-escalade.

- [ ] Réaliser `/settings/tiers` avec associations et règles autorisées selon Gratuit/Standard/Premium.

- [ ] Réaliser `/settings/notifications` avec aperçu SMS local et règles persistées par forfait/file.

- [ ] Réaliser `/settings/translations`, réservé Root/Admin, avec catégories et paramètres attendus.

- [ ] Tester l’onboarding complet, la reprise après erreur, l’héritage et toutes les restrictions de rang.

Critère de sortie : Root/Admin peuvent créer et administrer un site avec les mêmes composants et contrats que le reste du produit.

### Phase 10 — Santé et contenu légal

- [ ] Réaliser `/health`, réservé Root/Admin, avec uniquement les données de `HealthResponseDto`.

- [ ] Ajouter rafraîchissement manuel et périodique raisonnable.

- [ ] Réaliser `/legal` comme page publique traduisible, accessible avant/après connexion, depuis kiosque et tracking.

- [ ] Restaurer exactement le contexte d’origine au retour de la page légale.

- [ ] Rendre les coordonnées légales configurables par environnement/build.

- [ ] Ajouter un contrôle bloquant de production contre les valeurs légales fictives.

Critère de sortie : santé et obligations légales sont présentes sans inventer d’informations absentes du contrat.

### Phase 11 — Durcissement et recette finale

- [ ] Vérifier qu’aucun appel HTTP ne se trouve dans un composant de page.

- [ ] Vérifier qu’aucun DTO Swagger n’est copié manuellement et qu’aucun `any` n’est présent.

- [ ] Vérifier qu’aucune chaîne visible ne reste codée en dur dans les composants.

- [ ] Vérifier CSP, rendu texte des contenus non fiables, dépendances verrouillées et audit de sécurité.

- [ ] Vérifier l’absence de PII/secrets dans logs, erreurs, analytics, URLs et fixtures publiques.

- [ ] Vérifier que toute durée métier utilise un timestamp/une horloge serveur disponible et s’affiche dans le fuseau IANA du site.

- [ ] Exécuter les tests unitaires, composants et contractuels prévus par la spécification.

- [ ] Exécuter les 12 parcours E2E prioritaires listés dans la spécification finale.

- [ ] Exécuter les tests visuels desktop, tablette, mobile et TV pour les quatre thèmes.

- [ ] Auditer WCAG 2.2 AA, clavier, focus, contrastes, lecteurs d’écran et reduced motion.

- [ ] Mesurer le build, le lazy loading par route et les performances des listes volumineuses.

- [ ] Comparer les captures finales à `dori_saas_mockup.html` et documenter les écarts justifiés.

- [ ] Produire la documentation de démarrage, configuration, génération API, tests et déploiement.

- [ ] Effectuer une recette finale contre la définition de fini de la section 14.

Critère de sortie : toutes les cases de la définition de fini sont démontrées par un contrôle automatisé ou une preuve de recette consignée.

## 5. Dépendances, risques et éléments hors périmètre

- [!] Obtenir un contrat WebSocket versionné avant d’implémenter des noms de rooms ou d’événements ; utiliser snapshots REST et polling d’ici là.
- [!] Confirmer la stratégie de stockage du refresh token avec le déploiement API ; préférer un cookie HttpOnly lorsque possible.
- [!] Obtenir les mentions légales réelles avant toute recette de production.
- [!] Ne pas exposer : récupération de mot de passe par email, export serveur, paiement, transfert interfile, pause conservant un poste, création libre de forfaits, test d’appel d’onboarding ou santé non fournie.

## 6. Journal d’avancement

### 2026-10-08 — Cadrage initial

- Analyse des trois fichiers présents dans `specifications/` terminée.
- Le dépôt ne contient encore aucun code applicatif ni manifeste de dépendances.
- Le plan de réalisation a été ordonné par dépendances : socle et contrat, fondations, design system, fonctionnalités métier, surfaces publiques, administration, puis durcissement.
- Aucune implémentation applicative n’a été lancée pendant cette étape, conformément à la demande de commencer par le plan.

### 2026-10-08 — Intégration de la SFD Front

- `spec_front.md` a été ajouté puis lu intégralement.
- Les compléments compatibles ont enrichi les phases Fondations, Design system, Opérations, Expériences publiques et Recette.
- Les contradictions ont été arbitrées selon l’ordre d’autorité, sans modifier le contrat fonctionnel final.
- La dépendance signalant l’absence de `spec_front.md` a été levée.

### 2026-10-08 — Phase 0, socle applicatif

- Projet Vite/React/TypeScript initialisé avec dépendances verrouillées dans `package-lock.json`.
- TypeScript strict, alias d’import, ESLint typé, Prettier et environnement Vite typé configurés.
- Arborescence fonctionnelle créée pour l’API, le cœur, le design system, les fonctionnalités et les utilitaires partagés.
- Vitest, Testing Library et MSW sont opérationnels ; le premier test composant passe.
- Playwright et Chromium sont installés ; le test E2E de fumée passe.
- Contrôles réussis : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check` et `npm run test:e2e`.
- La case CI était restée ouverte à ce stade, dans l’attente de la génération OpenAPI reproductible de la phase 1 ; elle est désormais résolue ci-dessous.

### 2026-10-08 — Phase 1, contrat OpenAPI et transport HTTP

- Orval 8.40.0 sécurisé et Node 22.18+ configurés ; `npm audit` ne signale aucune vulnérabilité.
- Le Swagger local est la source reproductible de 438 fichiers générés : modèles, clients par tag, hooks TanStack Query et handlers MSW.
- Une normalisation d’entrée documentée corrige uniquement les types `nullable` incohérents du Swagger sans modifier le contrat source ni le code généré.
- Deux générations successives produisent des empreintes identiques ; la CI exécute `api:check` et refuse un diff généré non commité.
- Le client Axios gère URL, cookies, bearer token en mémoire, correlation ID et refresh atomique partagé entre requêtes concurrentes.
- Les erreurs sont converties en `NormalizedApiError` traduisible, avec statut et correlation ID non sensible.
- Les query keys et la sérialisation des filtres sont centralisées.
- Tests validés : refresh concurrent unique, rejeu authentifié, erreurs 403/409, correlation ID et omission des filtres vides.

### 2026-10-08 — Phase 2, fondations transverses

- Providers React Router, TanStack Query, i18next, préférences et Error Boundary globale installés.
- Stores Zustand séparés pour session, scope actif, préférences persistées et identité visuelle du site.
- Hydratation `/auth/me`, purge des données au logout/changement de site et chargement du white-label depuis le site actif implémentés.
- Autorisations centralisées avec gardes de routes, composant `Can`, contrôle site/file et écran d’arrivée calculé depuis les permissions effectives.
- Fallbacks critiques FR/EN/AR, bundles distants versionnés, RTL et formatages date/devise/pluriel disponibles.
- Cycle complet clair, clair intermédiaire, sombre intermédiaire et sombre appliqué par tokens CSS.
- `RealtimeGateway` abstrait avec snapshots REST, polling contrôlé et déduplication des rafraîchissements concurrents.
- Error Boundary fonctionnelle et états partagés chargement, succès, vide, erreur, interdit, conflit et retry disponibles.
- Validation réussie : 9 fichiers de tests, 13 tests, lint strict, typecheck et build de production.

### 2026-10-08 — Phase 3, design system et shell

- Tokens visuels, quatre thèmes, responsive, focus visible, reduced motion et cibles tactiles consolidés dans le socle CSS.
- Shell authentifié composé du menu accordéon RBAC, de la barre supérieure, du contexte de site et des accès légaux.
- Primitives de page, cartes, métriques, statuts, états de feedback, table, pagination, filtres, dialogues, formulaires et sélecteurs livrées.
- Palette de commandes et raccourcis guichet filtrés par permissions, avec neutralisation dans les champs de saisie.
- Layouts publics dédiés à la connexion, au kiosque, à l’affichage TV, au suivi et aux mentions légales.
- Les tests ont détecté puis permis de corriger le verrouillage de l’accordéon sur la catégorie de la route active.
- Validation réussie : 10 fichiers de tests, 16 tests, lint strict, typecheck, build de production et smoke test Chromium Playwright.

### 2026-10-08 — Phase 4, authentification, profil et contexte de site

- Connexion réelle via l’API, access token en mémoire, refresh par cookie HttpOnly et hydratation de l’identité complète via `/auth/me`.
- Seul l’identifiant explicitement mémorisé est conservé localement ; aucun mot de passe ni refresh token n’est persisté côté navigateur.
- Déconnexion serveur tolérante aux erreurs suivie de la purge systématique des stores et caches.
- Changement de mot de passe obligatoire imposé par le routeur lorsque `mustChangePassword` est actif.
- Profil complet en lecture seule pour l’identité, les rôles et le scope ; seuls email et langue sont envoyés via `UpdateUserDto`.
- Portefeuille filtré sur les sites autorisés, activation d’un contexte unique, purge des queries et identité visuelle rechargée.
- Sélecteur masqué en mono-site et alimenté par les noms API en multi-sites.
- Validation réussie : 11 fichiers de tests, 19 tests, lint strict, typecheck, Prettier, build de production et smoke test Chromium Playwright.

### 2026-10-08 — Phase 5, opérations de file

- Cockpit `/desk` relié aux previews, statuts, sessions, appels et clôtures servis/absents de l’API.
- Sessions actives, consultation seule, reprise explicite d’un guichet occupé et libération protégée pendant une prise en charge.
- Verrou global d’opérateur : aucun appel sans session active et aucun second appel sur une autre file pendant un traitement.
- Ancienneté, SLA, notes et historique local borné aux quatre derniers appels confirmés.
- Récapitulatif post-traitement imprimable en 80 mm, clairement non fiscal et constitué uniquement des données confirmées.
- Accueil rapide avec personne existante ou nouvelle, forfait, walk-in/RDV, vérification des disponibilités et ticket affiché après réponse serveur.
- `/my-queues` paginé et filtrable avec position, file, personne, type, ancienneté/SLA, forfait et présence de notes.
- `PersonNotesViewer` paginé logiquement, note la plus récente par défaut, navigation et mode d’ajout séparé.
- Tests dédiés aux conflits 409, à l’absence de mutation optimiste irréversible, au verrou inter-files et à la limite des quatre appels.
- Validation réussie : 13 fichiers de tests, 23 tests, lint strict, typecheck, Prettier, build de production et smoke test Chromium Playwright.

<!-- CHECKPOINT id="ckpt_muyogqn5_4oa4j9" time="2026-10-07T22:27:01.985Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muyotlls_b8ljng" time="2026-10-07T22:37:01.984Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muyp6gky_mdqgk1" time="2026-10-07T22:47:02.002Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muyrgpji_pssdfp" time="2026-10-07T23:50:59.406Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muyrtki4_w4buon" time="2026-10-08T00:00:59.404Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muys6fgw_azvc8b" time="2026-10-08T00:10:59.408Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muysjah7_nnbl5h" time="2026-10-08T00:20:59.467Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muyul5xp_ii42q9" time="2026-10-08T01:18:26.125Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muyyzypc_hykgbr" time="2026-10-08T03:21:55.056Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz1ia8a_4tgwap" time="2026-10-08T04:32:09.034Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz3djvh_0re5v4" time="2026-10-08T05:24:27.485Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz52cps_z2hnn1" time="2026-10-08T06:11:44.224Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz740sg_s45mr8" time="2026-10-08T07:09:01.312Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz7gvri_3jvaub" time="2026-10-08T07:19:01.326Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz7tqqm_gqizhw" time="2026-10-08T07:29:01.342Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz86lq4_kmtl77" time="2026-10-08T07:39:01.372Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz8jgp1_lr089s" time="2026-10-08T07:49:01.381Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz8wbo3_887pd8" time="2026-10-08T07:59:01.395Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz996n0_5wb8bn" time="2026-10-08T08:09:01.404Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz9m1lx_1e2l8o" time="2026-10-08T08:19:01.413Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muz9ywky_ekqi4k" time="2026-10-08T08:29:01.426Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muzabrjw_4wyln7" time="2026-10-08T08:39:01.436Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_muzaomit_9mvp2o" time="2026-10-08T08:49:01.445Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
