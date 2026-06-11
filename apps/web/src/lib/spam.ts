import { detectSpamIssues, type SpamIssue } from '@buyseekk/shared';

const ISSUE_I18N: Record<SpamIssue, string> = {
  phone: 'request.noPhone',
  link: 'request.noLinks',
  email: 'request.noEmail',
  social: 'request.noSocial',
  low_quality: 'request.noSpamQuality',
};

/** Claves i18n de todos los problemas en el texto. */
export function spamFieldErrorKeys(text: string): string[] {
  return detectSpamIssues(text).map((issue) => ISSUE_I18N[issue]);
}

/** Primera clave i18n (compatibilidad). */
export function spamFieldErrorKey(text: string): string | null {
  const keys = spamFieldErrorKeys(text);
  return keys[0] ?? null;
}

/** Mensajes traducidos, uno por cada validación detectada. */
export function spamFieldErrors(
  t: (key: string, vars?: Record<string, string | number>) => string,
  text: string,
): string[] {
  return spamFieldErrorKeys(text).map((key) => t(key));
}
