'use client';

import Link from 'next/link';
import { useEmailVerificationActions } from '@/hooks/useEmailVerificationActions';
import { isEmailVerificationError } from '@/lib/email-verification-error';
import { useT } from '@/lib/i18n';
import { ValidationAlerts } from '@/components/ValidationAlerts';

type Props = {
  message: string;
  className?: string;
};

function Spinner() {
  return <span className="email-verify-error__spinner" aria-hidden="true" />;
}

export function EmailVerificationErrorAlert({ message, className = '' }: Props) {
  const t = useT();
  const { checking, resending, toast, handleVerify, handleResend } = useEmailVerificationActions();

  if (!isEmailVerificationError(message)) {
    return <ValidationAlerts message={message} className={className} />;
  }

  return (
    <div className={`email-verify-error ${className}`.trim()}>
      <p className="email-verify-error__text">{message}</p>
      <div className="email-verify-error__actions">
        <button
          type="button"
          className="email-verify-error__btn email-verify-error__btn--primary"
          onClick={handleVerify}
          disabled={checking || resending}
        >
          {checking ? (
            <>
              <Spinner />
              {t('auth.verifyEmailChecking')}
            </>
          ) : (
            t('auth.verifyEmailPrimary')
          )}
        </button>
        <button
          type="button"
          className="email-verify-error__btn email-verify-error__btn--ghost"
          onClick={handleResend}
          disabled={checking || resending}
        >
          {resending ? t('auth.verifyEmailSending') : t('auth.verifyEmailResendShort')}
        </button>
        <Link href="/profile" className="email-verify-error__link">
          {t('profile.verifyEmailCta')}
        </Link>
      </div>
      {toast && (
        <p className={`email-verify-error__toast email-verify-error__toast--${toast.type}`} role="status">
          {toast.text}
        </p>
      )}
    </div>
  );
}
