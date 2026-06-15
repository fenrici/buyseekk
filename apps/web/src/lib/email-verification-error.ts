const EMAIL_VERIFICATION_MARKERS = [
  'verificar tu email',
  'verify your email',
] as const;

export function isEmailVerificationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return EMAIL_VERIFICATION_MARKERS.some((marker) => normalized.includes(marker));
}
