import tr from "./i18n/dictionaries/tr.json";
import en from "./i18n/dictionaries/en.json";

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";

const dictionaries = {
    tr,
    en,
};

export type Dictionary = typeof tr;

export function isValidLocale(lang: string): lang is Locale {
    return LOCALES.includes(lang as Locale);
}

export function getDictionary(lang: string = DEFAULT_LOCALE): Dictionary {
    return dictionaries[lang as Locale] ?? dictionaries.tr;
}
