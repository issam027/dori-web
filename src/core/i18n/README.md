# i18n — nouvelle architecture

## Arborescence
```
i18n/
  i18n.ts              point d'entrée public (même chemin d'import qu'avant)
  instance.ts          init i18next, chargement à la demande, setLanguage, dir/lang du <html>
  remote.ts            bundles distants : validation des placeholders, alias legacy, mapping code backend
  config.ts            locales, RTL, chaîne de fallback, normalizeLocale ('tn' → 'ar-TN')
  placeholders.ts      extraction / comparaison des {{paramètres}} (gère les pluriels)
  glossary.ts          terminologie imposée et motifs interdits (testés en CI)
  types.ts             Translations : EN/AR doivent avoir toutes les clés FR (erreur de compilation sinon)
  legacy-aliases.ts    TEMPORAIRE : anciennes clés générées → clés actuelles
  fallback-catalogs.ts shim @deprecated (ré-exporte legacyUiKeyAliases) ; à supprimer
  locales/
    index.ts           loaders (FR embarqué, EN/AR/ar-TN en import() dynamique)
    allow-identical.ts valeurs légitimement identiques au FR (marques, codes, unités) : cliquet
    fr/ en/ ar/ ar-TN/ un fichier par domaine + index.ts
  catalogs.test.ts     parité, placeholders, pluriels, encodage, glossaire, style tunisien
  i18n.test.ts         comportement runtime et bundles distants
```
Domaines : `common nav auth profile errors appointments persons operations portfolio onboarding admin supervision experiences legal`.
Les clés restent **identiques** (`auth.login.xxx`…) : aucun changement dans les composants.

## À faire à l'intégration
1. Remplacer le contenu de votre dossier `i18n` par celui-ci (supprimer l'ancien `i18n.ts`, `i18n.test.ts`, `fallback-catalogs.ts`, `tunisian-humor-fallback.ts`).
2. Les imports `from '…/i18n'` continuent de fonctionner. Deux changements de comportement :
   - `loadTranslationBundle('en')` **ne change plus la langue active**. Pour activer : `setLanguage('en')` ou `loadTranslationBundle('en', 'ihm', { activate: true })`.
   - le changement de langue doit passer par `setLanguage(locale)` (charge le catalogue local puis active, met à jour `<html lang dir>`). Un simple `i18n.changeLanguage('en')` ne chargerait plus le catalogue EN.
3. **Code de langue tunisien** : l'app et les tests utilisent `ar-TN` (`tn` reste accepté en entrée). `config.ts → BACKEND_LOCALE_CODES` suppose que votre backend utilise encore `tn` ; si c'est déjà `ar-TN`, supprimez cette ligne.
4. Chaque test d'origine utilisait `i18n.getResourceBundle(locale, 'fallback')` ; ce n'est plus le cas pour EN/AR (chargés à la demande). Utilisez `await ensureLocaleLoaded('en')`.
5. Votre `mockServer` et `@/api/generated/...` sont réutilisés tels quels dans `i18n.test.ts` (j'ai vérifié avec des stubs équivalents, pas avec votre projet réel : lancez `vitest` chez vous).
6. Étiquettes RTL : les flèches `←/→` ont été retirées des textes arabes (`ar`, `ar-TN`). Si l'icône n'existe pas à côté du texte, ajoutez une icône qui se retourne en RTL (`rtl:-scale-x-100`).
7. Pluriels : `_plural` (ancien format) remplacé par `_one/_other` (+ `zero/two/few/many` en arabe). Vérifiez les clés `…moreCount`, `onboarding.selectedServices`, `common.duration.minutes` côté composants (`t(key, { count })`).

## Ce qui a été corrigé
- **EN et AR complets** : ~322 clés qui s'affichaient en français (onboarding, health, profile, errors, tracking, admin…) sont traduites. FR : 1356 clés, EN : 1356, AR : 1356 + 12 variantes plurielles.
- **FR** : caractères perdus (`Nouvelle cl?`, `Utilisateur modifi?`, `Recherche en cours?`), mots anglais (`Threshold`, `Welcome`, `error`, `Defaults`, `Scope`), clé `common.name` distincte de `common.lastName` / `common.firstName`.
- **EN** : sens aligné sur le FR (`readOnlyDescription`, `search.example`, `personStepHint`, `exporterCsvLocal`), `service tier` → `service level`, `Upcoming appts.` → `Upcoming appointments`, `alerteDApproche` = « Approaching-turn alert ».
- **AR** : contresens de la traduction automatique corrigés (`حفظ`, `جارٍ الحفظ…`, `جارٍ البحث…`, `تحرير الشباك`, `استدعاء التالي`, `طباعة الإيصال`, `بدون موعد`, etc.). Glossaire unifié : **قائمة انتظار** (file), **شباك** (guichet), **عميل** (client), **DORIFY** (marque en lettres latines). Accords de genre/nombre corrigés après la substitution automatique.
- **Tunisien** : contresens (`الزحمة`, `إعادة الإرسال`, `اختار بطاقتك`, `تخدم`, `كمّل` ambigu), humour retiré des zones sensibles (libellés courts, confirmations, reçus, erreurs, écrans publics), émojis supprimés. L'humour reste sur les états vides, chargements, succès, placeholders. Voir `catalogs.test.ts → Tunisian humour`.
- **Architecture** : plus de copie silencieuse du français dans EN/AR (`completeFallbackResources` supprimé). Chaîne explicite `ar-TN → ar → fr`, `en → fr`. Bundles distants refusés si un `{{placeholder}}` est altéré (le texte local est conservé, `onRejected` / `console.warn`). Rechargement possible après échec réseau. Clé de dédoublonnage incluant `force`/`activate`.

## Limites connues (à revoir avec un locuteur natif)
- `ar-TN` couvre ~190 clés (comme avant, après nettoyage) ; le reste passe par l'arabe standard. L'étendre se fait en ajoutant des clés dans `locales/ar-TN/<domaine>.ts`.
- Les traductions EN/AR ajoutées ici sont de mon fait : relisez-les surtout pour `onboarding.*`, `health.*` et les libellés admin.
- Des clés auto-générées tronquées (`…DeLInscription…`, `…UneD`) et des non-traductions utilisées comme clés (`common.fr`, `common.d`, `shell.layouts.topbar.k`) existent toujours : les renommer demande de modifier les composants, donc je ne l'ai pas fait. Les listes sont dans `locales/allow-identical.ts`.
- Mots techniques laissés en latin en arabe (`SLA`, `RSS`, `Heap total`, `checks.database`) : écran de santé réservé aux admins.
- Je n'ai pas pu exécuter votre suite de tests réelle ni le projet complet.

## Ajouter une chaîne
1. Ajouter la clé dans `locales/fr/<domaine>.ts`.
2. `tsc` signale EN et AR tant qu'elles ne sont pas traduites.
3. Si la valeur doit rester identique au FR, l'ajouter à `locales/allow-identical.ts`.
4. `ar-TN` est optionnel (fallback ar → fr).
