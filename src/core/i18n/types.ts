import type { FrCatalog } from './locales/fr';

/** EN/AR must define every FR key (compile error otherwise). Extra keys (plural suffixes) are allowed. */
export type Translations = { [K in keyof FrCatalog]: string } & Record<string, string>;
export type DomainTranslations<T> = { [K in keyof T]: string } & Record<string, string>;
