import enUS from "./locales/en-US";

const locales: Record<string, typeof enUS> = {
  "en-US": enUS,
};

export function i18n(locale: string) {
  return locales[locale] || enUS;
}
