'use client';

import { checkPasswordRequirements, PASSWORD_REQUIREMENT_ORDER, type PasswordRequirementKey } from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  password: string;
  className?: string;
};

const LABEL_KEYS: Record<PasswordRequirementKey, 'passwordReqMinLength' | 'passwordReqUppercase' | 'passwordReqLowercase' | 'passwordReqNumber'> = {
  minLength: 'passwordReqMinLength',
  uppercase: 'passwordReqUppercase',
  lowercase: 'passwordReqLowercase',
  number: 'passwordReqNumber',
};

export function PasswordRequirements({ password, className = '' }: Props) {
  const t = useT();
  const requirements = checkPasswordRequirements(password);
  const hasInput = password.length > 0;

  return (
    <ul
      className={`password-requirements${className ? ` ${className}` : ''}`}
      aria-live="polite"
      aria-label={t('auth.passwordRequirementsAria')}
    >
      {PASSWORD_REQUIREMENT_ORDER.map((key) => {
        const met = requirements[key];
        const pending = hasInput && !met;
        return (
          <li
            key={key}
            className={`password-requirements__item${
              met ? ' password-requirements__item--met' : pending ? ' password-requirements__item--pending' : ''
            }`}
          >
            <span className="password-requirements__mark" aria-hidden="true">
              {met ? '✓' : '○'}
            </span>
            <span>{t(`auth.${LABEL_KEYS[key]}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}
