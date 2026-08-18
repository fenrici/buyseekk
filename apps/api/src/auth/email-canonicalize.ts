/** Canonicaliza emails para register/login/forgot. */
export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
