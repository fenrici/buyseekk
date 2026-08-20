'use client';

import { useId, useState } from 'react';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { useT } from '@/lib/i18n';

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  showRequirements?: boolean;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  placeholder,
  required = true,
  showRequirements = false,
}: Props) {
  const t = useT();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={inputId} className="auth-label">
        {label}
      </label>
      <div className="password-field">
        <input
          id={inputId}
          className="auth-input password-field__input"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={showRequirements ? 8 : undefined}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-pressed={visible}
          aria-label={visible ? t('auth.passwordHide') : t('auth.passwordShow')}
        >
          {visible ? t('auth.passwordHide') : t('auth.passwordShow')}
        </button>
      </div>
      {showRequirements && <PasswordRequirements password={value} />}
    </div>
  );
}
