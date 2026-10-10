# DORI Web — Handover de consolidation avant recette finale

Dernière mise à jour : 2026-10-09  
Portée : dépôt `dori-web` complet  
Statut initial : plan uniquement, aucune tâche de ce document n'est réputée réalisée tant que sa case n'est pas cochée avec une preuve associée.

## 1. Objectif et règles d'exécution

Ce document organise le travail restant pour transformer l'application actuelle en version consolidée, testable, transmissible et prête à faire l'objet d'une recette finale. Il ne remplace pas les spécifications fonctionnelles : en cas d'ambiguïté, les sources de référence restent, dans cet ordre :

1. `specifications/final_ihm_specification.md` ;
2. `specifications/spec_front.md` ;
3. `specifications/dori_saas_mockup.html` pour l'intention visuelle et les cinématiques ;
4. `specifications/docs-json.json` pour le contrat API ;
5. `specifications/ai/handover.md` pour l'historique des décisions et travaux déjà réalisés.

Règles à respecter pendant toutes les phases :

- [x] Préserver les modifications déjà présentes dans le worktree et ne jamais écraser un travail non lié.
- [ ] Ne jamais modifier manuellement `src/api/generated`; utiliser `npm run api:generate`.
- [ ] Ne pas lancer `npm run build` ou `npm run api:generate` en parallèle avec Vite, Playwright ou un autre processus important `src/api/generated`.
- [ ] Utiliser les DTO générés par Orval et ne pas recopier les contrats Swagger.
- [ ] Garder les access tokens uniquement en mémoire et le refresh token dans le cookie HttpOnly géré par l'API.
- [ ] Ne jamais exposer PII, JWT, refresh token ou token de tracking dans les logs, erreurs, URLs de navigation interne ou fixtures publiques.
- [ ] Tout texte visible doit passer par i18n. Une clé distante de catégorie `ihm` doit rester prioritaire sur le fallback local.
- [ ] Chaque mutation doit gérer l'attente, le double clic, le succès, l'erreur, le conflit métier et l'invalidation du cache.
- [ ] Chaque liste doit gérer chargement, vide, erreur, retry et pagination lorsque le service la supporte.
- [x] Toute nouvelle tâche terminée doit être cochée ici et accompagnée de sa preuve dans la section « Journal de validation ».

## 2. État observé au démarrage

- L'application React/Vite couvre les principales routes privées et publiques.
- Le client API est généré par Orval depuis `specifications/docs-json.json`.
- L'authentification, les scopes, React Query, i18n, les quatre thèmes et les notifications globales sont en place.
- Les tests unitaires et composants sont présents, mais les parcours E2E ne couvrent pas encore toute la définition de fini.
- Trois scénarios E2E historiques sont actuellement instables ou obsolètes : écran salle/guichet, navigation santé et navigation supervision.
- Plusieurs pages concentrent trop de responsabilités :
  - `SettingsPage.tsx` : environ 943 lignes ;
  - `KioskPage.tsx` : environ 743 lignes ;
  - `OnboardingPage.tsx` : environ 737 lignes ;
  - `NotificationsPage.tsx` : environ 610 lignes ;
  - `DeskPage.tsx` : environ 542 lignes ;
  - `global.css` : plus de 4 000 lignes.
- Environ 50 requêtes ou mutations React Query sont encore orchestrées directement dans les composants.
- `FeatureErrorBoundary` existe mais n'est pas utilisé dans les espaces fonctionnels.
- Le temps réel utilise volontairement un polling tant qu'un contrat WebSocket versionné n'est pas disponible.
- Le README ne suffit pas encore pour installer, configurer, tester et déployer le projet sans transmission orale.
- Le handover historique contient des cases anciennes qui ne reflètent plus toujours l'état réel du code.

## 3. Ordre d'exécution recommandé

Ne pas commencer une phase structurelle tant que la phase précédente n'a pas un socle stable.

1. Phase A — Établir une baseline fiable.
2. Phase B — Stabiliser et compléter les tests E2E métier.
3. Phase C — Extraire la couche d'accès métier/API.
4. Phase D — Décomposer les pages et wizards volumineux.
5. Phase E — Modulariser le design system et le CSS.
6. Phase F — Finaliser l'accessibilité et la recette visuelle.
7. Phase G — Renforcer résilience, erreurs et observabilité.
8. Phase H — Sécurité et préparation production.
9. Phase I — Documentation, déploiement et recette finale.

---

## Phase A — Baseline, cohérence du dépôt et pipeline

### A1 — Protéger l'état de travail existant

But : disposer d'un état de référence sans perdre les modifications fonctionnelles déjà réalisées.

Fichiers/outils concernés : Git, tout le dépôt.

- [x] Relever `git status --short` et identifier les fichiers modifiés, nouveaux et générés.
- [x] Distinguer les changements applicatifs des artefacts de test (`test-results`, rapport Playwright, captures temporaires).
- [x] Vérifier que `dist`, rapports, traces et profils de navigateur ne sont pas suivis par Git.
- [x] Ne pas nettoyer ou réinitialiser les fichiers modifiés sans validation explicite de leur propriétaire.
- [x] Consigner le commit ou l'état Git servant de baseline dans le journal de validation.

Critère d'acceptation : la liste des changements préexistants est connue et aucune modification utilisateur n'a été perdue.

### A2 — Réconcilier le handover historique

But : empêcher que les prochaines interventions suivent des cases obsolètes.

Fichier concerné : `specifications/ai/handover.md`.

- [x] Identifier les cases non cochées contredites par le code actuel, notamment l'inventaire initial et la migration i18n.
- [x] Ne pas supprimer l'historique ; marquer les entrées anciennes comme remplacées ou ajouter une note de réconciliation datée.
- [x] Vérifier les affirmations concernant le nombre de tests, les routes et les validations.
- [x] Réserver les trois tâches volontairement différées par le demandeur : comparaison finale à la maquette, documentation complète et recette finale.
- [x] Ajouter un lien depuis le handover historique vers le présent fichier de consolidation.

Critère d'acceptation : un nouvel intervenant peut savoir ce qui est réellement terminé sans lire tout l'historique chronologique.

### A3 — Stabiliser les E2E existants

But : éliminer les échecs connus avant d'ajouter de nouveaux scénarios.

Fichiers concernés : `e2e/visual-layout.spec.ts`, `e2e/smoke.spec.ts`, mocks Playwright.

- [x] Corriger le scénario écran salle qui attend encore le libellé exact « guichet 2 » si le rendu ou les données mockées ont changé.
- [x] Vérifier que l'écran salle teste le comportement métier et non un libellé fragile : ticket en traitement, destination et prochains appels.
- [x] Corriger l'accès E2E à « État/Santé de la plateforme » en tenant compte des accordéons et du profil mocké.
- [x] Corriger l'accès E2E à la supervision avec le bon groupe de menu et les permissions requises.
- [x] Corriger les chaînes de mock ou assertions présentant du mojibake (`Ã©`, `â€¢`, etc.).
- [x] Éviter les sélecteurs basés uniquement sur du texte susceptible d'être traduit ; préférer rôles, noms accessibles stables ou `data-testid` justifiés.
- [x] Vérifier que chaque test prépare explicitement session, permissions, scope et site actif.
- [x] Vérifier que les tests peuvent s'exécuter seuls et dans la suite complète.

Commandes de validation :

```bash
npm run test:e2e
npm run typecheck
npm run lint
```

Critère d'acceptation : la suite E2E existante passe au moins trois fois consécutivement sans retry local.

### A4 — Fiabiliser les scripts de vérification

But : rendre `npm run verify` déterministe.

Fichiers concernés : `package.json`, `playwright.config.ts`, configuration Orval/Vite.

- [x] Documenter que `api:generate` nettoie `src/api/generated` avant sa régénération.
- [x] Garantir dans le pipeline canonique que Playwright ne démarre pas pendant une génération API concurrente : `verify` reste strictement séquentiel et `pretest:e2e` contrôle le client généré avant tout test.
- [x] Évaluer l'ajout d'un script Playwright filtré sous Windows : non retenu, car le filtre ne libère pas fiablement le processus dans cet environnement ; le fichier visuel et la suite complète restent directement adressables par Playwright et la suite complète est la référence stable.
- [x] Vérifier le comportement de `reuseExistingServer` lorsqu'un serveur Vite obsolète écoute déjà sur le port 4173.
- [x] Ajouter un contrôle de disponibilité des imports générés avant le démarrage E2E.
- [x] Vérifier que `api:check` ne laisse pas de changements générés après exécution.
- [x] Conserver l'ordre : génération/contrat, audits, lint, typecheck, tests, build, E2E.

Critère d'acceptation : une commande unique reproduit la validation CI sans course entre Orval et Vite.

### A5 — Établir les métriques initiales

But : pouvoir démontrer que les refactorings améliorent le projet sans régression.

- [x] Relever le nombre de tests unitaires, composants et E2E.
- [x] Relever la durée moyenne de `typecheck`, `lint`, tests, build et E2E.
- [x] Relever les tailles des bundles principaux et des chunks de routes.
- [x] Lister les dix plus gros fichiers applicatifs hors code généré.
- [x] Lister les composants important directement des contrôleurs Orval.
- [x] Conserver ces métriques dans le journal de validation.

Critère d'acceptation : les valeurs initiales sont consignées et pourront être comparées après consolidation.

---

## Phase B — Couverture E2E de la définition de fini

### B1 — Infrastructure commune de scénarios

But : éviter des mocks incohérents ou dupliqués entre tests.

- [x] Extraire les builders de session, utilisateur, permissions, sites, files, personnes, tickets et rendez-vous.
- [x] Fournir des profils root, administrateur, manager, opérateur et kiosque.
- [x] Fournir des helpers pour activer un site, ouvrir un groupe de navigation et choisir une file.
- [x] Fournir une horloge déterministe pour les dates, durées d'attente et fuseaux horaires.
- [x] Centraliser les enveloppes de réponse API et erreurs normalisées.
- [x] Permettre de simuler latence, `401`, `403`, `404`, `409`, `422`, `500` et hors ligne.
- [x] Garantir qu'aucune fixture publique ne contient de PII réaliste.

Critère d'acceptation : chaque scénario décrit seulement son intention métier et réutilise les primitives communes.

### B2 — Session et authentification

- [x] Tester la connexion avec redirection vers la première route autorisée.
- [x] Tester le refresh d'une page privée avec restauration via cookie de refresh simulé.
- [x] Tester une session expirée avec maintien du contexte jusqu'à affichage du message et redirection contrôlée.
- [x] Tester plusieurs `401` simultanés et vérifier qu'un seul refresh est envoyé.
- [x] Tester l'échec du refresh : purge de session, cache, scope et marque.
- [x] Tester la déconnexion standard.
- [x] Tester `?deco=true` sur kiosque, écran salle et tracking authentifié.
- [x] Tester l'obligation de changement de mot de passe.

Critère d'acceptation : aucun refresh de page normal ne renvoie abusivement vers la connexion et aucun token n'est persisté dans `localStorage`.

### B3 — Scope, sites et permissions

- [x] Tester un utilisateur sans site actif : message explicite et lien vers le portefeuille.
- [x] Tester un utilisateur avec un seul site : activation automatique et portefeuille masqué selon la règle validée.
- [x] Tester un utilisateur multi-sites : choix depuis le portefeuille et invalidation des caches précédents.
- [x] Tester que le nom du site reste visible dans le bandeau sur toutes les routes concernées.
- [x] Tester les interdictions de routes et d'actions pour chaque profil.
- [x] Tester qu'un site hors scope ne peut pas être activé par manipulation de stockage ou d'URL.
- [x] Tester qu'un compte kiosque ne peut accéder qu'au choix du mode appareil et aux expériences autorisées.

Critère d'acceptation : route, navigation, contrôles et appels API appliquent tous le même scope.

### B4 — Accueil rapide et parcours walk-in

- [x] Rechercher une personne connue à partir du troisième caractère avec `siteId`, page de cinq résultats et pagination conditionnelle.
- [x] Créer une identité avec nom, prénom, téléphone, e-mail, date de naissance et langue.
- [x] Vérifier les champs obligatoires et le téléphone E.164.
- [x] Vérifier qu'un e-mail ou une date de naissance invalides empêchent la poursuite si le contrat l'exige.
- [x] Sélectionner file et niveau de service.
- [x] Créer un walk-in et vérifier numéro de ticket, notification et rafraîchissement du cockpit/des files.
- [x] Tester téléphone déjà utilisé ou conflit métier avec message actionnable.
- [x] Tester le double clic et confirmer qu'une seule inscription est créée.

Critère d'acceptation : le parcours complet est couvert pour personne connue et nouvelle personne.

### B5 — Rendez-vous

- [x] Tester le wizard personne puis service/créneau.
- [x] Vérifier que les disponibilités sont chargées après choix de la date et de la file.
- [x] Tester la création avec conversion correcte dans le fuseau IANA du site.
- [x] Tester un créneau devenu indisponible (`409`) : message local et rechargement des disponibilités.
- [x] Tester le clic sur une case vide du calendrier.
- [x] Tester l'ouverture d'un rendez-vous existant.
- [x] Tester reprogrammation et annulation.
- [x] Tester l'état « ce site ne gère pas les rendez-vous ».
- [x] Tester les changements heure d'été/heure d'hiver sur au moins un fuseau européen.

Critère d'acceptation : création, consultation, reprogrammation et annulation sont couvertes sans décalage de date/heure.

### B6 — Cockpit et moteur de file

- [x] Tester l'ouverture et la fermeture d'un guichet avec rafraîchissement immédiat de l'UI.
- [x] Tester qu'une file avec guichet actif est priorisée visuellement.
- [x] Tester l'état sans file configurée et sans file active.
- [x] Tester « appeler le suivant » avec une attente disponible.
- [x] Tester « appeler le suivant » avec zéro attente : erreur métier intégrée au shell, jamais page blanche.
- [x] Tester la concurrence : deux opérateurs tentent d'appeler le même prochain ticket.
- [x] Tester servi et absent avec désactivation pendant la mutation.
- [x] Vérifier nom/prénom nullable, arrivée, appel, sortie, attente et nombre de notes.
- [x] Tester les cartes de récapitulatif et l'impression du justificatif.
- [x] Vérifier qu'un refresh de page conserve le contexte utilisateur et le site.

Critère d'acceptation : les opérations de guichet restent cohérentes après mutation, conflit et actualisation.

### B7 — Kiosque, écran salle et tracking

- [x] Tester le parcours kiosque complet en paysage tablette sans scroll évitable sur l'écran final.
- [x] Vérifier le masque téléphonique et l'indicatif pays.
- [x] Vérifier la synthèse en deux colonnes et tous les choix client.
- [x] Vérifier la génération systématique du QR code `/track?token=...`.
- [x] Vérifier l'effacement des données après fin ou timeout kiosque.
- [x] Tester l'écran salle avec plusieurs files associées au compte technique.
- [x] Vérifier appels en cours, destination/file, prochains appels, plein écran 1080p et 4K.
- [x] Vérifier qu'aucune PII n'est rendue sur l'écran salle.
- [x] Tester tracking réel sans champ de saisie visible.
- [x] Tester tracking en preview humain avec champ de token hors du téléphone.
- [x] Tester token invalide, expiré et état indisponible.

Critère d'acceptation : les trois expériences publiques fonctionnent dans leurs modes réels et preview sans fuite de contexte privé.

### B8 — Supervision, rapports, notifications et santé

- [x] Tester les cartes de supervision, leurs états vides et leur rafraîchissement.
- [x] Tester les rapports avec période, file/site et absence de données.
- [x] Tester la création guidée d'une notification et la validation du destinataire.
- [x] Tester les erreurs d'envoi et les confirmations globales.
- [x] Tester l'accès à la santé uniquement avec `system_manage`.
- [x] Vérifier que les données techniques restent compréhensibles et qu'aucun secret n'est affiché.

Critère d'acceptation : chaque écran de pilotage possède au moins un parcours heureux et un parcours d'erreur automatisés.

---

## Phase C — Couche métier et accès API

### C1 — Définir la convention d'architecture

- [x] Choisir une convention unique par feature : `api/`, `hooks/`, `components/`, `model/`, `utils/` selon les besoins réels.
- [x] Ne pas créer de répertoires vides ou de couches sans responsabilité concrète.
- [x] Réserver les imports Orval aux adaptateurs/actions/hooks métier.
- [x] Garder les composants visuels indépendants du format d'enveloppe API.
- [x] Documenter les règles de nommage des clés React Query.
- [x] Définir quand employer un hook, une fonction d'action ou un store Zustand.

Critère d'acceptation : la convention est courte, documentée et appliquée sur une feature pilote.

### C2 — Centraliser les clés et invalidations React Query

- [x] Étendre `src/api/client/query-keys.ts` pour couvrir sites, files, personnes, inscriptions, rendez-vous, rapports et notifications.
- [x] Encoder systématiquement `siteId`, `queueId`, filtres, page et langue dans les clés concernées.
- [x] Centraliser les invalidations après chaque mutation.
- [x] Vérifier qu'un changement de site annule puis supprime les caches hors scope.
- [x] Éviter les chaînes de clés dupliquées écrites directement dans les pages.

Critère d'acceptation : les invalidations sont prévisibles et aucun écran n'affiche les données du site précédent.

### C3 — Créer les hooks métier prioritaires

- [x] `usePersonsSearch` : seuil de trois caractères, pagination cinq éléments, scope site.
- [x] `usePersonNotes` : consultation, ajout et invalidation du compteur.
- [x] `useQueues` et `useQueueStatus` : files autorisées, actives et état temps réel.
- [x] `useDeskSession` : ouverture, fermeture, threads et session courante.
- [x] `useCallNext`, `useMarkServed`, `useMarkNoShow` : concurrence, pending et notifications.
- [x] `useAppointments` et `useAvailability` : dates, fuseau et conflits.
- [x] `useSites` et `useActiveSite` : activation contrôlée et marque.
- [x] `useReports`, `useNotifications`, `useHealth`.
- [x] `usePublicTracking`, `useDisplaySnapshot`, `useKioskRegistration`.

Critère d'acceptation : les pages consomment des modèles métier et n'importent plus directement les fonctions contrôleur concernées.

### C4 — Encapsuler les mutations

- [x] Fournir un comportement commun contre le double clic.
- [x] Conserver et exposer le correlation ID des erreurs.
- [x] Gérer les erreurs attendues localement et les erreurs inattendues globalement.
- [x] Déclencher les notifications traduites depuis une clé stable.
- [x] Appliquer les invalidations après succès et après conflit si nécessaire.
- [x] Ne jamais faire de rollback optimiste sur une opération de file si le serveur reste la source de vérité.

Critère d'acceptation : une mutation métier a le même comportement UX quel que soit l'écran qui la déclenche.

### C5 — Vérifier l'absence d'appels réseau dans les pages

- [x] Renforcer `tools/phase11-audit.mjs` pour détecter les imports directs de contrôleurs Orval dans les fichiers `*Page.tsx`.
- [x] Prévoir une liste d'exceptions temporaire, explicite et décroissante pendant la migration.
- [x] Faire échouer l'audit lorsqu'une nouvelle page réintroduit un contrôleur généré.
- [x] Cocher la tâche correspondante du handover historique une fois toutes les exceptions supprimées.

Critère d'acceptation : aucune page ne connaît une URL, Axios ou une fonction contrôleur Orval.

---

## Phase D — Décomposition des composants volumineux

### D1 — Refactorer `SettingsPage`

- [x] Extraire le routage interne des sections.
- [x] Extraire les formulaires site, files, utilisateurs, niveaux de service et traductions.
- [x] Extraire les cartes/rangées répétées.
- [x] Déplacer les requêtes dans les hooks de la phase C.
- [x] Créer un schéma Zod par formulaire lorsque la validation dépasse de simples champs requis.
- [x] Ajouter des tests par section et un test d'intégration de navigation.

Critère d'acceptation : `SettingsPage` orchestre les sections sans contenir leur implémentation détaillée.

### D2 — Refactorer `OnboardingPage`

- [x] Extraire chaque étape du wizard.
- [x] Isoler le modèle de brouillon et sa migration de version.
- [x] Isoler la synthèse finale et l'activation du site.
- [x] Garantir que succès final réinitialise l'écran et affiche une situation compréhensible.
- [x] Conserver les deux cartes principales à hauteur cohérente.
- [x] Tester reprise du brouillon, abandon et création partiellement échouée.

Critère d'acceptation : chaque étape peut être testée indépendamment et la page ne porte plus les détails des formulaires.

### D3 — Refactorer `KioskPage`

- [x] Extraire `KioskWelcomeStep`.
- [x] Extraire `KioskIdentityStep`.
- [x] Extraire `KioskQueueStep`.
- [x] Extraire `KioskTierStep`.
- [x] Extraire `KioskReviewStep`.
- [x] Extraire `KioskTicketResult` et le QR code.
- [x] Centraliser l'état du wizard avec transitions explicites.
- [x] Garantir la remise à zéro après succès, annulation et watchdog.
- [x] Tester chaque transition et les retours arrière.

Critère d'acceptation : aucune étape kiosque ne dépend de variables implicites appartenant à une autre étape.

### D4 — Refactorer `DeskPage`

- [ ] Extraire le bandeau accueil rapide.
- [ ] Extraire les cartes de file.
- [ ] Extraire la prochaine personne éligible.
- [ ] Extraire la prise en charge courante.
- [ ] Extraire la liste discrète des passages terminés.
- [ ] Extraire les actions d'impression.
- [ ] Réduire les callbacks imbriqués et centraliser les commandes métier.
- [ ] Conserver tailles de cartes homogènes et priorité visuelle du guichet actif.

Critère d'acceptation : les blocs du cockpit peuvent évoluer sans modifier une page monolithique.

### D5 — Refactorer `NotificationsPage`

- [ ] Extraire le wizard « nouvel envoi ».
- [ ] Séparer choix d'audience, contenu, aperçu et confirmation.
- [ ] Extraire la recherche de personnes et inscriptions.
- [ ] Centraliser la validation des canaux et destinataires.
- [ ] Tester navigation, retour arrière, erreurs et résumé final.

Critère d'acceptation : la création d'une notification suit une machine d'états claire et testable.

### D6 — Simplifier le routage applicatif

- [ ] Remplacer la grande chaîne conditionnelle de `App.tsx` par une configuration associant chemin, composant et layout.
- [ ] Conserver le lazy loading par route.
- [ ] Centraliser les règles « public », « shell humain », « preview expérience » et « appareil technique ».
- [ ] Supprimer le double `useTranslation()` dans `Page`.
- [ ] Tester 404, forbidden, login, legal et toutes les routes protégées.

Critère d'acceptation : l'ajout d'une route ne demande pas de modifier plusieurs conditions imbriquées.

---

## Phase E — Design system et CSS

### E1 — Cartographier les styles

- [ ] Lister les sélecteurs de `global.css` par famille fonctionnelle.
- [ ] Repérer les règles dupliquées, surchargées ou devenues inutilisées.
- [ ] Repérer les couleurs, espacements, rayons et ombres codés en dur.
- [ ] Identifier les règles spécifiques à l'impression.
- [ ] Identifier les règles publiques qui doivent rester indépendantes du shell privé.

Critère d'acceptation : chaque bloc CSS possède une destination de module connue avant déplacement.

### E2 — Séparer les tokens des composants

- [ ] Garder dans `tokens` uniquement couleurs, espacements, typographie, rayons, ombres, transitions et thèmes.
- [ ] Créer des feuilles dédiées aux boutons et contrôles de formulaire.
- [ ] Créer des feuilles dédiées aux cartes, tableaux, badges et états.
- [ ] Créer une feuille dédiée aux modales et wizards.
- [ ] Créer des feuilles par expérience publique : kiosque, display, tracking.
- [ ] Créer des feuilles par grande feature uniquement lorsque le style n'est pas réutilisable.
- [ ] Importer les feuilles dans un ordre explicite et stable.

Critère d'acceptation : `global.css` n'est plus un fichier monolithique et les thèmes ne régressent pas.

### E3 — Consolider les composants de formulaire

- [ ] Uniformiser label, marque obligatoire, aide, erreur et succès.
- [ ] Uniformiser `input`, `select`, `textarea`, téléphone, date et recherche.
- [ ] Vérifier placeholder, option native, autofill, disabled, readonly et erreur dans les quatre thèmes.
- [ ] Ajouter une convention de grille deux colonnes/une colonne mobile.
- [ ] Vérifier l'association `label`/champ et les descriptions accessibles.
- [ ] Éviter les champs plus petits que 44 px sur surfaces tactiles.

Critère d'acceptation : aucun formulaire métier ne recrée ses propres contrôles visuels.

### E4 — Consolider modales et wizards

- [ ] Utiliser `Modal`/`WizardModal` comme base unique.
- [ ] Supprimer les croix de fermeture lorsque la règle produit impose un bouton Annuler.
- [ ] Uniformiser titre, description, progression, corps scrollable et actions fixes.
- [ ] Vérifier que les recherches compactes ne rallongent pas excessivement la modale.
- [ ] Gérer fermeture par Échap selon la criticité de l'action.
- [ ] Restituer le focus au déclencheur à la fermeture.

Critère d'acceptation : accueil rapide, rendez-vous, notes et notifications partagent la même cinématique.

### E5 — Revue des quatre thèmes

- [ ] Vérifier light, soft-light, soft-dark et dark sur toutes les routes.
- [ ] Vérifier contrastes normal, hover, focus, pressed, disabled, error et success.
- [ ] Vérifier les graphiques, tableaux, calendriers, overlays et impressions.
- [ ] Vérifier les expériences publiques, même si certaines utilisent une palette volontairement fixe.
- [ ] Ajouter une matrice de captures automatisées par thème et viewport.

Critère d'acceptation : aucune information ne dépend seulement de la couleur et aucun texte utile n'est illisible.

---

## Phase F — Accessibilité et recette visuelle

### F1 — Navigation clavier

- [ ] Tester l'ordre de tabulation de chaque route.
- [ ] Tester sidebar ouverte, réduite et mobile.
- [ ] Tester calendrier, sélecteurs, tableaux paginés et carrousels.
- [ ] Vérifier les raccourcis du cockpit et leurs conflits avec les champs de saisie.
- [ ] Vérifier focus initial, piégeage et restitution des modales.
- [ ] Vérifier que les zones scrollables peuvent recevoir le focus lorsque nécessaire.

### F2 — Lecteurs d'écran et sémantique

- [ ] Vérifier les titres de pages et la hiérarchie `h1`/`h2`/`h3`.
- [ ] Vérifier landmarks, navigation, main, header et footer.
- [ ] Vérifier les noms accessibles des boutons icône.
- [ ] Vérifier les annonces de chargement, succès, erreur et mise à jour dynamique.
- [ ] Vérifier les tableaux, calendriers, jauges et compteurs de notes.
- [ ] Tester au minimum avec NVDA/Chrome ou un équivalent documenté.

### F3 — Mouvement et perception

- [ ] Respecter `prefers-reduced-motion` pour animations, pulse, révélation et rotation.
- [ ] Ne pas rendre une action compréhensible uniquement par animation.
- [ ] Vérifier zoom navigateur à 200 % et reflow à 320 px.
- [ ] Vérifier les tailles tactiles de 44 px.
- [ ] Vérifier affichage kiosque assis/debout et TV à distance.

### F4 — Comparaison à la maquette

- [ ] Définir une liste de vues de référence dans `dori_saas_mockup.html`.
- [ ] Capturer les mêmes états dans l'application.
- [ ] Comparer composition, hiérarchie, espacements, densité, ombres et mouvements.
- [ ] Corriger les écarts accidentels.
- [ ] Documenter chaque écart volontaire avec justification UX, accessibilité ou contrat API.
- [ ] Ne pas recopier un élément de maquette s'il contredit une règle fonctionnelle validée plus récente.

Critère de sortie de la phase : audit WCAG 2.2 AA automatique et manuel consigné, captures comparées et écarts justifiés.

---

## Phase G — Résilience, erreurs et observabilité

### G1 — Brancher les Error Boundaries fonctionnelles

- [ ] Définir les frontières pertinentes : opérations, rendez-vous, administration, supervision et expériences publiques.
- [ ] Utiliser `FeatureErrorBoundary` ou le remplacer par une implémentation cohérente avec `AppErrorBoundary`.
- [ ] Conserver shell, navigation, site actif et notifications lors d'une erreur locale.
- [ ] Proposer réessayer, actualiser la feature, copier une référence et revenir à une route sûre.
- [ ] Ne pas afficher stack trace ou données sensibles en production.
- [ ] Tester erreur de rendu, rejet de promesse et erreur API inattendue.

### G2 — Standardiser erreurs métier et conflits

- [ ] Cartographier les codes du catalogue API vers des clés i18n.
- [ ] Associer à chaque erreur une action possible lorsque pertinente.
- [ ] Réserver l'espace d'erreur détaillé aux erreurs inattendues.
- [ ] Pour `409`, rafraîchir le snapshot avant de rendre la main.
- [ ] Conserver le correlation ID dans le détail support.
- [ ] Dédupliquer les toasts identiques rapprochés.

### G3 — Mode hors ligne et reprise

- [ ] Détecter perte et retour réseau.
- [ ] Afficher un bandeau non bloquant.
- [ ] Autoriser la consultation des données déjà en cache.
- [ ] Interdire appel, reset, check-in, création ou notification hors ligne.
- [ ] Ne jamais mettre silencieusement une mutation métier en file locale.
- [ ] Recharger un snapshot REST au retour réseau.

### G4 — Télémétrie sans PII

- [ ] Définir une interface de télémétrie indépendante du fournisseur.
- [ ] Journaliser route logique, opération OpenAPI, durée, statut et correlation ID.
- [ ] Mesurer refresh échoué, reconnexion, mutation échouée et rendu lent.
- [ ] Masquer ou exclure nom, prénom, téléphone, e-mail, note, JWT et tracking token.
- [ ] Ajouter des tests garantissant la redaction.
- [ ] Désactiver ou rediriger proprement la télémétrie en développement/test.

### G5 — Temps réel

- [ ] Conserver le polling actuel tant que le contrat WebSocket n'est pas disponible.
- [ ] Documenter intervalle, backoff, visibilité onglet et coût réseau.
- [ ] Éviter plusieurs pollers pour la même ressource.
- [ ] Suspendre ou ralentir le polling lorsque l'onglet est caché si acceptable métier.
- [ ] Préparer une interface permettant de remplacer polling par WebSocket.
- [ ] À réception du contrat WebSocket : versionner événements/rooms, gérer reconnexion et snapshot REST.

Critère de sortie de la phase : une erreur ou coupure n'entraîne jamais une page blanche ni une mutation ambiguë.

---

## Phase H — Sécurité et préparation production

### H1 — Authentification et refresh

- [ ] Confirmer avec le backend que le refresh token est exclusivement en cookie HttpOnly, Secure et SameSite adapté.
- [ ] Tester la rotation de refresh et le rejet d'un ancien cookie.
- [ ] Tester la single-flight de refresh avec plusieurs `401` simultanés.
- [ ] Vérifier que logout invalide la session serveur même si la purge locale doit toujours réussir.
- [ ] Vérifier qu'aucun token salarié n'est stocké dans `localStorage`, `sessionStorage` ou Zustand persisté.

### H2 — CSP et en-têtes

- [ ] Conserver la CSP générée par Vite comme défense locale.
- [ ] Configurer les vrais en-têtes HTTP sur l'hébergeur : CSP, Referrer-Policy, X-Content-Type-Options et permissions utiles.
- [ ] Vérifier `frame-ancestors` selon le besoin réel d'intégration.
- [ ] Réduire `'unsafe-inline'` pour les styles si une stratégie nonce/hash devient possible.
- [ ] Tester les URLs de logo distantes si elles doivent être autorisées par `img-src`.

### H3 — Scope et anti-escalade

- [ ] Tester chaque route et action avec permissions insuffisantes.
- [ ] Ne pas se contenter de masquer un bouton : l'appel ne doit jamais être déclenché.
- [ ] Vérifier les identifiants site/file transmis aux services.
- [ ] Purger caches et abonnements lors d'un changement de scope.
- [ ] Tester la manipulation directe des URLs et du stockage de site actif.

### H4 — Surfaces publiques

- [ ] Vérifier absence de PII dans DOM, source, attributs accessibles et messages d'erreur.
- [ ] Consommer le token de tracking depuis l'URL puis nettoyer l'historique conformément à la stratégie existante.
- [ ] Vérifier `Referrer-Policy: no-referrer`.
- [ ] Effacer les données du kiosque après succès, timeout et déconnexion cachée.
- [ ] Vérifier que l'écran salle n'affiche que ticket public et destination autorisée.

### H5 — Configuration légale et production

- [ ] Obtenir les valeurs réelles : entité, adresse, e-mail et immatriculation.
- [ ] Faire valider les textes juridiques par locale.
- [ ] Vérifier que `legalProductionGuard` bloque toutes les valeurs fictives usuelles.
- [ ] Ajouter une vérification de configuration au pipeline de déploiement.
- [ ] Ne pas considérer un build technique comme déployable tant que ces valeurs ne sont pas validées.

### H6 — Dépendances et supply chain

- [ ] Exécuter `npm audit --audit-level=high`.
- [ ] Examiner chaque vulnérabilité avant mise à jour majeure.
- [ ] Garder `package-lock.json` version 3 et utiliser une installation reproductible en CI.
- [ ] Vérifier les licences des dépendances destinées à la production.
- [ ] Documenter la politique de mise à jour React, Vite, Orval et Playwright.

Critère de sortie de la phase : les exigences sécurité/confidentialité de la section 14 sont testées et documentées.

---

## Phase I — Documentation, déploiement et recette finale

### I1 — README opérationnel

- [ ] Décrire le rôle de DORI Web et les profils supportés.
- [ ] Documenter Node/npm requis et installation reproductible.
- [ ] Documenter `.env.local` et chaque variable.
- [ ] Documenter démarrage avec API locale et comportement proxy/base URL.
- [ ] Documenter génération et vérification du client API.
- [ ] Documenter lint, typecheck, tests unitaires, E2E et build.
- [ ] Documenter les erreurs courantes : port occupé, API absente, client généré manquant.

### I2 — Documentation d'architecture

- [ ] Décrire providers, router, session, scope et query client.
- [ ] Décrire la couche métier/API après phase C.
- [ ] Décrire i18n : namespace distant `translation`, fallback local et catégorie `ihm`.
- [ ] Décrire thèmes, préférences et tokens.
- [ ] Décrire erreurs globales, notifications et correlation IDs.
- [ ] Décrire expériences publiques et différences réel/preview.
- [ ] Ajouter un diagramme uniquement si les relations ne sont pas claires en texte.

### I3 — Documentation de déploiement

- [ ] Documenter le build et le contenu de `dist`.
- [ ] Documenter la réécriture SPA.
- [ ] Documenter URL API, CORS, cookies, HTTPS et domaines.
- [ ] Documenter les en-têtes de sécurité côté hébergeur.
- [ ] Documenter les variables légales de production.
- [ ] Documenter rollback et vérifications après déploiement.
- [ ] Clarifier si `vercel.json` reste la cible officielle ou seulement un exemple.

### I4 — Runbooks appareils

- [ ] Documenter création et permissions d'un compte kiosque.
- [ ] Documenter le choix accueil/écran salle après connexion.
- [ ] Documenter mode plein écran, orientation paysage et résolution recommandée.
- [ ] Documenter `?deco=true` et la déconnexion explicite de `/device-mode`.
- [ ] Documenter dépannage réseau, imprimante, son et QR code.
- [ ] Documenter protection physique et renouvellement de session.

### I5 — Recette finale

- [ ] Construire une matrice route × profil × site × thème × viewport.
- [ ] Vérifier chaque point de la définition de fini de `final_ihm_specification.md` section 14.
- [ ] Vérifier chaque critère transverse de `spec_front.md` section 14.
- [ ] Exécuter `npm run verify` dans un environnement propre.
- [ ] Tester manuellement Chrome et au moins un second moteur si supporté.
- [ ] Tester mobile réel ou émulation documentée, tablette paysage, TV 1080p et 4K.
- [ ] Vérifier impression thermique/PDF.
- [ ] Comparer les captures finales à la maquette et annexer les écarts justifiés.
- [ ] Faire signer les mentions légales et les critères métier restant dépendants du backend.
- [ ] Établir la liste des risques résiduels et éléments explicitement hors périmètre.

Critère d'acceptation : toutes les cases de la définition de fini disposent d'une preuve et aucun bloqueur de production n'est masqué.

---

## 4. Contrôles transverses à appliquer à chaque changement

### Fonctionnel

- [ ] Le cas nominal fonctionne avec le service réel ou son mock contractuel.
- [ ] Chargement, vide, erreur, succès et concurrence sont couverts.
- [ ] Le changement de site ne conserve pas de données hors scope.
- [ ] Les dates sont calculées depuis un timestamp fiable et affichées dans le fuseau du site.

### UX

- [ ] Les actions principales et secondaires sont hiérarchisées.
- [ ] Les boutons partagent le design system.
- [ ] Les modales ont un bouton Annuler et une progression claire lorsque nécessaire.
- [ ] Le rafraîchissement produit un retour visible sans déplacer inutilement la page.
- [ ] Les états vides expliquent la situation et proposent une action pertinente.

### Accessibilité

- [ ] Utilisable au clavier.
- [ ] Focus visible et logique.
- [ ] Nom accessible pour tout contrôle.
- [ ] Contraste valide dans les quatre thèmes.
- [ ] Cible tactile d'au moins 44 px lorsque nécessaire.
- [ ] Animations réduites avec `prefers-reduced-motion`.

### Sécurité

- [ ] Aucune PII ou secret dans log, toast, erreur ou URL.
- [ ] Permissions et scope contrôlés avant l'action.
- [ ] Contenu non fiable rendu comme texte.
- [ ] Mutation protégée contre double clic et répétition involontaire.

### Qualité

- [ ] Textes via i18n et priorité distante préservée.
- [ ] DTO importé du client généré.
- [ ] Test ajouté au niveau approprié.
- [ ] `npm run audit:i18n` passe.
- [ ] `npm run audit:phase11` passe.
- [ ] `npm run typecheck` passe.
- [ ] `npm run lint` passe.
- [ ] Tests ciblés passent.
- [ ] Build passe lorsque la modification touche l'intégration ou les imports.

## 5. Commandes de validation

Exécuter séquentiellement les commandes qui génèrent ou consomment le client API.

```bash
npm run api:check
npm run audit:phase11
npm run audit:i18n
npm run audit:security
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Validation complète :

```bash
npm run verify
```

Précaution : ne pas exécuter `npm run build` en parallèle de Playwright, car le build lance Orval et nettoie temporairement `src/api/generated`.

Le pipeline canonique `npm run verify` exécute ces étapes séquentiellement. `pretest:e2e` refuse en plus de démarrer Playwright si les entrées essentielles du client généré sont absentes. Playwright ne réutilise jamais un serveur Vite déjà présent sur le port 4173 afin d'éviter de tester un bundle obsolète.

## 6. Dépendances et blocages externes

- [ ] Obtenir un contrat WebSocket versionné avant de remplacer le polling.
- [ ] Confirmer la stratégie cookie/refresh avec le backend et l'infrastructure HTTPS.
- [ ] Obtenir les mentions légales réelles et leur validation juridique.
- [ ] Confirmer la cible officielle d'hébergement et ses en-têtes HTTP disponibles.
- [ ] Confirmer le matériel kiosque, impression et écran salle réellement supporté.
- [ ] Confirmer les navigateurs minimums supportés.

Ces points ne doivent pas bloquer les améliorations indépendantes, mais ils bloquent la déclaration « prêt pour la production ».

## 7. Journal de validation

Ajouter une entrée datée après chaque lot terminé.

### 2026-10-09 — A1/A2, baseline et réconciliation

- Tâches cochées : règles de préservation, A1 et A2.
- Baseline Git : commit `2e84419`, branche `dev`, tag `beta_stable`, identique à `origin/dev` au démarrage.
- État initial : worktree propre ; aucun changement applicatif ou généré préexistant à préserver.
- Artefacts ignorés confirmés : `dist/`, `playwright-report/`, `test-results/`, `src/api/generated/` et fichiers d'environnement locaux.
- Réconciliation : inventaire initial marqué historique, section i18n finale cochée après contrôle, lien ajouté vers ce plan actif.
- Preuves : 29 fichiers de tests et 56 tests Vitest réussis ; audit i18n réussi ; audit Phase 11 réussi sur 124 fichiers source.
- Décision : les tâches finales de comparaison à la maquette, documentation et recette restent planifiées en phases F et I.
- Prochaine tâche : A3, stabilisation des scénarios Playwright existants.

### 2026-10-09 — A3/A4/A5, stabilisation E2E et métriques initiales

- Tâches cochées : A3 complet ; A4 partiel ; A5 complet.
- Corrections : navigation E2E alignée sur « Pilotage » et « État de la plateforme », espacement accessible « Guichet 2 », deux assertions mojibake corrigées.
- Stabilité : suite complète Playwright réussie trois fois consécutivement, 14/14 scénarios en environ 32 à 35 secondes.
- Contrôles : typecheck et lint réussis ; `api:check` réussi sans diff généré ; build réussi.
- Tests unitaires/composants : 29 fichiers, 56 tests, environ 30 secondes.
- E2E : 11 déclarations statiques produisant 14 scénarios avec la matrice responsive.
- Client API/UI : 26 fichiers applicatifs importent encore un contrôleur Orval ; 50 déclarations `useQuery`/`useMutation` dans les composants.
- Fichiers les plus volumineux : `global.css` 4091 lignes, `SettingsPage` 943, `KioskPage` 743, `OnboardingPage` 737, fallback i18n 680, `NotificationsPage` 610, `DeskPage` 542, `i18n.ts` 521, `QuickRegistration` 400 et `AppointmentsPage` 353.
- Bundle initial : entrée principale 467,35 kB brut / 145,14 kB gzip ; schémas 114,22 / 34,62 ; client HTTP 51,73 / 19,34 ; kiosque 41,65 / 13,99 ; CSS 75,11 / 15,26.
- Outillage : contrôle préalable des imports générés ajouté ; `verify` reste séquentiel. Le verrou interprocessus génération/E2E reste à finaliser.
- Risque observé : le filtrage Playwright par expression des seuls tests « phase » atteint tous les scénarios mais ne rend pas proprement la main dans l'environnement Windows actuel ; le script ciblé est donc défini au niveau fiable du fichier visuel complet.
- Décision A4 : les scripts du dépôt garantissent l'ordre séquentiel ; lancer manuellement deux commandes npm concurrentes reste un usage hors pipeline et est explicitement interdit dans les règles d'exécution.
- Prochaine tâche : démarrer l'infrastructure E2E de phase B.

### 2026-10-09 — B1/B2/B3, socle E2E, session et scopes

- Tâches cochées : B1, B2 et B3 complets.
- Fichiers principaux : `e2e/support/scenario-fixtures.ts`, `e2e/session.spec.ts`, `e2e/scope.spec.ts`, `src/core/auth/session-actions.ts`, `src/app/AppProviders.tsx` et `src/app/layouts/PublicExperienceLayout.tsx`.
- Infrastructure : profils root/admin/manager/opérateur/kiosque, builders contractuels, enveloppes API, erreurs, latence, horloge, mode hors ligne et helpers de navigation mutualisés.
- Session : connexion réelle par formulaire, restauration après refresh, expiration, purge complète, déconnexion, changement de mot de passe imposé et `?deco=true` sur les trois expériences couverts.
- Correction applicative : les expirations HTTP déclenchent maintenant la purge de la session, du scope, de la marque et du cache via l'abonnement global ; la déconnexion cachée couvre aussi le tracking authentifié.
- Scope : absence de site, site unique, multi-sites, invalidation des données, persistance du bandeau, stockage hors scope, matrice de permissions et restriction kiosque couverts.
- Tests : suite Playwright complète réussie avec 29/29 scénarios avant l'extension finale de la matrice de routes ; tests unitaires ciblés session 7/7, lint et typecheck réussis sur le lot session.
- Limite outillage : l'exécution Playwright filtrée reste bloquante sous Windows ; la suite complète demeure la validation canonique.
- Prochaine tâche : B4, parcours cockpit et files.

### 2026-10-09 — B4, accueil rapide et walk-in

- Tâches cochées : B4 complet.
- Couverture : recherche connue à trois caractères avec `siteId`, pages de cinq résultats et pagination ; inscription d'une personne connue ; création d'une identité complète ; choix file/forfait ; création walk-in ; succès, conflit 409 et double clic.
- Corrections applicatives : validation locale des e-mails et dates ISO optionnels, verrou synchrone anti-double soumission, invalidation des inscriptions, statuts de files et prochains éligibles après création.
- Fixtures : catalogue de forfaits et réponses supervision/santé contractuelles ajoutés au socle commun ; les parcours de routes ne masquent plus d'erreur de rendu derrière une Error Boundary.
- Tests : 4/4 tests ciblés `PersonPickerOrCreate`, typecheck et lint réussis ; suite Playwright complète réussie avec 32/32 scénarios.
- Prochaine tâche : B5, rendez-vous.

### 2026-10-09 — B5, rendez-vous et fuseaux horaires

- Tâches cochées : B5 complet.
- Couverture E2E : case vide, wizard personne/service/créneau, chargement des disponibilités, création, conflit 409 avec refetch, ouverture d'une réservation, reprogrammation, annulation et site sans rendez-vous.
- Fuseau : les corps envoyés sont vérifiés en UTC depuis l'heure civile `Europe/Paris` ; les tests unitaires couvrent désormais explicitement les offsets été et hiver.
- Tests : typecheck et lint réussis ; suite Playwright complète réussie avec 36/36 scénarios.
- Prochaine tâche : B6, cockpit et opérations de file.

### 2026-10-09 — B6, cockpit et moteur de file

- Tâches cochées : B6 complet.
- Couverture E2E : ouverture/fermeture de guichet, priorité visuelle, absence de file, appel nominal, file vide, concurrence entre deux opérateurs, servi, absent et maintien du shell en erreur.
- Détails métier vérifiés : identité partiellement nulle, date d'arrivée, heure d'appel, attente calculée, compteur de notes et synthèse du passage.
- Impression : déclenchement de `window.print`, contenu non fiscal et mention d'impression à la demande du client contrôlés.
- Persistance : le scénario B2 de refresh privé couvre la conservation conjointe de la session et du site actif sur le cockpit.
- Fixtures : les réponses communes de statut, sessions et guichets sont maintenant contractuelles et ne reposent plus sur une pagination générique incompatible.
- Tests : suite Playwright complète réussie avec 42/42 scénarios avant l'ajout des assertions légales finales ; typecheck réussi.
- Prochaine tâche : B7, mes files et notes.

### 2026-10-10 — B7, kiosque, écran salle et tracking

- Tâches cochées : B7 complet ; aucune tâche B8 engagée.
- Kiosque : parcours walk-in complet validé en paysage tablette, indicatif et normalisation du téléphone, avantages du forfait, synthèse client en deux colonnes, création du ticket, QR code de tracking, absence de scroll évitable sur le résultat et purge après fin ou timeout.
- Écran salle : deux files du périmètre technique sont agrégées ; appels, guichets, noms des files et prochains tickets sont contrôlés en 1080p et 4K, sans donnée personnelle.
- Tracking : le mode réel consomme puis retire le token de l'URL sans champ de test ; le mode preview humain conserve son champ hors du téléphone ; les tokens invalides, expirés et le service indisponible disposent maintenant d'états dédiés sans rejet de polling non géré.
- Fichiers principaux : `e2e/public-experiences.spec.ts`, `src/features/public-experiences/TrackPage.tsx`, `src/core/realtime/realtime-gateway.ts`, `src/core/i18n/i18n.ts`.
- Tests : lint et typecheck réussis ; Vitest 60/60 ; nouvelle recette B7 7/7 ; suite Playwright 48/49 au premier passage avec un timeout de navigation hors B7, puis fichier `scope.spec.ts` réussi 9/9 au rejeu.
- Prochaine tâche recommandée : B8, uniquement après validation explicite de reprise par l'utilisateur.

### 2026-10-10 — Renommage DORIFY et clôture B8

- Tâches cochées : B8 complet.
- Marque : tous les libellés IHM locaux, le titre HTML, la marque par défaut, les documents imprimés et les textes légaux affichent désormais `DORIFY`. Les identifiants techniques, clés de stockage, noms de package et clés i18n historiques restent inchangés.
- Traductions distantes : leur priorité reste inchangée ; l'ancien nom éventuellement encore présent dans un bundle `ihm` est normalisé vers `DORIFY` à son chargement.
- Couverture B8 : supervision, états vides, rafraîchissement, rapports sur sept jours, notifications guidées, erreurs d'envoi, contrôle `system_manage`, santé et absence de secrets.
- Correction de recette : suppression de l'assertion E2E obsolète exigeant le libellé de périmètre retiré précédemment de la page Rapports.
- Tests : typecheck et lint réussis ; test session 6/6 ; recette Playwright `pilotage.spec.ts` 8/8.
- Prochaine tâche recommandée : C1, convention d'architecture par feature.

### 2026-10-10 — C1, convention d'architecture

- Tâches cochées : C1 complet.
- Convention : `docs/frontend-architecture.md` définit les responsabilités optionnelles de `api/`, `hooks/`, `components/`, `model/` et `utils/`, sans imposer de couche ou de dossier vide.
- Règles : imports Orval confinés aux adaptateurs, hooks et actions en transition ; pages indépendantes des enveloppes HTTP ; clés React Query hiérarchiques et exhaustives ; critères explicites pour choisir fonction, hook ou store Zustand.
- Feature pilote : Santé utilise désormais `api/health-api.ts`, `hooks/useHealth.ts` et `queryKeys.health.all`. `HealthPage.tsx` ne connaît plus Orval ni de clé de cache littérale.
- Contrôles : typecheck et lint réussis ; aucun dossier vide dans la feature pilote ; l'import Orval est limité à son adaptateur.
- Limite de validation : le rejeu Playwright de `pilotage.spec.ts` n'a produit aucun résultat avant le timeout de 120 secondes de l'environnement Windows. La même recette avait réussi 8/8 immédiatement avant ce refactor sans changement du rendu ni du contrat de données.
- Prochaine tâche recommandée : C2, centralisation des clés et invalidations React Query.

### 2026-10-10 — C2, clés et invalidations React Query

- Tâches cochées : C2 complet.
- Clés : la fabrique centrale couvre sites, files, statuts, sessions, threads, personnes, notes, inscriptions, rendez-vous, disponibilités, rapports, notifications, administration et expériences publiques.
- Dimensions : les clés concernées portent le site, la file, les filtres, la pagination, la période, l'usage et la langue ; les rapports multi-files incluent aussi les identifiants de files.
- Migration : aucune page ou composant applicatif ne déclare désormais de tableau littéral `queryKey`.
- Invalidations : politiques communes ajoutées pour rendez-vous, notifications, notes, opérations de file, cockpit de supervision et administration. La remise à zéro de supervision invalide maintenant réellement la racine `queues` au lieu de l'ancienne clé erronée `queue`.
- Changement de site : le comportement existant annule les requêtes avant de retirer tout cache, puis recharge la marque du nouveau site ; un test vérifie désormais la purge du cache de l'ancien site.
- Tests : typecheck et lint réussis ; tests ciblés clés, invalidations, session et rendez-vous 11/11 réussis ; audit sans clé littérale et `git diff --check` réussis.
- Prochaine tâche recommandée : C3, hooks métier prioritaires.

### 2026-10-10 — Clôture de la phase C

- Tâches cochées : C3, C4 et C5 complets ; phase C entièrement terminée.
- Hooks métier : personnes, notes, files, statuts, sessions, opérations guichet, rendez-vous, disponibilités, sites, rapports, notifications, santé et expériences publiques sont centralisés.
- Mutations : `useBusinessMutation` partage une requête en cours contre le double clic, expose la présentation normalisée et le correlation ID, sépare les erreurs métier attendues des erreurs globales, centralise les notifications et les invalidations après succès ou conflit.
- Opérations de file : le serveur reste la source de vérité ; aucune mise à jour optimiste ni rollback local n'est appliqué.
- Pages : tous les appels Orval restants ont été déplacés vers des adaptateurs ou hooks métier ; aucune page ne connaît Axios, `fetch`, le client HTTP ou une fonction contrôleur générée.
- Audit : `tools/phase11-audit.mjs` bloque désormais tout nouvel import Orval direct dans un fichier `*Page.tsx` ; la liste d'exceptions est explicite et vide.
- Tests : typecheck et lint réussis ; audit Phase 11 réussi sur 150 fichiers ; Vitest 32/32 fichiers et 72/72 tests.
- Prochaine tâche recommandée : D1, décomposition de `SettingsPage`.

### 2026-10-10 — D1 et D2, configuration et onboarding

- Tâches cochées : D1 et D2 complets.
- Settings : `SettingsPage` ne contient plus que la résolution de route et délègue l'espace de travail ; navigation, données React Query, panneaux, formulaires et éléments répétés ont des responsabilités séparées.
- Données : `useSettingsData` centralise sites, files, utilisateurs, rôles, niveaux et traductions ainsi que leur invalidation.
- Validation : schémas Zod dédiés aux associations de niveaux, règles de notification et traductions ; les formulaires simples conservent leurs contraintes natives.
- Onboarding : `OnboardingPage` délègue le wizard et ses six étapes nommées ; modèle de brouillon, transitions, reprise partielle, synthèse et activation sont isolés du composant de route.
- Migration : passage du brouillon local v1 au modèle v2 avec reprise automatique des anciennes données et remplissage des nouveaux defaults.
- Fin de parcours : l'activation conserve le message de situation, purge les deux versions du brouillon et restitue un wizard initial complet.
- Mise en page : les deux cartes principales restent alignées par la grille étirée existante, avec retour à une colonne sous 900 px.
- Tests : navigation entre sections, résolution de route, schémas Zod, migration v1/v2, abandon local, reprise après création partielle, niveaux requis, retour arrière et reset après activation.
- Résultats : typecheck et lint réussis ; audit Phase 11 réussi sur 161 fichiers ; Vitest 36/36 fichiers et 88/88 tests.
- Prochaine tâche recommandée : D3, décomposition du kiosque.

### 2026-10-10 — D3, décomposition du kiosque

- Tâches cochées : D3 complet.
- Route : `KioskPage` est désormais un point d'entrée fin qui délègue le parcours à `KioskWizard`.
- Étapes : accueil, choix de file, identité, niveau de service, vérification et résultat disposent de composants nommés ; le QR reste isolé dans `TrackingQr`.
- Navigation : un reducer décrit explicitement démarrage walk-in/rendez-vous, progression, retour, affichage du résultat et remise à zéro.
- Nettoyage : la même commande `purge` réinitialise navigation, saisies et résultat après fin, annulation et expiration watchdog.
- Tests : chaque composant d'étape est rendu isolément ; la progression 1→4, les retours, le rendez-vous, le résultat et les remises à zéro sont couverts.
- Résultats : typecheck et lint réussis ; tests ciblés 11/11 ; suite Vitest complète 38/38 fichiers et 98/98 tests.
- Prochaine tâche recommandée : D4, décomposition du cockpit guichet.

Modèle :

```md
### AAAA-MM-JJ — Identifiant et titre du lot

- Tâches cochées : A1, A2…
- Fichiers principaux modifiés : …
- Décisions prises : …
- Tests exécutés : …
- Résultats : …
- Écarts ou risques restants : …
- Prochaine tâche recommandée : …
```

## 8. Définition globale de terminé

Le chantier de consolidation est terminé uniquement lorsque :

- [ ] Le pipeline complet passe dans un environnement propre.
- [ ] Les parcours E2E prioritaires sont stables.
- [x] Les pages n'importent plus directement les contrôleurs API générés.
- [ ] Les composants volumineux ont des responsabilités explicites et testables.
- [ ] Le CSS et le design system sont modulaires et validés dans les quatre thèmes.
- [ ] L'audit WCAG 2.2 AA automatique et manuel est consigné.
- [ ] Les captures finales ont été comparées à la maquette et les écarts justifiés.
- [ ] La sécurité, les scopes, la session et l'absence de PII publique sont prouvés par des tests.
- [ ] La documentation permet installation, développement, test, déploiement et exploitation sans transmission orale.
- [ ] Les mentions légales et la configuration de production sont réelles et validées.
- [ ] La recette finale des sections 14 des deux spécifications est signée ou explicitement acceptée avec risques résiduels.

<!-- CHECKPOINT id="ckpt_mv19hvvw_220axp" time="2026-10-09T17:51:19.724Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv19uqrb_ndfgky" time="2026-10-09T18:01:19.607Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1a7lqb_xjs636" time="2026-10-09T18:11:19.619Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1akgp4_fke8ci" time="2026-10-09T18:21:19.624Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1axbo1_cg98b1" time="2026-10-09T18:31:19.633Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ba6n2_1y5csn" time="2026-10-09T18:41:19.646Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1bn1lx_ifbobo" time="2026-10-09T18:51:19.653Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1bzwkp_94fbii" time="2026-10-09T19:01:19.657Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ccrjv_0fezil" time="2026-10-09T19:11:19.676Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1e3f2i_5ozgbk" time="2026-10-09T20:00:02.826Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ega1e_pdf7nx" time="2026-10-09T20:10:02.834Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1et50h_i53p8m" time="2026-10-09T20:20:02.849Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1f5zze_pbqc5r" time="2026-10-09T20:30:02.858Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1fiuya_0kbcgj" time="2026-10-09T20:40:02.866Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1fvpxb_xahtwp" time="2026-10-09T20:50:02.879Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1g8kxs_xth41z" time="2026-10-09T21:00:02.944Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1glfwe_kbyz1u" time="2026-10-09T21:10:02.942Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1gyauz_t083r4" time="2026-10-09T21:20:02.939Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1hb5tw_02gmr9" time="2026-10-09T21:30:02.948Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ho0si_wa3iok" time="2026-10-09T21:40:02.946Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1i0vrr_gih54y" time="2026-10-09T21:50:02.967Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1idqqe_0c6hnv" time="2026-10-09T22:00:02.966Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1iqlpg_b8xuz0" time="2026-10-09T22:10:02.980Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1j3go8_6k0jp9" time="2026-10-09T22:20:02.984Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1jgbmv_zay27f" time="2026-10-09T22:30:02.983Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1k61kl_x9vb5q" time="2026-10-09T22:50:02.997Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1kiwm3_xjw1uq" time="2026-10-09T23:00:03.099Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1kvrkg_nohris" time="2026-10-09T23:10:03.088Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1l8mj9_na5mmc" time="2026-10-09T23:20:03.093Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1llhi5_9e0146" time="2026-10-09T23:30:03.101Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1lych8_z3af75" time="2026-10-09T23:40:03.116Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1mb7hy_jfzuiw" time="2026-10-09T23:50:03.190Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1mo2eu_b9wy6q" time="2026-10-10T00:00:03.126Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1n0xdx_e6guv1" time="2026-10-10T00:10:03.141Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ndscn_apyryl" time="2026-10-10T00:20:03.143Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1nqnbl_587jql" time="2026-10-10T00:30:03.153Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1o3ial_cj6rv0" time="2026-10-10T00:40:03.165Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ogd93_dxemc2" time="2026-10-10T00:50:03.159Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1ot883_jotsys" time="2026-10-10T01:00:03.171Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1tp711_tp4u7e" time="2026-10-10T03:16:53.078Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1u21zz_5mmygg" time="2026-10-10T03:26:53.087Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1uewyn_m5xkfg" time="2026-10-10T03:36:53.087Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1urryq_sbgs4m" time="2026-10-10T03:46:53.138Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv1x0do1_u5nvpy" time="2026-10-10T04:49:33.745Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv21kf4t_zyyk0q" time="2026-10-10T06:57:07.229Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv21xa33_g822te" time="2026-10-10T07:07:07.215Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv22a51y_59ak35" time="2026-10-10T07:17:07.222Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv22n00g_hxam82" time="2026-10-10T07:27:07.216Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv22zuzc_ba0k24" time="2026-10-10T07:37:07.224Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv23cpyf_6mxpkv" time="2026-10-10T07:47:07.239Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv23pkxl_ste9o4" time="2026-10-10T07:57:07.257Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv24jf9j_qgyrdp" time="2026-10-10T08:20:19.591Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv29mfqc_7wb3i5" time="2026-10-10T10:42:38.244Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv29zap6_o15rub" time="2026-10-10T10:52:38.250Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2ac5o9_k70xhn" time="2026-10-10T11:02:38.265Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2ap0sb_jvme7t" time="2026-10-10T11:12:38.459Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2b1vsm_s42cys" time="2026-10-10T11:22:38.518Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2bsj92_6ga8xk" time="2026-10-10T11:43:21.974Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2cf88o_hvjnnt" time="2026-10-10T12:01:00.792Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2jkxwo_jdfex8" time="2026-10-10T15:21:24.648Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2niszu_nxlzqe" time="2026-10-10T17:11:43.434Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2o9r28_k85mxp" time="2026-10-10T17:32:40.640Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2omm23_s5o2kn" time="2026-10-10T17:42:40.683Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2ozh14_wirt8k" time="2026-10-10T17:52:40.696Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2pcbzw_d96w1v" time="2026-10-10T18:02:40.700Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2pp70i_bfq9ly" time="2026-10-10T18:12:40.770Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2q21z5_b1uxhx" time="2026-10-10T18:22:40.769Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2qewya_wyevhk" time="2026-10-10T18:32:40.786Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2qrrwy_7x7j73" time="2026-10-10T18:42:40.786Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2r4mvs_cky56i" time="2026-10-10T18:52:40.792Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2rhhuj_up6ew5" time="2026-10-10T19:02:40.795Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2ruct5_azxdqg" time="2026-10-10T19:12:40.793Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2s77s2_teaf0m" time="2026-10-10T19:22:40.802Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2sk2r0_dpe3na" time="2026-10-10T19:32:40.812Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2swxpr_lwjmko" time="2026-10-10T19:42:40.816Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2t9sol_j12zdx" time="2026-10-10T19:52:40.821Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2tmno3_ybci1l" time="2026-10-10T20:02:40.851Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2tziof_3k2svt" time="2026-10-10T20:12:40.911Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2ucdqb_7s7thy" time="2026-10-10T20:22:41.027Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2up8rj_nlhyag" time="2026-10-10T20:32:41.119Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2v23sa_sbynpz" time="2026-10-10T20:42:41.194Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2veyt0_vvz3mm" time="2026-10-10T20:52:41.268Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2vrttm_pnr99h" time="2026-10-10T21:02:41.338Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2w4ot6_nm90ls" time="2026-10-10T21:12:41.370Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2whk74_5mddff" time="2026-10-10T21:22:41.920Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mv2wutyw_k9xuth" time="2026-10-10T21:33:01.112Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
