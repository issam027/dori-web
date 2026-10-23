# Handover — migration de tous les identifiants métier de `number` vers GUID

## 1. Objectif et règle de migration

Ce document est le plan d'exécution de la migration du front Dori Web lorsque tous les identifiants métier exposés par l'API passent d'entiers à des GUID.

La représentation front retenue doit être **`string` de bout en bout**. Un GUID est une valeur opaque : il ne doit jamais être converti en nombre, trié numériquement, incrémenté, tronqué ou utilisé dans un calcul. La base de données peut employer un type `uuid` natif, mais le contrat HTTP/JSON doit exposer une chaîne.

Exemple de contrat OpenAPI attendu :

```yaml
siteId:
  type: string
  format: uuid
```

Pour une liste :

```yaml
queueIds:
  type: array
  items:
    type: string
    format: uuid
```

Dans ce document, `Guid` désigne éventuellement un alias TypeScript :

```ts
export type Guid = string;
```

L'alias est utile pour documenter l'intention mais ne garantit pas à lui seul qu'une chaîne est un UUID. Ne créer un type nominal (`type Guid = string & { ... }`) que si toute la frontière API est capable de le produire sans casts dispersés. Sinon, conserver `string` dans le client généré.

## 2. Périmètre exact relevé dans le dépôt

Le client OpenAPI généré contient actuellement **131 propriétés d'identifiant numériques**, réparties entre DTO de requête, DTO de réponse et paramètres de recherche. Le contrat contient également **89 occurrences d'identifiants numériques dans les paramètres path/query**.

Familles à migrer :

| Identifiant                                                                                | Nature / relations à contrôler                                  |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `siteId`, `siteIds`, `siteScopeId`                                                         | site, portée d'audit et périmètre utilisateur                   |
| `queueId`, `queueIds`                                                                      | file, rattachement au site, filtres et expériences publiques    |
| `tierId`, `tierIds`                                                                        | niveau de service et association file/niveau                    |
| `ruleId`                                                                                   | règle de notification d'une association file/niveau             |
| `personId`                                                                                 | personne et recherche de personnes                              |
| `noteId`                                                                                   | note d'une personne                                             |
| `registrationId`, `currentRegistrationId`, `reassignedRegistrationId`                      | inscription, passage, rendez-vous et appel courant              |
| `notificationId`                                                                           | notification/outbox                                             |
| `sessionId`, `handledBySessionId`, `servedBySessionId`, `takenOverFromSessionId`           | session de guichet et traçabilité d'une inscription             |
| `userId`, `userIds`, `actorUserId`, `createdByUserId`, `handledByUserId`, `servedByUserId` | utilisateur et références d'audit/métier                        |
| `roleId`                                                                                   | rôle utilisateur                                                |
| `translationId`                                                                            | traduction administrable                                        |
| `targetId`                                                                                 | cible polymorphe d'audit ; voir décision obligatoire ci-dessous |
| `id`                                                                                       | identifiant générique de `DeleteItemResponseDto`                |

Décisions contractuelles obligatoires avant de modifier le front :

- Confirmer le format accepté : UUID canonique avec tirets, casse normalisée (recommandation : minuscules), versions UUID autorisées.
- Confirmer si les GUID sont générés par le serveur. Le front ne doit en générer que si le contrat l'exige explicitement.
- Confirmer si `targetId` d'audit devient toujours un GUID. S'il peut désigner des cibles non UUID, le typer `string` sans `format: uuid`.
- Confirmer si `DeleteItemResponseDto.id` est toujours un identifiant métier. S'il est polymorphe, utiliser `string` sans validation UUID stricte.
- Confirmer la forme des tableaux en query (`queueIds`, `tierIds`, `userIds`) : paramètres répétés, CSV ou autre. La sérialisation doit être documentée par OpenAPI.
- Confirmer la stratégie de compatibilité pendant le déploiement : bascule atomique recommandée, ou fenêtre transitoire `number | string` uniquement à la frontière réseau. Aucun union type transitoire ne doit contaminer l'IHM.
- Confirmer que `eventId` d'audit, déjà `string`, est bien un GUID ou une autre clé. Ne pas le modifier aveuglément.
- Ne pas confondre les GUID avec le `registrationTrackingToken`, les codes, numéros de ticket, numéros de guichet, pages, seuils, durées, positions et compteurs : ceux-ci restent des chaînes métier ou des nombres.

## 3. Ordre de bascule recommandé

1. Geler brièvement les évolutions qui ajoutent des identifiants et établir un commit de référence vert.
2. Faire évoluer base de données et back-end avec conservation explicite des clés étrangères, index, uniques, tables de jointure, données d'audit et événements.
3. Publier le nouveau document OpenAPI ; chaque ID doit y être `type: string`, idéalement `format: uuid`.
4. Remplacer `specifications/docs-json.json`, puis adapter `tools/openapi/normalize-spec.mjs`.
5. Régénérer `src/api/generated` avec `npm run api:generate`. Ne jamais corriger les fichiers générés à la main.
6. Faire échouer le typecheck et corriger successivement : infrastructure commune, API/services, hooks/stores, IHM, fixtures/tests.
7. Valider l'ensemble avec les recherches résiduelles et les commandes de recette de la section 12.
8. Déployer le front et l'API de manière atomique. Si impossible, introduire un adaptateur temporaire versionné, instrumenté et supprimé juste après la bascule.

## 4. Contrat OpenAPI, DTO et génération

### 4.1 DTO à contrôler explicitement

Après régénération, ouvrir les modèles de `src/api/generated/models` correspondant aux groupes suivants et vérifier que chaque champ listé vaut `string`, `string[]` ou est optionnel/nullable sans perdre cette cardinalité.

| Groupe de DTO            | Champs à vérifier                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit                    | `AuditControllerSearchParams.actorUserId/siteId/targetId`, `AuditEventResponseDto.actorUserId/siteScopeId`, `AuditEventDetailResponseDto.actorUserId/siteScopeId`                                                                                                                                                                                           |
| Auth et scope            | `AuthUserDto.userId`, `CurrentUserResponseDto.userId`, `LogoutDto.userId`, `UserScopeDto.siteIds/queueIds`                                                                                                                                                                                                                                                  |
| Sites                    | `SiteResponseDto.siteId`, `DeleteSiteResponseDto.siteId`, `UserSiteItemDto.siteId`, DTO d'affectation directe `siteId/userId`                                                                                                                                                                                                                               |
| Files                    | `QueueResponseDto.queueId/siteId`, `QueueStatusResponseDto.queueId`, `QueueDisplayResponseDto.queueId`, `QueuePreviewItemDto.queueId/registrationId`, `DeleteQueueResponseDto.queueId`, `ResetQueueResponseDto.queueId`, `UserQueueItemDto.queueId/siteId`                                                                                                  |
| Niveaux/règles           | `ServiceTierResponseDto.tierId`, `QueueTierResponseDto.queueId/tierId`, `AssociateQueueTierDto.tierId`, `NotificationRuleResponseDto.ruleId/queueId/tierId`, `DeleteTierResponseDto.ruleId/queueId/tierId`                                                                                                                                                  |
| Personnes/notes          | `CreatePersonDto.siteId`, `PersonResponseDto.personId/siteId`, `QueueCandidatePersonItemDto.personId`, `PersonNoteResponseDto.noteId/personId/createdByUserId`                                                                                                                                                                                              |
| Inscriptions/rendez-vous | `CreateRegistrationDto.personId/queueId/tierId`, tous les DTO de réponse portant `registrationId`, `RegistrationResponseDto.personId/queueId/tierId/servedBySessionId/servedByUserId`, `UpdateRegistrationDto.tierId`, `NextAppointmentItemDto.registrationId`, `RegistrationAvailabilityResponseDto.queueId`                                               |
| Sessions/guichet         | `QueueSessionResponseDto.sessionId/queueId/userId/takenOverFromSessionId/reassignedRegistrationId`, `ThreadSessionItemDto.sessionId/userId/currentRegistrationId`, `CallNextRegistrationResponseDto.registrationId/sessionId`, `CloseSessionResponseDto.sessionId`, `UpdateRegistrationStatusResponseDto.registrationId/handledBySessionId/handledByUserId` |
| Notifications            | `NotificationResponseDto.notificationId/registrationId`, `SendManualNotificationDto.registrationId`                                                                                                                                                                                                                                                         |
| Utilisateurs/rôles       | tous les DTO avec `userId`, `roleId`, ainsi que `MonitoringLiveOperatorDto.userId/sessionId/currentRegistrationId/queueIds`                                                                                                                                                                                                                                 |
| Monitoring/rapports      | `Monitoring*Dto.siteId/queueId/tierId/userId`, `MonitoringAppliedFiltersDto.siteId/queueIds/tierIds/userIds`                                                                                                                                                                                                                                                |
| Traductions              | `TranslationResponseDto.translationId`, `DeleteTranslationResponseDto.translationId`                                                                                                                                                                                                                                                                        |
| Réponse générique        | `DeleteItemResponseDto.id`                                                                                                                                                                                                                                                                                                                                  |

Préserver exactement les caractères optionnel `?`, nullable et tableaux du contrat actuel. La migration du type de valeur ne doit pas rendre un champ obligatoire ni supprimer `null`.

### 4.2 Paramètres HTTP à vérifier

Contrôler les signatures générées pour tous les endpoints suivants :

- Audit : `GET /audit-events` (`siteId`, `actorUserId`, `targetId`).
- Sites : CRUD `/sites/{siteId}` et `/sites/{siteId}/direct-users/{userId}`.
- Files : filtre `GET /queues?siteId=`, CRUD `/sites/{siteId}/queues`, `/queues/{queueId}`, status, display, reset, opérateurs.
- Tiers : `/tiers/{tierId}`, `/queues/{queueId}/tiers/{tierId}` et règles `/notification-rules/{ruleId}`.
- Personnes : filtre `siteId`, `/persons/{personId}` et `/persons/{personId}/notes/{noteId}`.
- Inscriptions : filtres `queueId/siteId/personId/servedByUserId/tierId`, CRUD, reschedule et check-in par `registrationId`.
- Disponibilités et preview : `/queues/{queueId}/availability`, `/sites/{siteId}/next-preview`.
- Guichet : threads/sessions/next par `queueId`, fermeture par `sessionId`, served/no-show par `registrationId`.
- Notifications : filtres `registrationId/queueId/siteId`, détail et resend par `notificationId`.
- Traductions : patch/delete par `translationId`.
- Utilisateurs/rôles : CRUD/status/password/roles par `userId`, retrait par `roleId`, permissions par `roleId`.
- Monitoring : `siteId` de `/monitoring/live` et `/monitoring/series`.

### 4.3 Normaliseur et client généré

`tools/openapi/normalize-spec.mjs` contient trois overrides d'ID qui imposent actuellement `number` :

- `ThreadSessionItemDto.currentRegistrationId`
- `QueueSessionResponseDto.takenOverFromSessionId`
- `QueueSessionResponseDto.reassignedRegistrationId`

Les supprimer si le Swagger corrigé est juste, ou les passer temporairement à `string` si le producteur OpenAPI reste erroné. Un override est une dette : ajouter un commentaire et un test, puis le retirer dès correction du back-end.

Après `npm run api:generate` :

- vérifier qu'aucun fichier sous `src/api/generated/models` ne déclare un champ `*Id`/`*Ids` en `number` ;
- vérifier que les fonctions contrôleur prennent des `string` pour path/query/body ;
- vérifier l'encodage URL des GUID et la sérialisation des tableaux ;
- inspecter le diff généré avant toute correction applicative ;
- exécuter `npm run api:check` à la fin pour garantir la reproductibilité.

## 5. Infrastructure front commune

### 5.1 Clés React Query

Modifier `src/api/client/query-keys.ts` pour remplacer uniquement les types d'identifiants par `string`/`Guid` : sites, queues, registrations, persons, tiers, appointments, notifications, reports, monitoring, admin, opérateurs et expériences publiques. Les numéros de page, tailles de page et valeurs métriques restent `number`.

Points sensibles :

- `reports.daily` et `dailyByGranularity` : `readonly string[]` pour `queueIds`.
- `registrations.operator` : `userId` et `siteId` en chaîne, mais `pageSize` reste numérique.
- Les clés React Query acceptent les chaînes sans autre transformation. Conserver une représentation canonique pour éviter deux caches pour le même UUID avec des casses différentes.
- Ne pas concaténer plusieurs GUID sans séparateur pour fabriquer une clé.

Adapter `src/api/client/query-invalidations.ts` (`personId`) et les tests `query-keys.test.ts` / `use-business-mutation.test.tsx`.

### 5.2 Scope et stockage navigateur

Dans `src/core/scope/scope-store.ts` :

- passer `activeSiteId`, `activeQueueId`, `resourceId`, `allowedIds` et setters en chaînes ;
- remplacer `Number(sessionStorage.getItem(...))` et le contrôle `Number.isInteger(...)` par une lecture de chaîne ;
- considérer `null`, chaîne vide et valeur invalide comme absence ;
- si validation souhaitée, centraliser `isGuid`/schéma Zod, sans jeter une erreur au chargement d'une ancienne session ;
- conserver `allowedIds.includes(resourceId)`, qui devient une comparaison de chaînes ;
- purger ou versionner `storageKeys.session.activeSiteId` afin qu'un ancien ID numérique ne survive pas à la livraison ;
- vérifier que logout/clear supprime toujours la valeur.

Adapter `src/core/auth/session-actions.ts` (`siteId`) et ses tests, ainsi que `src/app/layouts/Topbar.tsx` et `src/core/permissions/permissions.ts`.

### 5.3 Stores et structures indexées par ID

Dans `src/features/queue-operations/operation-store.ts` :

- `PassageSummary.registrationId` devient chaîne ;
- `Record<number, ...>` devient `Record<string, ...>` ;
- `startCall` et `closeCall` reçoivent un `queueId: string` ;
- supprimer `Number(key) !== queueId` et comparer directement `key !== queueId` ;
- mettre à jour les fixtures/tests du store avec de vrais GUID.

Faire la même revue pour tout `Record`, `Map`, `Set`, index d'objet ou ensemble : notamment `ReadonlySet<number>` des commandes en attente dans `CockpitPage.tsx` et `Set<number>` des tests E2E du guichet.

## 6. Services API et actions métier manuelles

Le client généré changera automatiquement, mais les wrappers manuels doivent suivre :

| Fichier                                                               | Changements                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/features/portfolio/api/sites-api.ts`                             | `siteId` des find/deactivate/reactivate en chaîne                       |
| `src/features/queues/api/queues-api.ts`                               | `queueId` de status en chaîne                                           |
| `src/features/persons/api/persons-api.ts`                             | `personId` de find/update/delete en chaîne                              |
| `src/features/notes/api/notes-api.ts`                                 | `personId` et `noteId` en chaîne                                        |
| `src/features/appointments/appointment-actions.ts`                    | `registrationId` (`id`) des update/cancel/reschedule/check-in en chaîne |
| `src/features/queue-operations/operation-actions.ts`                  | `queueId` de call-next en chaîne                                        |
| `src/features/audit/api/audit-api.ts`                                 | revoir les filtres d'IDs ; `eventId` est déjà chaîne                    |
| `src/features/onboarding/api/onboarding-api.ts`                       | vérifier chaque site/file/tier/règle/user créé ou associé               |
| `src/features/cockpit/api/quick-registration-api.ts`                  | contrôler IDs du payload et réponses                                    |
| `src/features/supervision/api/control-room-api.ts`                    | `siteId`/`queueId` et reset                                             |
| `src/features/notifications/notification-actions.ts` ou client direct | `notificationId`, `registrationId`, `queueId`, `siteId`                 |

Règles : aucune conversion `Number`, `parseInt`, `Math.*` ni opérateur unaire `+` sur un ID ; utiliser `encodeURIComponent` si une URL est construite à la main ; ne pas réécrire un UUID dans `http-client.ts`.

## 7. Hooks

Modifier les signatures et variables de mutation des hooks suivants :

- `src/features/portfolio/hooks/useSites.ts` et `usePortfolioSummaries.ts` : `siteId`.
- `src/features/queues/hooks/useQueues.ts` : `siteId` et IDs transitifs des DTO.
- `src/features/persons/hooks/usePersons.ts` : `siteId`, `personId`.
- `src/features/notes/hooks/usePersonNotes.ts` : `personId`, `noteId`.
- `src/features/appointments/hooks/useAppointments.ts` : `siteId`, `queueId`, `registrationId`.
- `src/features/queue-operations/hooks/useQueueOperations.ts` : `registrationId`, `userId`, `siteId`, `queueId`, `queueIds`, `sessionId`.
- `src/features/notifications/hooks/useNotifications.ts` : `notificationId`, `personId`, `siteId`.
- `src/features/reports/hooks/useReports.ts` : `siteId`, `queueId`.
- `src/features/supervision/hooks/useControlRoom.ts` : `siteId`, `queueId` ; `refreshInterval` reste `number | false`.
- `src/features/onboarding/hooks/useSettingsData.ts` : `siteId` et IDs inclus dans les données.
- `src/features/public-experiences/hooks/usePublicExperiences.ts` : `siteId`, `queueId`, `selectedQueueId`.

Pour chaque hook :

- adapter `enabled` (`Boolean(id)` est acceptable si la chaîne vide est interdite) ;
- conserver `null` et `undefined` selon la sémantique existante ;
- aligner `queryKey`, `queryFn`, `mutationFn` et invalidations sur le même type ;
- vérifier les callbacks optimistes et comparaisons `===` ;
- ne jamais valider un ID par `id > 0`, `Number.isInteger(id)` ou `isNaN`.

## 8. IHM, formulaires, routes et expériences publiques

### 8.1 Règle générale pour les contrôles HTML

La valeur d'un `<select>` est déjà une chaîne. Pour un GUID, conserver directement `event.target.value`. Supprimer toutes les conversions `Number(event.target.value)` appliquées à des IDs. Les conversions restent nécessaires pour les vrais nombres : prix, ordre, seuil, durée, capacité, page, heure ou compteur.

Toujours fournir `value={id}` et des `key={id}` sous forme de chaîne. Les comparaisons entre sélection et DTO doivent être chaîne-à-chaîne.

### 8.2 Composants/pages à modifier

| Zone            | Fichiers et contrôles                                                                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell/contexte  | `Topbar.tsx`, `AppShell.tsx`, `site-context-rules.ts` : site/file actifs, options du sélecteur et scope                                                                                                                                                               |
| Cockpit         | `CockpitPage.tsx`, `QuickRegistration.tsx`, `CockpitCards.tsx` : queue/tier/session/person/registration IDs, ensembles en attente ; supprimer les `Number` sur selects queue/tier                                                                                     |
| Files opérées   | `MyQueuesPage.tsx`, `RegistrationDetailsModal.tsx`, `QueueRegistrationMobileCard.tsx` : queue/registration IDs ; supprimer le `Number` du filtre file                                                                                                                 |
| Personnes/notes | `PersonsPage.tsx`, `PersonFormModal.tsx`, `PersonPickerOrCreate.tsx`, `PersonNotesButton.tsx`, `PersonNotesViewer.tsx` : site/person/note IDs                                                                                                                         |
| Rendez-vous     | `AppointmentsPage.tsx`, `AppointmentEditor.tsx`, `AppointmentActionDialog.tsx` : registration/queue/tier/person IDs ; conserver numériques les conversions d'heures/durées                                                                                            |
| Notifications   | `NotificationsPage.tsx`, `ManualNotificationWizard.tsx`, `NotificationMobileCard.tsx` : notification/registration/queue/person IDs ; retirer `Number(registrationId)` et `Number` du select file                                                                      |
| Supervision     | `ControlRoomPage.tsx`, `ControlRoomInsights.tsx` : site/queue/user/session/registration/tier IDs, cible de reset ; `uniqueOperatorsByUser` doit accepter `userId: string`                                                                                             |
| Rapports        | `ReportsPage.tsx`, `report-utils.ts` : site/queue IDs et filtres ; supprimer la normalisation `typeof rawId === 'number' ? ... : Number(rawId)` et conserver la chaîne                                                                                                |
| Paramétrage     | `OnboardingWizard.tsx`, `QueueServiceSettings.tsx`, `SettingsWorkspace.tsx`, `onboarding-draft.ts`, `onboarding-workflow.ts` : site/queue/tier/rule/user IDs. Ne pas toucher aux `Number` utilisés pour prix, ordres, alert positions et autres valeurs quantitatives |
| Utilisateurs    | `UsersAdminPage.tsx`, `UserAccountWizard.tsx`, `UserAssignmentModal.tsx`, `QueueOperatorsModal.tsx`, cartes utilisateur : user/site/queue/role IDs ; supprimer `Number` du select rôle                                                                                |
| Portfolio       | `PortfolioPage.tsx` : `siteId` et sélection de site                                                                                                                                                                                                                   |
| Design system   | `service-tier.ts` : `tierId` devient chaîne. Ne plus dériver une couleur via arithmétique sur l'ID ; utiliser code/nom ou un hash stable de chaîne. `EntityPicker`/`DataTable` sont génériques, mais leurs tests et consommateurs doivent accepter une clé chaîne     |

### 8.3 Routes, query strings et QR codes

Le routeur applicatif utilise surtout `/kiosk`, `/display` et `/track` avec query strings. Points obligatoires :

- `DisplayPage.tsx` : remplacer `Number(new URLSearchParams(...).get('queueId'))` par une lecture chaîne, distinguer `null` de `''`, valider si nécessaire.
- Tous les écrans qui lisent `siteId`, `queueId`, `personId`, `registrationId`, etc. depuis `URLSearchParams` doivent garder la chaîne.
- Lors de l'écriture d'une URL, utiliser `URL`/`URLSearchParams`, jamais une concaténation non encodée.
- `tracking-url.ts`, `TrackingQr.tsx` et `TrackPage.tsx` : vérifier que le tracking repose toujours sur le token public et non sur un ID numérique ; ne pas transformer le token en UUID si le contrat ne le dit pas.
- Les deep links, favoris, QR codes existants contenant des entiers deviendront invalides. Prévoir redirection/mapping côté serveur si leur continuité est requise, sinon afficher une erreur explicite et régénérer les QR.
- Les anciennes URLs `/display?queueId=10` et fixtures analogues doivent être remplacées par des GUID.

### 8.4 Persistance et brouillons

`src/features/onboarding/model/onboarding-draft.ts` contient `confirmedSiteId`, `associatedTierQueueIds` et `completedUserIds`. Les passer en chaînes et versionner/purger tout brouillon sérialisé antérieur. Contrôler également sessionStorage/localStorage via `src/core/storage/storage-keys.ts` et toute donnée Zustand persistée.

## 9. Temps réel, événements et canaux

Examiner `src/core/realtime/realtime-gateway.ts` et ses tests même si les types y sont parfois implicites :

- payloads d'événements avec `siteId`, `queueId`, `registrationId`, `sessionId` ou `userId` en chaînes ;
- noms de rooms/canaux du type `queue:{id}:display` : la chaîne UUID est interpolable telle quelle ;
- abonnement/désabonnement doivent employer exactement la même forme canonique ;
- déduplication et routage doivent comparer des chaînes ;
- documenter la compatibilité avec d'anciens producteurs d'événements pendant le rolling deploy.

Un front migré connecté à un serveur WebSocket encore numérique (ou inversement) peut sembler fonctionner tout en ignorant les mises à jour. Inclure ce cas dans la recette.

## 10. Tests, mocks et fixtures

### 10.1 Stratégie de données

Créer un petit catalogue partagé de GUID valides et déterministes, par exemple :

```ts
export const ids = {
  siteA: '00000000-0000-4000-8000-000000000001',
  queueA: '00000000-0000-4000-8000-000000000101',
  tierA: '00000000-0000-4000-8000-000000000201',
  personA: '00000000-0000-4000-8000-000000000301',
  registrationA: '00000000-0000-4000-8000-000000000401',
  userA: '00000000-0000-4000-8000-000000000501',
} as const;
```

Chaque entité distincte doit recevoir un GUID distinct. Ne pas réutiliser systématiquement le même UUID, car cela masquerait les erreurs de jointure ou de paramètre.

### 10.2 Unitaires/intégration

- Mettre à jour tous les DTO littéraux, callbacks et signatures des tests sous `src`.
- Ajouter des tests ciblés à `scope-store` : lecture GUID, ancienne valeur numérique ignorée/purgée, contrôle du scope et clear.
- Ajouter un test du `operation-store` prouvant que deux GUID de file indexent et ferment les bons appels.
- Tester les query keys avec GUID et listes de GUID.
- Tester les selects principaux pour vérifier que la valeur envoyée reste strictement identique au GUID reçu.
- Tester parsing/écriture de `queueId` dans l'URL display et génération d'URL/QR.
- Tester `serviceTierVisualClass` avec des GUID différents et un résultat stable.

### 10.3 E2E/MSW

Modifier en priorité :

- `e2e/support/scenario-fixtures.ts` : supprimer chaque `Number(request.path.split(...))`, conserver/décoder le segment chaîne et comparer aux GUID du catalogue.
- `e2e/desk.spec.ts` : `Set<string>`, extraction regex chaîne, `sessionId` chaîne.
- `e2e/pilotage.spec.ts` : `queueId?: string`, ne pas convertir les query params.
- `e2e/public-experiences.spec.ts` : ne pas convertir le match de tier/queue en nombre.
- `e2e/visual-layout.spec.ts` : remplacer `/display?queueId=10` par un GUID encodé.
- `e2e/appointments.spec.ts`, `walkin.spec.ts`, `kiosk-qr.spec.ts`, `scope.spec.ts`, `session.spec.ts`, `ergonomics-regressions.spec.ts` : remplacer les IDs numériques dans réponses, requêtes et attentes. Les conversions de pagination restent numériques.
- `src/shared/testing/mock-server.ts` et mocks Orval générés : aligner les réponses et handlers.

Dans les handlers MSW, les paramètres `params.*` sont des chaînes : ne plus utiliser `Number(params.siteId)`. Décoder les segments au besoin et répondre avec le GUID exact.

### 10.4 Cas de recette indispensables

- Connexion, récupération du scope et restauration du site actif.
- Changement de site et filtrage de toutes les pages dépendantes.
- CRUD site, file, personne, utilisateur, tier, règle et traduction.
- Affectations site/utilisateur, file/opérateur et utilisateur/rôle.
- Création walk-in et rendez-vous, modification, check-in, annulation/reschedule.
- Ouverture/fermeture/reprise d'une session, call next, served/no-show.
- Notes d'une personne.
- Notifications : filtres, détail, envoi manuel et resend.
- Monitoring, rapports avec filtres multiples et audit par cible/acteur/site.
- Kiosk, display, tracking et QR/deep link.
- WebSocket/realtime après reconnexion.
- Logout/login et absence de réutilisation d'un ancien ID stocké.
- Erreurs propres pour GUID absent, malformé, inconnu ou hors scope (400/404/403 selon contrat).

## 11. Compatibilité, sécurité et exploitation

- Ne jamais convertir un UUID en nombre ni le raccourcir : perte irréversible et collisions.
- Ne pas afficher systématiquement les GUID complets dans l'IHM. Afficher le nom/code métier ; réserver l'ID aux écrans techniques et logs.
- Ne pas considérer un GUID comme un secret. Les contrôles d'autorisation et de scope restent obligatoires côté serveur.
- Vérifier logs, analytics, traces, erreurs Sentry/équivalent et corrélation : aucun schéma ne doit exiger un entier.
- Vérifier exports/imports CSV, impressions et documents si des IDs y figurent.
- Mesurer l'impact sur longueur d'URL, index DB et payloads ; le front n'a normalement aucune limite à 32/64 bits à conserver.
- Pour un déploiement progressif, l'adaptateur temporaire doit normaliser `number | string` vers `string` immédiatement à la frontière. Il doit être couvert, journaliser les valeurs numériques reçues et avoir une date de suppression.
- Prévoir rollback : sauvegarde/mapping ancien ID → GUID côté back-end, version API ou compatibilité contrôlée. Le front seul ne peut pas reconstruire l'ancien entier depuis un GUID.

## 12. Contrôles automatisés et critères de sortie

### 12.1 Recherches résiduelles

Après les modifications, exécuter au minimum :

```powershell
rg -n "\b(id|[A-Za-z]+Id|[A-Za-z]+Ids)\??\s*:\s*(number|number\[\]|Array<number>)\b" src e2e
rg -n "Record<number|Map<number|Set<number|ReadonlySet<number>" src e2e
rg -n "Number\(|parseInt\(|parseFloat\(" src e2e
rg -n "Number\.is(Integer|Finite)|>\s*0|<=\s*0" src e2e
rg -n "queueId=10|siteId=1|personId=1|registrationId=1" src e2e specifications
```

Chaque résultat doit être classé manuellement. `number` reste correct pour métriques, pagination, horaires, téléphone, prix, seuils, rangs, durées et compteurs. Toute occurrence appliquée à une famille d'ID de la section 2 doit être supprimée ou justifiée par écrit.

Ajouter idéalement un script d'audit CI qui parcourt les modèles générés et échoue si une propriété correspondant à `(^id$|Id$|Ids$)` est `number`, avec une allowlist très courte pour les faux positifs explicitement documentés.

### 12.2 Pipeline de validation

Exécuter dans cet ordre :

```powershell
npm run api:generate
npm run api:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Puis, si la livraison l'exige, `npm run verify` pour tous les audits du dépôt.

### 12.3 Definition of Done

La migration n'est terminée que si :

- le nouveau contrat OpenAPI est la source de vérité et tous les identifiants ciblés sont des chaînes ;
- le client généré est reproductible sans diff ;
- aucun ID n'est converti ou validé comme un nombre dans DTO, service, hook, store ou IHM ;
- tous les tableaux, filtres, clés de cache, structures indexées, URLs, stockage et événements transportent les GUID sans altération ;
- les anciennes données navigateur sont purgées/versionnées ;
- les tests utilisent des GUID valides et distincts ;
- unitaires, typecheck, lint, build et E2E passent ;
- la recette métier de la section 10.4 est validée ;
- la compatibilité API/WebSocket durant le déploiement et le rollback sont documentés et testés ;
- les overrides OpenAPI temporaires et unions `number | string` ont été supprimés, ou possèdent un ticket et une échéance explicites.

## 13. Checklist d'exécution compacte

- [ ] Décisions UUID/compatibilité prises avec le back-end.
- [ ] Migration DB, clés étrangères, index, événements et mapping de rollback prêts.
- [ ] OpenAPI mis à jour pour scalaires, tableaux, path/query/body et réponses.
- [ ] Overrides d'ID dans `normalize-spec.mjs` supprimés/corrigés.
- [ ] Client Orval régénéré et inspecté.
- [ ] Query keys, invalidations, scope, stockage et permissions migrés.
- [ ] Services/actions manuels migrés.
- [ ] Tous les hooks migrés.
- [ ] Stores, `Record`/`Set`/`Map` et comparaisons migrés.
- [ ] Selects, filtres, modales, listes, formulaires et callbacks IHM migrés.
- [ ] URLs, query params, QR, display, kiosk et tracking vérifiés.
- [ ] Realtime/WebSocket vérifié.
- [ ] Brouillons et anciennes valeurs stockées purgés/versionnés.
- [ ] Mocks et fixtures centralisés sur des GUID déterministes.
- [ ] Tests unitaires, intégration et E2E adaptés.
- [ ] Recherches résiduelles revues une par une.
- [ ] Pipeline complet vert et recette métier signée.
- [ ] Plan de déploiement, observabilité et rollback validé.

<!-- CHECKPOINT id="ckpt_mvlhioer_esfs15" time="2026-10-23T21:31:17.139Z" note="auto" fixes=0 questions=0 highlights=0 sections="5. Infrastructure front commune" -->

<!-- CHECKPOINT id="ckpt_mvlhvjde_u2oc46" time="2026-10-23T21:41:17.138Z" note="auto" fixes=0 questions=0 highlights=0 sections="5. Infrastructure front commune" -->

<!-- CHECKPOINT id="ckpt_mvli8ecb_j6rkdx" time="2026-10-23T21:51:17.147Z" note="auto" fixes=0 questions=0 highlights=0 sections="5. Infrastructure front commune" -->

<!-- CHECKPOINT id="ckpt_mvlil9az_co31nn" time="2026-10-23T22:01:17.147Z" note="auto" fixes=0 questions=0 highlights=0 sections="5. Infrastructure front commune" -->

<!-- CHECKPOINT id="ckpt_mvliy4a2_pk8h4w" time="2026-10-23T22:11:17.162Z" note="auto" fixes=0 questions=0 highlights=0 sections="5. Infrastructure front commune" -->
