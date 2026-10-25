# Inventaire CSS avant modularisation

État de référence : 11 octobre 2026. Le fichier `src/design-system/tokens/global.css`
contient environ 6 000 lignes. Cet inventaire fixe la destination de chaque famille avant
la phase E2 ; il ne constitue pas une autorisation de déplacer une règle sans contrôle visuel.

## Ordre cible des imports

1. `tokens/index.css` : variables, thèmes, reset minimal et typographie globale.
2. `components/controls.css` : boutons, champs, sélecteurs, téléphone et pagination.
3. `components/content.css` : cartes, tableaux, badges, métriques et états.
4. `components/overlays.css` : modales, menus, toasts et wizards.
5. `layouts/shell.css` : shell privé, sidebar, topbar et responsive.
6. `features/*.css` : calendrier, cockpit, configuration, rapports et santé.
7. `experiences/kiosk.css`, `display.css`, `tracking.css` : surfaces publiques isolées.
8. `print/*.css` : ticket kiosque, justificatif de passage et reçus.
9. `utilities.css` : helpers volontairement transverses et réduction des animations.

## Familles et destinations

| Famille actuelle           | Sélecteurs représentatifs                                                                                 | Destination E2                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Tokens et thèmes           | `:root`, `[data-theme]`, variables `--color-*`, `--space-*`, `--shadow-*`                                 | `tokens/index.css`                                          |
| Base et typographie        | `*`, `html`, `body`, titres, liens, `.sr-only`                                                            | `tokens/base.css`                                           |
| Boutons et formulaires     | `.button`, `.icon-button`, champs natifs, `.form-field`, `.international-phone-input`, `.phone-country-*` | `components/controls.css`                                   |
| Cartes et données          | `.card`, `.metric-card`, `.data-table`, `.status-badge`, `.detail-list`, états vides                      | `components/content.css`                                    |
| Overlays                   | `.modal-*`, `.wizard-*`, `.command-*`, `.notification-center`, menus contextuels                          | `components/overlays.css`                                   |
| Shell privé                | `.app-shell`, `.sidebar`, `.topbar`, `.app-content`, navigation mobile                                    | `layouts/shell.css`                                         |
| Authentification           | `.login-*`, `.auth-*`, carrousel de présentation                                                          | `features/auth.css`                                         |
| Portefeuille/configuration | `.portfolio-*`, `.settings-*`, `.onboarding-*`, éditeur de file                                           | `features/administration.css`                               |
| Cockpit/files              | `.desk-*`, `.queue-*`, `.passage-summary-*`, `.receipt-80mm`                                              | `features/operations.css`                                   |
| Rendez-vous                | `.calendar-*`, `.appointment-*`, créneaux et popups                                                       | `features/appointments.css`                                 |
| Pilotage                   | `.supervision-*`, `.reports-*`, `.health-*`, `.notification-*`                                            | `features/pilotage.css`                                     |
| Pages publiques communes   | `.public-layout`, `.public-header`, `.experience-preview-*`, `.device-mode-*`                             | `experiences/public-shell.css`                              |
| Borne                      | `.public-kiosk`, `.kiosk-*`, `.tracking-qr-*` pour le ticket                                              | `experiences/kiosk.css`                                     |
| Écran salle                | `.public-display`, `.display-*`                                                                           | `experiences/display.css`                                   |
| Tracking                   | `.public-tracking`, `.tracking-*`                                                                         | `experiences/tracking.css`                                  |
| Impression                 | blocs `@media print`, attributs `data-print-*`, documents portalisés                                      | `print/kiosk.css`, `print/passage.css`, `print/receipt.css` |
| Animation/accessibilité    | `@keyframes`, `prefers-reduced-motion`, focus visible                                                     | module propriétaire ; garde-fou final dans `utilities.css`  |

## Duplications et surcharges à résorber

- Les styles `kiosk-*` et `display-*` possèdent un socle ancien puis plusieurs passes de
  thème et de contraste. Les règles les plus récentes doivent être fusionnées dans les
  modules publics, pas simplement déplacées dans l'ordre actuel.
- Les blocs d'impression kiosque sont dupliqués : ancienne impression dans le document,
  portail `KioskTicketPrintDocument` et correctifs tablette. E2 doit conserver uniquement
  le portail monté dans `body`, préparé avant le clic d'impression.
- Les règles `device-mode-theme` et les adaptations public-device ont reçu plusieurs
  surcharges. La version finale est la règle statique placée dans le contenu.
- Les cartes, grilles de métriques et tableaux redéfinissent plusieurs fois bordure,
  rayon, fond et ombre. Elles doivent utiliser les primitives de `content.css`.
- Les boutons de borne ont une base, une passe visuelle puis une passe sombre. Elles
  doivent devenir une seule matrice d'états par thème.
- Plusieurs media queries `max-width: 700/900px` et `prefers-reduced-motion` sont dispersées.
  Elles restent auprès du composant propriétaire, sauf la neutralisation transverse.

Avant suppression, chaque sélecteur supposé inutilisé doit être recherché dans `src`, les
tests et les classes construites dynamiquement. Une absence dans une recherche textuelle ne
suffit pas pour les classes calculées.

## Valeurs codées en dur

Les valeurs codées en dur se répartissent en quatre catégories :

- légitimes et fixes : papier blanc/noir, QR noir sur blanc, écran salle de référence et
  dimensions physiques `mm` des tickets ;
- candidates à des tokens : bleus de texte (`#102a43`), turquoise (`#0f8b8d`), gris de
  bordure (`#d9e2ec`) et ombres répétées ;
- spécifiques à une feature : couleurs d'état du calendrier, graphiques et écran salle ;
- historiques à supprimer : fonds clairs imposés dans la borne puis annulés pour les
  thèmes sombres.

E2 doit remplacer une valeur par un token seulement si sa sémantique est stable. Les
couleurs du QR et de l'impression ne doivent pas dépendre du thème écran.

## Impression

- Kiosque : le portail direct enfant de `body` est préparé avant le clic, puis affiché par
  `body[data-print-kiosk-ticket]`. Le QR reste noir sur blanc et complet.
- Passage : `PassagePrintDocument` est un portail direct dans `body`; les valeurs sont
  présentées sous forme `clé : valeur`, sans tableau visuel.
- Reçu 80 mm : `.receipt-80mm` est un ancien format distinct à conserver tant que ses
  consommateurs existent.
- Les règles d'impression doivent être les dernières de leur module et ne jamais dépendre
  des dimensions ou de la visibilité du shell privé.

## Frontière public/privé

Les modules `kiosk`, `display` et `tracking` peuvent consommer les tokens de thème, mais ne
doivent importer aucune règle de `.app-shell`, `.sidebar`, `.topbar` ou `.app-content`.
Les previews humaines sont des cadres autour de l'expérience réelle : elles ne doivent pas
modifier le DOM ou les dimensions internes de l'écran public. `device-mode` appartient au
shell public commun et persiste le thème sélectionné pour les trois expériences.

## Contrôles requis après chaque extraction

- `npm run typecheck` et lint CSS/TS applicable ;
- tests composants ciblés ;
- E2E borne/QR/impression et écran salle ;
- captures light, soft-light, soft-dark et dark aux viewports mobile, tablette paysage et
  écran 1080p ;
- comparaison du CSS calculé des composants déplacés avant/après extraction.
