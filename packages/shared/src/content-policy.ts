export type SpamIssue = 'phone' | 'link' | 'email' | 'social' | 'low_quality';

const CONTACT_HINT =
  /\b(?:whatsapp|wsp|wa\.me|tel[eé]?fono|cel(?:ular)?|móvil|movil|llam(?:ar|ame|ámen)?|contact(?:o|ame)?)\b/i;

const FORMATTED_PHONE = /(?:\+?\d{1,3}[\s().-]*)?\(?\d{2,4}\)?[\s().-]*\d{3,4}[\s().-]*\d{3,4}/g;
const BARE_PHONE = /\b\d{8,15}\b/g;

function matchesAll(text: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  return [...text.matchAll(re)].map((m) => m[0]);
}

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s]+/i;
const DOMAIN_PATTERN = /\b[a-z0-9][-a-z0-9]*\.(?:com|net|org|io|ar|app|me|co|xyz|info)(?:\/[^\s]*)?\b/i;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const SOCIAL_PATTERN =
  /\b(?:instagram|insta(?:gram)?|facebook|face\s*book|tiktok|telegram|linkedin|youtube|snapchat|discord)\b|(?:^|\s)@[a-z0-9._]{3,}\b/i;

export function containsPhoneNumber(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;

  if (/\bwa\.me\/\d+/i.test(normalized)) return true;
  if (CONTACT_HINT.test(normalized) && /\d{6,}/.test(normalized)) return true;

  for (const match of matchesAll(normalized, FORMATTED_PHONE)) {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) return true;
  }

  for (const match of matchesAll(normalized, BARE_PHONE)) {
    if (match.length >= 8 && match.length <= 15) return true;
  }

  return false;
}

export function containsLink(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return URL_PATTERN.test(normalized) || DOMAIN_PATTERN.test(normalized);
}

export function containsEmail(text: string): boolean {
  return EMAIL_PATTERN.test(text.trim());
}

export function containsSocialHandle(text: string): boolean {
  return SOCIAL_PATTERN.test(text.trim());
}

/** Texto repetitivo, sin sentido o típico de spam automático. */
export function looksLikeLowQualitySpam(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < 20) return false;

  if (/(.)\1{7,}/.test(normalized)) return true;

  const words = normalized.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  const unique = new Set(words);
  if (normalized.length >= 40 && unique.size < 3) return true;

  for (const word of words.filter((w) => w.length >= 12)) {
    const vowels = (word.match(/[aeiouáéíóúü]/gi) ?? []).length;
    if (vowels / word.length < 0.12) return true;
  }

  return false;
}

/** Devuelve todos los problemas detectados en el texto (puede haber más de uno). */
export function detectSpamIssues(text: string): SpamIssue[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const issues: SpamIssue[] = [];
  if (containsPhoneNumber(normalized)) issues.push('phone');
  if (containsEmail(normalized)) issues.push('email');
  if (containsLink(normalized)) issues.push('link');
  if (containsSocialHandle(normalized)) issues.push('social');
  if (looksLikeLowQualitySpam(normalized)) issues.push('low_quality');
  return issues;
}

export function detectSpamIssue(text: string): SpamIssue | null {
  return detectSpamIssues(text)[0] ?? null;
}

/** Huella normalizada para detectar contenido duplicado. */
export function contentFingerprint(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}
