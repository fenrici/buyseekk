export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRequirementKey = 'minLength' | 'uppercase' | 'lowercase' | 'number';

export type PasswordRequirements = Record<PasswordRequirementKey, boolean>;

export function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

/** Valida contraseñas nuevas (register, reset). No aplica al login. */
export function isPasswordValid(password: string): boolean {
  const requirements = checkPasswordRequirements(password);
  return (
    requirements.minLength &&
    requirements.uppercase &&
    requirements.lowercase &&
    requirements.number
  );
}

export const PASSWORD_REQUIREMENT_ORDER: PasswordRequirementKey[] = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
];
