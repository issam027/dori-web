# Handover d’évolutions fonctionnelles — DORIFY

Date : 2026-10-11

## 1. Objet

Ce document compare les capacités exposées par le client OpenAPI actuel avec les fonctionnalités visibles dans l’IHM, puis propose les évolutions API et produit susceptibles d’améliorer l’adoption et la vente du SaaS.

Il contient trois catégories :

1. **API disponible** : endpoint généré existant, mais fonctionnalité absente ou partielle dans l’IHM.
2. **API à faire évoluer** : fonctionnalité utile nécessitant un nouveau contrat backend.
3. **Innovation produit** : proposition différenciante à valider commercialement puis à décliner en API/IHM.

Une case n’est cochée qu’après implémentation, tests, documentation et validation produit. Les noms de contrôleurs ci-dessous proviennent de `src/api/generated` au jour de l’audit ; le contrat OpenAPI reste la source de vérité.

## 2. Synthèse des opportunités

### Gains rapides avec l’API actuelle

- transformer la fiche personne en mini-CRM opérationnel ;
- permettre édition/suppression des notes avec permissions ;
- rendre les affectations managers/opérateurs entièrement administrables ;
- proposer un catalogue complet des niveaux de service ;
- permettre édition/suppression des règles de notification ;
- administrer le cycle complet des traductions ;
- gérer finement rôles et permissions ;
- compléter l’administration des comptes utilisateurs.

### Différenciants commerciaux prioritaires

- réservation omnicanale et widget intégrable ;
- file virtuelle avec heure d’arrivée conseillée ;
- notifications proactives et campagnes ciblées ;
- prévision d’affluence et recommandations de staffing ;
- enquête de satisfaction post-passage ;
- gestion de parc des bornes et écrans ;
- audit de conformité et SSO entreprise ;
- offres/quotas/facturation multi-tenant ;
- marque blanche et portail client.

## 3. Fonctionnalités déjà exposées par l’API

### A1 — Fiche personne complète / mini-CRM — P0

API disponible :

- `personsControllerFindPersons` ;
- `personsControllerCreatePerson` ;
- `personsControllerFindOne` ;
- `personsControllerUpdatePerson` ;
- `personsControllerDeletePerson`.

État IHM : recherche, consultation indirecte et création lors d’un accueil/rendez-vous existent. Il n’existe pas de véritable espace personne permettant de corriger, fusionner ou gérer son cycle de vie.

Fonctionnalité proposée :

- page « Personnes » avec recherche, filtres, pagination et site ;
- fiche avec identité, coordonnées, langue, date de naissance et historique ;
- modification avec contrôle des doublons téléphone/email ;
- suppression protégée, idéalement anonymisation RGPD plutôt que suppression physique ;
- accès depuis rendez-vous, file, cockpit et notifications ;
- journal des modifications sensibles.

Valeur commerciale : connaissance client, réduction des doublons, accueil plus rapide et base pour fidélisation/communication.

- [ ] A1.1 Ajouter la liste et la fiche personne.
- [ ] A1.2 Ajouter modification avec validation et détection de doublon.
- [ ] A1.3 Définir suppression, anonymisation et rétention RGPD.
- [ ] A1.4 Ajouter historique consolidé rendez-vous/tickets/notes/notifications.
- [ ] A1.5 Ajouter permissions dédiées lecture/édition/anonymisation.

### A2 — Cycle complet des notes — P0

API disponible :

- `personsControllerGetNotes` ;
- `personsControllerCreateNote` ;
- `personsControllerUpdateNote` ;
- `personsControllerDeleteNote`.

État IHM : lecture et ajout sont présents ; édition et suppression ne sont pas exploitées.

Fonctionnalité proposée : édition avec auteur/date de modification, suppression confirmée, types de note (interne, accessibilité, rendez-vous, litige), épinglage et filtrage. Une note système ne doit pas être modifiable comme une note humaine.

- [ ] A2.1 Ajouter édition et suppression conditionnées par permissions.
- [ ] A2.2 Afficher auteur, création, modification et origine système/humaine.
- [ ] A2.3 Ajouter catégories, épinglage et filtre.
- [ ] A2.4 Prévoir audit immuable des changements.

### A3 — Affectations managers et opérateurs — P0

API disponible :

- `sitesControllerGetManagers`, `AssignManager`, `RemoveManager` ;
- `queuesControllerGetOperators`, `AssignOperator`, `RemoveOperator`.

État IHM : affectation existe lors de certains parcours, mais listes et retrait explicite sont incomplets.

Fonctionnalité proposée : onglet « Équipe » par site/file, utilisateurs affectés, rôle effectif, disponibilité, affectation en masse et retrait. Montrer pourquoi un utilisateur a accès : rôle global, site ou file.

- [ ] A3.1 Lister managers du site et opérateurs de chaque file.
- [ ] A3.2 Ajouter retrait avec contrôle du dernier manager.
- [ ] A3.3 Ajouter affectation multiple et copie d’équipe entre files.
- [ ] A3.4 Afficher l’origine des permissions effectives.

### A4 — Catalogue complet des niveaux de service — P0

API disponible :

- `serviceTiersControllerFindTiers`, `CreateTier`, `FindTier`, `UpdateTier`, `DeleteTier` ;
- `AssociateTier`, `UpdateQueueTier`, `RemoveQueueTier` ;
- `GetRules`, `CreateRule`, `UpdateRule`, `DeleteRule`.

État IHM : consultation, association et création de règle existent partiellement. Le CRUD complet et la maintenance des associations/règles sont absents ou incomplets.

Fonctionnalité proposée : catalogue global, prix/devise, avantages, activation, ordre d’affichage, forfait par défaut, règles SMS/welcome/tracking, aperçu public et duplication.

Valeur commerciale : création d’offres premium, monétisation de priorité ou services additionnels.

- [ ] A4.1 CRUD complet du catalogue des niveaux.
- [ ] A4.2 Modifier/supprimer l’association file-niveau.
- [ ] A4.3 Modifier/supprimer les règles de notification.
- [ ] A4.4 Ajouter duplication et aperçu borne.
- [ ] A4.5 Empêcher la suppression si des inscriptions historiques l’utilisent ; archiver à la place.

### A5 — Administration des traductions — P1

API disponible : `GetBundle`, `FindTranslations`, `CreateTranslation`, `UpdateTranslation`, `DeleteTranslation`.

État IHM : bundle, liste et création sont utilisés ; édition et suppression ne le sont pas complètement.

Fonctionnalité proposée : éditeur par langue/catégorie, comparaison côte à côte, variables attendues, aperçu, brouillon/publication, import/export CSV et historique.

- [ ] A5.1 Ajouter édition/suppression contrôlée.
- [ ] A5.2 Ajouter comparaison FR/EN/AR et détection des clés manquantes.
- [ ] A5.3 Valider les placeholders avant publication.
- [ ] A5.4 Ajouter import/export et rollback de version.

### A6 — Administration avancée utilisateurs/rôles — P0

API disponible :

- `usersControllerFindUsers`, `CreateUser`, `FindUserById`, `UpdateUser`, `DeleteUser` ;
- `UpdateUserStatus`, `SetUserPassword` ;
- `AssignUserRole`, `RemoveUserRole`, `GetRoles`, `UpdateRolePermissions`.

État IHM : liste, création, modification partielle, statut, mot de passe et affectation de rôle existent ; détail, suppression, retrait de rôle et édition des permissions ne constituent pas une expérience complète.

- [ ] A6.1 Ajouter fiche utilisateur avec sites/files/rôles effectifs.
- [ ] A6.2 Ajouter retrait de rôle et suppression/désactivation sécurisée.
- [ ] A6.3 Ajouter matrice de permissions par rôle avec avertissement d’impact.
- [ ] A6.4 Ajouter clonage d’un utilisateur ou profil de droits.
- [ ] A6.5 Ajouter date de dernière connexion et sessions actives si l’API évolue.

### A7 — Détails directs de file et configuration héritée — P1

API disponible : `queuesControllerFindOne`, statuts, display et DTO `QueueConfigOriginsResponseDto` décrivant l’origine de nombreux paramètres.

Opportunité : page détail d’une file avec configuration effective et indication « valeur du site » versus « surcharge de la file ». Ajouter bouton restaurer l’héritage pour chaque paramètre.

- [ ] A7.1 Exploiter le détail de file plutôt que retrouver l’élément dans une liste.
- [ ] A7.2 Afficher origine/effectivité des paramètres.
- [ ] A7.3 Ajouter restauration de l’héritage si le backend l’autorise.

### A8 — Webhooks : visibilité opérationnelle, pas exposition brute — P1

API existante : `notificationsControllerHandleWebhook` est un endpoint serveur-à-serveur et ne doit pas être appelé par l’IHM.

Évolution IHM utile : afficher les statuts de livraison, erreurs fournisseur, tentatives et timeline. L’API devra exposer une lecture sécurisée des livraisons si elle ne le fait pas déjà.

- [ ] A8.1 Confirmer que l’endpoint webhook reste exclusivement backend.
- [ ] A8.2 Ajouter timeline de livraison et diagnostic administrateur.

## 4. Évolutions nécessaires de l’API

### B1 — Vue client 360° agrégée — P0

Nouveaux services proposés :

- `GET /persons/{id}/timeline` : rendez-vous, tickets, notes et notifications paginés ;
- `GET /persons/duplicates` et `POST /persons/merge` ;
- `POST /persons/{id}/anonymize` avec motif, base légale et audit ;
- `POST /persons/batch` pour résoudre plusieurs IDs en une requête.

Bénéfice : élimine les N+1 actuels et fournit un dossier client commercialement valorisable.

- [ ] B1.1 Spécifier timeline et filtres.
- [ ] B1.2 Spécifier détection/fusion avec stratégie de conflit.
- [ ] B1.3 Spécifier anonymisation irréversible et rétention.
- [ ] B1.4 Ajouter endpoint batch.

### B2 — Disponibilités et réservation enrichies — P0

Nouveaux besoins :

- disponibilités sur intervalle, fuseau horaire explicite et capacité restante ;
- motifs/type de rendez-vous, durée variable et ressources nécessaires ;
- mise en attente d’un créneau quelques minutes pendant le formulaire ;
- séries/récurrence, liste d’attente et proposition automatique en cas d’annulation ;
- lien de modification/annulation autonome sécurisé pour le client ;
- politique no-show, retard et check-in anticipé configurable.

Services : `POST /appointment-holds`, `DELETE /appointment-holds/{token}`, `GET /availability/range`, `POST /appointments/{id}/cancel-link`, `POST /waitlist`.

- [ ] B2.1 Contrat de réservation temporaire anti-concurrence.
- [ ] B2.2 Disponibilités multi-jours et timezone IANA.
- [ ] B2.3 Liste d’attente avec offre expirante.
- [ ] B2.4 Self-service client sécurisé sans compte.
- [ ] B2.5 Ressources/durées/types de rendez-vous.

### B3 — File virtuelle et heure d’arrivée conseillée — P0

Fonctionnalité : le client réserve une place à distance et reçoit une fenêtre d’arrivée. Le système ajuste l’estimation selon débit réel, absences, rendez-vous et staffing.

Services proposés :

- `POST /public/virtual-queue/join` ;
- `POST /public/registrations/{token}/confirm-arrival` ;
- `POST /public/registrations/{token}/delay` ;
- `GET /public/registrations/{token}/eta-history`.

Garde-fous : distance maximale optionnelle, expiration, anti-abus, consentement notification et capacité journalière.

- [ ] B3.1 Modéliser réservation distante versus présence physique.
- [ ] B3.2 Ajouter confirmation d’arrivée et tolérance.
- [ ] B3.3 Ajouter recalcul ETA et historique explicable.

### B4 — Temps réel unifié — P0

Besoin : remplacer la multiplication des pollings par SSE/WebSocket pour display, tracking, cockpit et supervision.

Services : flux par site/file/registration, événement versionné (`registration.called`, `queue.updated`, `desk.opened`, etc.), reprise par last-event-id et endpoint snapshot de rattrapage.

- [ ] B4.1 Définir catalogue d’événements et ordre/idempotence.
- [ ] B4.2 Ajouter SSE avec authentification adaptée public/privé.
- [ ] B4.3 Conserver fallback polling avec backoff.
- [ ] B4.4 Mesurer connexions et quotas serverless avant choix d’hébergement.

### B5 — Notifications omnicanales et campagnes — P0/P1

Étendre SMS aux emails, WhatsApp et push web. Ajouter modèles versionnés, consentements, préférences et campagnes ciblées : rappel J-1, rappel H-2, retard, tour proche, satisfaction.

Services :

- CRUD `/notification-templates` ;
- CRUD `/campaigns`, preview, estimation audience, planification/annulation ;
- `/persons/{id}/communication-preferences` ;
- `/notifications/deliveries/{id}` avec tentatives ;
- webhooks fournisseurs normalisés.

- [ ] B5.1 Consentement et opt-out par canal.
- [ ] B5.2 Templates localisés avec aperçu.
- [ ] B5.3 Campagnes segmentées et planifiées.
- [ ] B5.4 Timeline livraison, coûts et taux de succès.
- [ ] B5.5 Quotas/limites pour prévenir abus et surcoût.

### B6 — Satisfaction et qualité de service — P1

Après passage, envoyer une enquête courte CSAT/NPS et motif facultatif. Relier le score au site, file, créneau et temps réel vécu sans évaluer publiquement un agent nominativement par défaut.

Services : `POST /public/feedback`, `GET /feedback/summary`, `GET /feedback/themes`, règles d’envoi et modération.

- [ ] B6.1 Questionnaire configurable et anonyme/identifié.
- [ ] B6.2 Dashboards CSAT/NPS, verbatims et thèmes.
- [ ] B6.3 Alertes sur insatisfaction critique.
- [ ] B6.4 Politique de rétention et protection des agents.

### B7 — Prévision d’affluence et staffing — P1

Fonctionnalité différenciante : prévision par tranches de 15/30 minutes, recommandation du nombre de guichets et alerte de sous-capacité.

Services : `GET /forecasts/queues/{id}`, `GET /staffing/recommendations`, `POST /staffing/plans`, comparaison prévu/réel.

Commencer par statistiques explicables (historique, jour, saisonnalité), avant toute promesse « IA ».

- [ ] B7.1 Construire historique agrégé respectueux de la rétention.
- [ ] B7.2 Afficher intervalle de confiance et facteurs.
- [ ] B7.3 Planning de capacité et recommandations.
- [ ] B7.4 Mesurer précision avant commercialisation.

### B8 — Rapports et BI professionnels — P1

Nouveaux services : agrégation serveur sur intervalle, comparaison périodes/sites, percentiles P50/P90/P95, taux d’abandon, respect SLA, capacité, exports asynchrones et connecteur BI.

- [ ] B8.1 Endpoint rapport d’intervalle multi-files.
- [ ] B8.2 Comparaison période précédente et objectifs.
- [ ] B8.3 Exports CSV/XLSX/PDF générés côté serveur.
- [ ] B8.4 API analytique ou exports vers Power BI/Looker.
- [ ] B8.5 Rapports programmés par email.

### B9 — Audit, sécurité et conformité entreprise — P0 Enterprise

Services proposés :

- journal d’audit immuable : qui, quoi, avant/après, IP, correlation ID ;
- sessions actives, révocation ciblée et appareils ;
- MFA TOTP/WebAuthn ;
- SSO OIDC/SAML et provisioning SCIM ;
- politiques mot de passe/session par tenant ;
- export RGPD et registre de consentement.

- [ ] B9.1 Audit log filtrable/exportable.
- [ ] B9.2 Gestion des sessions et révocation ciblée.
- [ ] B9.3 MFA puis OIDC/SAML.
- [ ] B9.4 SCIM pour grands comptes.
- [ ] B9.5 Outils droits d’accès/effacement/portabilité.

### B10 — Multi-tenant, abonnements et quotas — P0 commercial

Le modèle commercial exige tenant/organisation distinct du site : propriétaire, abonnement, limites, facturation et feature flags.

Services : organisations, memberships, plans, subscriptions, entitlements, usage counters, invoices, billing portal et webhooks paiement.

- [ ] B10.1 Introduire tenant explicite et isolation garantie.
- [ ] B10.2 Feature flags dérivés de l’abonnement côté serveur.
- [ ] B10.3 Compteurs sites/files/utilisateurs/SMS/stockage.
- [ ] B10.4 Intégration paiement et factures.
- [ ] B10.5 Essai, upgrade/downgrade, grâce et suspension.

### B11 — Gestion de parc des appareils — P1

Borne et écran salle doivent devenir des appareils enregistrés : code d’activation court, site/file, dernière présence, version, thème, mode, orientation et configuration distante.

Services : `/devices`, `/devices/{id}/heartbeat`, activation, rotation du secret, configuration et révocation.

- [ ] B11.1 Appairage sans compte humain permanent.
- [ ] B11.2 Statut en ligne/hors ligne et dernière synchro.
- [ ] B11.3 Configuration distante et redémarrage logique.
- [ ] B11.4 Alertes appareil indisponible.

### B12 — Intégrations et écosystème — P1/P2

Proposer webhooks sortants signés, clés API limitées, sandbox, journaux de livraison et connecteurs calendrier/CRM.

Connecteurs prioritaires : Google/Microsoft Calendar, Outlook/ICS, Teams, Slack, Zapier/Make, CRM et annuaires d’entreprise.

- [ ] B12.1 Clés API par scope avec rotation.
- [ ] B12.2 Webhooks sortants configurables et rejouables.
- [ ] B12.3 Synchronisation calendrier bidirectionnelle.
- [ ] B12.4 Portail développeur, sandbox et exemples.

### B13 — Import, migration et opérations de masse — P1

Services : imports asynchrones personnes/utilisateurs/sites/files, validation à blanc, rapport d’erreurs, idempotency key, exports et opérations bulk.

- [ ] B13.1 Import CSV avec dry-run et mapping colonnes.
- [ ] B13.2 Jobs asynchrones consultables/rejouables.
- [ ] B13.3 Endpoints batch et idempotence.
- [ ] B13.4 Export avant migration/suppression.

## 5. Innovations produit et potentiel commercial

### C1 — Widget de réservation marque blanche — P0

Widget responsive intégrable sur le site du client, configuration visuelle, langue, service/site, analytics de conversion et domaine autorisé. Alternative lien hébergé et QR de campagne.

Modèle commercial : inclus Pro avec limites ; domaines et marque blanche avancée en Enterprise.

- [ ] C1.1 SDK/widget embarqué sécurisé.
- [ ] C1.2 Générateur de lien/QR par campagne.
- [ ] C1.3 Tracking conversion sans données publicitaires intrusives.

### C2 — Portail client « Mes rendez-vous » — P1

Espace sans mot de passe via magic link ou OTP : rendez-vous futurs, annulation/reprogrammation, documents, préférences et historique récent.

- [ ] C2.1 Authentification OTP/magic link anti-abus.
- [ ] C2.2 Gestion autonome des rendez-vous selon règles.
- [ ] C2.3 Préférences de communication et données personnelles.

### C3 — Accueil inclusif et besoins spécifiques — P1

Permettre de déclarer discrètement mobilité réduite, déficience auditive/visuelle, besoin de langue ou accompagnement. Ne jamais transformer automatiquement un besoin en priorité sans politique explicite.

- [ ] C3.1 Besoins configurables et consentis.
- [ ] C3.2 Mode borne haute lisibilité, lecteur d’écran et parcours simplifié.
- [ ] C3.3 Routage vers agent/langue/guichet adapté.
- [ ] C3.4 Audit accessibilité WCAG 2.2 AA.

### C4 — Orchestration intelligente des files — P1

Routage multi-compétences : un agent déclare ses compétences ; le moteur choisit file/guichet selon SLA, priorité, rendez-vous, durée estimée et compétences. Mode suggestion avant automatisation complète.

- [ ] C4.1 Modèle compétences agent/service.
- [ ] C4.2 Simulation explicable avant activation.
- [ ] C4.3 Règles de fairness et anti-contournement.
- [ ] C4.4 Tableau gain prévu/réel.

### C5 — Mode dégradé et continuité d’activité — P1

Pour les sites à connectivité instable : affichage conservé, inscription locale limitée, file de synchronisation chiffrée, prévention des doublons et procédure de réconciliation.

- [ ] C5.1 Définir quelles actions fonctionnent hors ligne.
- [ ] C5.2 PWA, cache contrôlé et stockage chiffré.
- [ ] C5.3 Réconciliation idempotente et écran opérateur.
- [ ] C5.4 Journal visible de la santé réseau.

### C6 — Objectifs SLA et alertes actionnables — P1

Définir objectifs par site/file/niveau : attente P90, service, no-show. Alertes avec cause probable et action recommandée : ouvrir un guichet, transférer un agent, prévenir les clients.

- [ ] C6.1 CRUD objectifs et calendriers applicables.
- [ ] C6.2 Alertes avec seuil/hystérésis anti-bruit.
- [ ] C6.3 Accusé de prise en compte et post-mortem.

### C7 — Marque blanche et personnalisation — P1

Logo, couleurs contrôlées, domaine, emails/SMS, ticket, page tracking, écran salle, mentions légales et thèmes par organisation/site, avec validation automatique du contraste.

- [ ] C7.1 Brand kit versionné avec aperçu multi-écrans.
- [ ] C7.2 Domaine personnalisé et certificats.
- [ ] C7.3 Contrôle contraste et fallback DORIFY supportable.

### C8 — Marketplace de modèles — P2

Bibliothèque de configurations par secteur : mairie, clinique, banque, retail, SAV, événement. Un modèle installe files, niveaux, règles, traductions et KPIs recommandés.

- [ ] C8.1 Format de template versionné.
- [ ] C8.2 Assistant « démarrer depuis un secteur ».
- [ ] C8.3 Galerie et duplication sans données personnelles.

## 6. Packaging commercial suggéré

### Essential

- un nombre limité de sites/files/utilisateurs ;
- borne, display, file et rendez-vous standard ;
- suivi QR ;
- rapports essentiels ;
- email support.

### Pro

- multi-sites ;
- SMS/WhatsApp selon consommation ;
- widget de réservation ;
- niveaux de service et règles avancées ;
- rapports programmés, satisfaction et marque personnalisée ;
- gestion de parc appareils.

### Business

- prévision et staffing ;
- campagnes ;
- API/webhooks/connecteurs ;
- objectifs SLA et exports BI ;
- support prioritaire.

### Enterprise

- SSO/SCIM/MFA ;
- audit et rétention personnalisée ;
- domaine/marque blanche complète ;
- région de données, SLA contractuel ;
- sandbox, accompagnement migration et support dédié.

Principes : les limites doivent être imposées côté API, visibles avant blocage et mesurables. Ne jamais réserver accessibilité, sécurité de base ou export RGPD à une offre premium.

- [ ] C9.1 Valider les plans avec ventes et clients pilotes.
- [ ] C9.2 Définir entitlements et quotas côté serveur.
- [ ] C9.3 Ajouter page usage/abonnement et alertes de seuil.
- [ ] C9.4 Mesurer activation, conversion, churn et coût par tenant.

## 7. Priorisation recommandée

### V1.1 — Valoriser immédiatement l’API existante

1. A1 fiche personne.
2. A2 notes complètes.
3. A3 équipes et retraits d’affectation.
4. A4 catalogue/niveaux/règles complets.
5. A6 comptes, rôles et permissions.
6. A5 traductions complètes.

### V1.2 — Réduire l’attente et les no-shows

1. B2 réservation enrichie.
2. B3 file virtuelle.
3. B5 rappels omnicanaux.
4. B6 satisfaction.
5. C1 widget de réservation.

### V1.3 — Exploitation multi-sites

1. B4 temps réel.
2. B8 BI/rapports.
3. B11 parc appareils.
4. C6 SLA et alertes.
5. B7 prévision/staffing.

### V2 — Passage à l’échelle commercial

1. B10 tenant/abonnement/quotas.
2. B9 sécurité Enterprise.
3. B12 intégrations.
4. C7 marque blanche.
5. C4 routage par compétences.
6. C5 continuité hors ligne.

## 8. KPIs produit à instrumenter

- délai entre création du tenant et premier ticket réussi ;
- taux de finalisation onboarding ;
- attente moyenne et P90/P95 ;
- précision ETA ;
- no-show et abandon ;
- taux de reprogrammation autonome ;
- notifications délivrées/cliquées et coût par canal ;
- disponibilité bornes/displays ;
- CSAT/NPS et taux de réponse ;
- utilisateurs actifs par rôle/site ;
- adoption des fonctionnalités par plan ;
- conversion essai → payant, expansion multi-site et churn.

- [ ] K1 Définir événements analytiques sans données sensibles inutiles.
- [ ] K2 Ajouter dictionnaire de données et consentement.
- [ ] K3 Créer dashboard interne produit/commercial.
- [ ] K4 Ajouter alertes de dérive coût, performance et disponibilité.

## 9. Garde-fous indispensables

- isolation tenant testée automatiquement ;
- RBAC vérifié côté API, jamais seulement dans l’IHM ;
- idempotence des créations/paiements/notifications ;
- fuseaux horaires IANA et business date explicite ;
- consentement et opt-out par canal ;
- audit des opérations destructrices ;
- anonymisation et rétention ;
- accessibilité WCAG 2.2 AA ;
- limites et coûts affichés ;
- fonctionnalité expérimentale derrière feature flag ;
- observabilité par correlation ID sans exposer de secrets.

## 10. Définition de terminé d’une évolution

- [ ] Besoin, persona et résultat attendu documentés.
- [ ] Contrat OpenAPI, permissions et erreurs métier définis.
- [ ] Migration et compatibilité ascendante prévues.
- [ ] IHM responsive, quatre thèmes, i18n et accessibilité validés.
- [ ] Tests unitaires, intégration, contrat et E2E réussis.
- [ ] Métriques, logs, audit et alertes disponibles.
- [ ] Documentation support/utilisateur publiée.
- [ ] Entitlement et coût opérationnel validés.
- [ ] Déploiement progressif et rollback préparés.

## 11. Journal de validation

```md
### AAAA-MM-JJ — Identifiant et titre

- Cases cochées :
- Contrats API ajoutés/utilisés :
- Écrans et parcours :
- Permissions et garde-fous :
- Tests :
- Métriques avant/après :
- Offre commerciale concernée :
- Risques ou suite :
```
