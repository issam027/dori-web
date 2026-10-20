# Audit du code mort et du code dupliqué

Date de l'audit : 20 octobre 2026

> Mise à jour du 20 octobre 2026 : le lot P0 a été appliqué. Les huit fichiers listés ont été supprimés, ainsi que serialize-filters.test.ts, ormatters.test.ts et le scénario SiteContextSwitcher de layout-components.test.tsx.

## Objectif et périmètre

Cet audit couvre toute l'application front-end sous `src/`, ainsi que les usages éventuels depuis `e2e/`, `tools/` et les fichiers de configuration. Aucun code applicatif n'a été modifié pendant l'audit.

Le client généré sous `src/api/generated/` n'est pas considéré comme une cible de nettoyage manuel : il est recréé par Orval. Les fichiers de tests et les outils sont distingués du code livré en production.

Méthodes utilisées :

- graphe statique des imports statiques et dynamiques depuis `src/main.tsx` ;
- recherche des fichiers référencés seulement par les tests ;
- recherche des exports déclarés une seule fois dans le dépôt ;
- recherche de blocs identiques d'au moins huit lignes ;
- recherche des sélecteurs CSS sans occurrence dans le JSX/TSX ;
- contrôle des dépendances déclarées et de leurs imports ;
- vérification manuelle des résultats les plus probables.

Limite importante : une analyse statique ne voit pas toujours les noms construits dynamiquement, notamment certaines classes CSS. Les éléments marqués « à confirmer » doivent être vérifiés dans l'interface ou par tests E2E avant suppression.

## Résumé exécutif

- 8 fichiers sont très probablement absents du bundle de production, pour environ 240 lignes.
- 9 exports supplémentaires sont déclarés mais sans aucun consommateur identifié.
- 3 fichiers ne servent qu'aux tests ou à la gouvernance qualité ; ils ne sont pas forcément à supprimer.
- Le principal bloc réellement dupliqué est le protocole d'impression de ticket, copié à trois endroits.
- Le formatage des dates est dispersé alors qu'un utilitaire partagé existe mais n'est jamais utilisé.
- Le CSS contient plusieurs groupes de sélecteurs vraisemblablement hérités d'anciens écrans.
- Aucune dépendance npm n'a été identifiée avec une confiance suffisante comme supprimable. Les paquets apparemment non importés directement sont utilisés par TypeScript, Vite, ESLint, Vitest, Orval ou leurs fichiers de configuration.

## P0 — Fichiers de production morts — traité

Ces fichiers ne sont atteignables par aucun chemin d'import depuis `src/main.tsx`. Ils n'ont par ailleurs aucun consommateur applicatif identifié.

| Fichier                                         | Lignes | Preuve                                                                                                 | Recommandation                                                                                                   |
| ----------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/core/errors/FeatureErrorBoundary.tsx`      |     35 | Aucun import dans le dépôt. `AppErrorBoundary` est le boundary réellement monté.                       | Supprimer, ou l'intégrer explicitement aux routes si un boundary par fonctionnalité est souhaité.                |
| `src/core/permissions/Can.tsx`                  |     19 | Aucun import ; les écrans appellent directement `hasPermission`/`hasAnyPermission`.                    | Supprimer si le composant déclaratif n'est pas prévu à court terme.                                              |
| `src/core/permissions/useDeskShortcuts.ts`      |     31 | Aucun import ni test.                                                                                  | Supprimer, ou brancher au cockpit avec des tests clavier si cette fonction est voulue.                           |
| `src/design-system/patterns/NetworkState.tsx`   |     33 | Aucun import ; recoupe `FeedbackState.tsx` pour les états erreur/chargement/retry.                     | Supprimer. Ne pas conserver deux abstractions concurrentes.                                                      |
| `src/features/queue-operations/Receipt80mm.tsx` |     46 | Aucun import ; l'impression active passe par `KioskTicketPrintDocument` et `PassagePrintDocument`.     | Supprimer après une vérification rapide du parcours d'impression.                                                |
| `src/shared/date/formatters.ts`                 |     15 | Aucun import des trois fonctions.                                                                      | Soit supprimer, soit en faire l'API commune et migrer les formats locaux vers elle. Ne pas le laisser inutilisé. |
| `src/app/layouts/SiteContextSwitcher.tsx`       |     49 | Importé uniquement par `layout-components.test.tsx`, jamais par l'application.                         | Supprimer le composant et ses tests associés, sauf intention de le remettre dans `AppShell`.                     |
| `src/api/client/serialize-filters.ts`           |     12 | Importé uniquement par `serialize-filters.test.ts`. Les clients Orval sérialisent déjà les paramètres. | Supprimer le fichier et son test s'il ne représente plus une règle contractuelle utile.                          |

### Précaution

`SiteContextSwitcher` et `serializeFilters` ont encore des tests. Leurs tests prouvent leur comportement isolé, pas leur utilisation dans l'application. Ils doivent être supprimés en même temps que le code si la décision de retrait est confirmée.

## P1 — Exports inutilisés dans des fichiers vivants — traité

Les symboles suivants n'ont aucune occurrence en dehors de leur déclaration, y compris dans les tests et le code généré :

> Mise à jour du 20 octobre 2026 : les neuf exports de cette section ont été supprimés. Les imports devenus inutiles ont également été nettoyés.

| Symbole                  | Emplacement                                                         | Observation                                                                           |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ApiError`               | `src/api/client/http-client.ts:123`                                 | Alias générique inutilisé.                                                            |
| `ApiBody`                | `src/api/client/http-client.ts:124`                                 | Alias identité inutilisé.                                                             |
| `fromBackendLocale`      | `src/core/i18n/config.ts:46`                                        | Aucun appel ; `normalizeLocale` couvre actuellement les usages.                       |
| `GLOSSARY`               | `src/core/i18n/glossary.ts:5`                                       | Le test importe `FORBIDDEN`, pas `GLOSSARY`. La constante est seulement documentaire. |
| `usePersonNotesPresence` | `src/features/notes/hooks/usePersonNotes.ts:28`                     | Hook jamais appelé.                                                                   |
| `useRecentNotifications` | `src/features/notifications/hooks/useNotifications.ts:47`           | Hook jamais appelé depuis le déplacement de la messagerie.                            |
| `usePersonsByIds`        | `src/features/persons/hooks/usePersons.ts:39`                       | Hook jamais appelé.                                                                   |
| `KioskTier`              | `src/features/public-experiences/hooks/usePublicExperiences.ts:197` | Alias de type sans consommateur.                                                      |
| `useQueueStatus`         | `src/features/queues/hooks/useQueues.ts:30`                         | Seul `useQueueStatuses` est utilisé.                                                  |

Recommandation : supprimer ces exports individuellement après validation fonctionnelle. Pour `GLOSSARY`, choisir explicitement entre une constante exécutable réellement vérifiée par les tests et une documentation déplacée dans le README i18n.

## Code hors production mais volontaire

Les éléments suivants sont absents du graphe de production, mais ont une utilité claire dans les tests ou l'outillage. Ils ne doivent pas être classés automatiquement comme déchets :

- `src/core/i18n/locales/allow-identical.ts` : liste d'exceptions utilisée par `catalogs.test.ts` ;
- `src/core/i18n/glossary.ts` : `FORBIDDEN` est utilisé par les tests de traduction, même si `GLOSSARY` ne l'est pas ;
- `src/features/onboarding/model/settings-schemas.ts` : les trois schémas ne sont utilisés que par `settings-schemas.test.ts`. Cela ressemble à une validation préparée mais jamais branchée aux formulaires ;
- `src/shared/testing/mock-server.ts` et `setup-tests.ts` : infrastructure Vitest/MSW normale ;
- `src/vite-env.d.ts` : déclaration chargée par TypeScript sans import explicite.

Décision à prendre pour `settings-schemas.ts` : brancher les schémas Zod aux formulaires d'administration, ou supprimer le fichier et son test. Dans l'état actuel, les tests valident une logique qui ne protège aucun parcours utilisateur.

## P1 — Duplications confirmées — traité

### 1. Cycle d'impression de ticket copié trois fois

> Traité le 20 octobre 2026 : extraction de `shared/printing/print-document.ts`, utilisée par les trois impressions de ticket et par l'impression différée des passages du cockpit.

Le même bloc est présent dans :

- `src/features/appointments/AppointmentActionDialog.tsx:187` ;
- `src/features/cockpit/QuickRegistration.tsx:246` ;
- `src/features/public-experiences/components/kiosk/KioskWizard.tsx:745`.

Chaque copie :

1. positionne `document.body.dataset.printKioskTicket` ;
2. installe un listener `afterprint` ;
3. appelle `window.print()` ;
4. programme un nettoyage après 30 secondes.

Risque : une correction du nettoyage, du délai ou du comportement navigateur doit être répliquée trois fois. Extraire une fonction ou un hook partagé, par exemple `printDocument('printKioskTicket')`, avec un test unitaire. `CockpitPassages.tsx` possède une variante du même protocole pour `printPassage` et pourrait utiliser la même primitive.

### 2. Déclencheur des notes dupliqué dans le cockpit

> Traité le 20 octobre 2026 : `PersonNotesButton` expose désormais une variante `cockpit`, utilisée par les deux cartes concernées.

Le composant partagé `src/features/notes/PersonNotesButton.tsx` gère déjà l'icône, le libellé accessible et la pastille. `src/features/cockpit/components/CockpitCards.tsx:122` et `:337` reconstruisent leur propre bouton et leur propre pastille.

Risque : tailles, accessibilité et comportement divergent entre cockpit, annuaire et suivi du jour. Étendre `PersonNotesButton` avec une variante visuelle adaptée au cockpit, plutôt que maintenir deux implémentations.

### 3. Formatage date/heure dispersé

> Traité le 20 octobre 2026 : création de `core/i18n/date-format.ts` et migration des écrans recensés vers une API commune sensible à la locale.

`src/shared/date/formatters.ts` fournit `formatDateTime`, mais n'est jamais utilisé. En parallèle, plusieurs écrans formatent directement les dates :

- `UsersAdminPage.tsx:277` et `:608` répètent exactement le rendu de `lastLogin` dans le même fichier ;
- `PersonNotesViewer.tsx:206`, `NotificationsPage.tsx:241`, `ProfilePage.tsx:141` et `HealthPage.tsx:68` appellent directement `toLocaleString()` ;
- `RegistrationDetailsModal.tsx:31`, `PersonsPage.tsx:122` et `ControlRoomInsights.tsx:30` définissent leurs propres helpers locaux.

Risque : locale et fuseau horaire implicites, rendus différents et duplication. Définir une petite API commune tenant compte de la locale i18n et du fuseau métier, puis migrer les usages. Si ce chantier n'est pas souhaité, supprimer au minimum l'utilitaire partagé mort.

### 4. États réseau concurrents

> Traité avec le lot P0 : `NetworkState.tsx`, qui n'avait aucun consommateur, a été supprimé. `FeedbackState.tsx` reste l'unique abstraction active.

`NetworkState.tsx` reproduit une partie des comportements de `FeedbackState.tsx` (`DorifyLoader`, message d'erreur, bouton retry), mais n'est jamais utilisé. Il ne faut pas fusionner préventivement les deux : supprimer `NetworkState`, puis faire évoluer `FeedbackState` seulement à partir de besoins réels.

### 5. Index de catalogues i18n

> Décision confirmée le 20 octobre 2026 : aucune factorisation. Cette duplication explicite et stable est conservée volontairement.

Les index `src/core/i18n/locales/{fr,en,ar}/index.ts` contiennent des blocs d'imports et d'assemblage presque identiques. Cette duplication est réelle mais intentionnelle et faible risque : elle rend explicite la composition de chaque catalogue. Une génération automatique ajouterait de la magie pour un gain limité. Recommandation : ne pas prioriser.

## P2 — CSS potentiellement mort

Les sélecteurs ci-dessous sont définis dans les feuilles de style mais leur nom n'apparaît dans aucun fichier TS/TSX/HTML. Les classes construites dynamiquement par préfixe ont été écartées de cette liste autant que possible.

### Design system et application

- `alert-inline` — `components/content.css:7`
- `experience-preview-header` — `components/content.css:266` et `features/application.css:727`
- `appointment-event-status` — `components/content.css:313`
- `appointment-person-summary` — `components/content.css:361` et `features/application.css:1461`
- `checkbox-row` — `components/controls.css:132`
- `site-select-button` — `components/controls.css:158`
- `calendar-add-button` — `components/controls.css:194`
- `form-grid--two`, `form-grid__full`, `form-field--full` — `components/controls.css:1011-1030`
- `profile-grid` — `features/application.css:658`
- `report-period-context` — `features/application.css:676`
- `experience-preview-frame`, `experience-preview-toolbar`, `preview-lights` — `features/application.css:745-783`
- `appointment-action-panel-heading` — `features/application.css:1560`
- `refresh-icon` — `features/application.css:1702`
- `ticket-confirmation` — `features/application.css:1816`
- `settings-site-picker` — `features/application.css:2717`
- `control-room-command-bar`, `control-room-period`, `control-room-refresh` — `features/application.css:2730-2764`
- `control-room-filter-row`, `filter-label` — `features/application.css:3097-3108`
- `next-appointment` — `features/application.css:3183`

### Ancien CSS d'administration/onboarding

- `config-chain` — `features/onboarding/admin.css:173`
- `sms-preview-grid` — `features/onboarding/admin.css:425`
- `phone-preview` — `features/onboarding/admin.css:430`
- `admin-advanced-fields` — `features/onboarding/admin.css:448`
- `tier-config-card-heading`, `tier-config-actions` — `features/onboarding/admin.css:611`
- `notification-config-card` — `features/onboarding/admin.css:620`
- `tier-config-fields` — `features/onboarding/admin.css:660`
- `notification-option` — `features/onboarding/admin.css:665`
- `toggle-field` — `features/onboarding/admin.css:837`
- `admin-filter-grid-single` — `features/onboarding/admin.css:966`

Recommandation : supprimer ces règles par petits groupes avec une capture visuelle ou un test E2E des pages concernées. Certains sélecteurs peuvent être ajoutés à `document.body` ou construits dynamiquement ; le risque est donc supérieur à celui des fichiers TypeScript non importés.

## Hotspots favorisant les duplications futures

Ce ne sont pas du code mort en soi, mais leur taille rend les doublons et les branches abandonnées plus difficiles à repérer :

| Fichier                                                            | Lignes |
| ------------------------------------------------------------------ | -----: |
| `src/design-system/styles/features/application.css`                |   3815 |
| `src/design-system/styles/experiences/kiosk.css`                   |   1034 |
| `src/design-system/styles/experiences/display.css`                 |    820 |
| `src/features/public-experiences/components/kiosk/KioskWizard.tsx` |    772 |
| `src/features/reports/ReportVisualizations.tsx`                    |    653 |
| `src/features/users/UsersAdminPage.tsx`                            |    634 |
| `src/features/appointments/AppointmentActionDialog.tsx`            |    581 |

Ordre conseillé : extraire d'abord les comportements réutilisés réellement identifiés (impression et formatage), puis découper les grands fichiers par sous-composants métier. Un découpage purement mécanique sans consommateur commun déplacerait seulement la complexité.

## Dépendances npm

Aucune suppression sûre n'est proposée.

Les dépendances d'exécution sont toutes importées ou nécessaires au typage (`@types/qrcode`). Plusieurs dépendances de développement ne figurent pas dans les imports de `src`, mais sont appelées par les scripts npm ou les fichiers de configuration : ESLint et ses plugins, Prettier, Orval, TypeScript, Vite, Vitest, jsdom et le plugin React.

## Plan de nettoyage recommandé

1. Supprimer les fichiers P0 sans consommateur, avec leurs tests devenus orphelins.
2. ~~Supprimer les neuf exports inutilisés, un domaine à la fois.~~ Terminé le 20 octobre 2026.
3. Décider du sort de `settings-schemas.ts` : intégration réelle ou suppression.
4. ~~Extraire le protocole d'impression commun et migrer ses quatre variantes.~~ Terminé le 20 octobre 2026.
5. ~~Unifier le bouton de notes du cockpit avec `PersonNotesButton`.~~ Terminé le 20 octobre 2026.
6. ~~Choisir une stratégie unique de formatage date/heure et supprimer l'implémentation concurrente.~~ Terminé le 20 octobre 2026.
7. Nettoyer les sélecteurs CSS par lots, avec vérification visuelle.
8. Ajouter un audit automatique du graphe d'imports et des exports inutilisés à la CI, en excluant explicitement `src/api/generated` et les fichiers de test-support.

## Commandes de validation après nettoyage

```powershell
npm run typecheck
npm run lint
npm test
npm run audit:phase11
npm run audit:i18n
npm run build
npm run test:e2e
```

Le nettoyage du CSS et des parcours d'impression mérite particulièrement les tests E2E, car le typage et les tests unitaires ne détecteront pas une régression visuelle ou une règle `@media print` devenue inopérante.

<!-- CHECKPOINT id="ckpt_mvgq8y21_dh72sy" time="2026-10-20T13:36:48.745Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvgqlt0n_vwf2k7" time="2026-10-20T13:46:48.743Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvgqynzd_0vcoeh" time="2026-10-20T13:56:48.745Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvgrbiyj_2rsfk4" time="2026-10-20T14:06:48.763Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mvgrodxc_pdw1np" time="2026-10-20T14:16:48.768Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
