# Internationalisation

Ce répertoire contient l’unique implémentation i18n de l’application.

## Architecture

- `i18n.ts` : façade publique stable utilisée par l’application.
- `instance.ts` : initialisation i18next, chargement local différé et changement de langue.
- `remote.ts` : superposition des traductions de l’API, cache de versions et validation.
- `config.ts` : locales prises en charge, normalisation, fallback et direction RTL.
- `placeholders.ts` : validation des paramètres `{{name}}` et des pluriels.
- `types.ts` : contrat de complétude dérivé du catalogue français.
- `glossary.ts` : terminologie interdite vérifiée par les tests.
- `locales/` : catalogues locaux, découpés par langue puis par domaine fonctionnel.

Le français est la source de vérité et le fallback universel. L’anglais et l’arabe standard
doivent définir toutes ses clés. `ar-TN` est volontairement partiel et hérite de `ar`, puis `fr`.

## Ajouter ou modifier une traduction

1. Ajouter la clé dans `locales/fr/<domaine>.ts`.
2. Ajouter sa traduction dans le même domaine sous `en` et `ar`.
3. Ajouter éventuellement une variante tunisienne sous `ar-TN`.
4. Si une valeur doit légitimement être identique au français, mettre sa clé dans
   `locales/allow-identical.ts`.
5. Lancer `npm run audit:i18n`, `npm test` et `npm run typecheck`.

Une clé ne doit exister que dans un seul domaine par langue. Les placeholders doivent rester
identiques entre les langues. Les variantes plurielles utilisent les suffixes CLDR
`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.

## API publique

- `setLanguage(locale)` charge le catalogue local et active la langue.
- `loadTranslationBundle(locale, category)` charge les traductions distantes sans changer la langue.
- `setTranslationRejectionReporter(reporter)` branche l'observabilité des entrées distantes rejetées ;
  sans reporter applicatif, un événement navigateur `dorify:i18n-rejected` est émis.
- `ensureLocaleLoaded(locale)` précharge une langue et sa chaîne de fallback.
- `i18n` reste disponible pour les usages non React.

Les composants React utilisent normalement `useTranslation()`. Un changement de langue ne doit
pas appeler directement `i18n.changeLanguage` : passer par `setLanguage` garantit que le chunk
local est chargé et que `<html lang dir>` reste synchronisé.
