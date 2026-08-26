'use client';

import { useEffect, useState } from 'react';
import { defaultAcceptMessageForLocale } from '@buyseekk/shared';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { useT } from '@/lib/i18n';

export function ProfileSellerChatSection({
  user,
  onUpdated,
}: {
  user: User;
  onUpdated: (user: User) => void;
}) {
  const t = useT();
  const placeholder = defaultAcceptMessageForLocale(user.locale);
  const [message, setMessage] = useState(user.defaultAcceptMessage ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMessage(user.defaultAcceptMessage ?? '');
  }, [user.defaultAcceptMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const trimmed = message.trim();
      const updated = await api<User>('/users/me/seller-chat-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultAcceptMessage: trimmed.length > 0 ? trimmed : null,
        }),
      });
      onUpdated(updated);
      setMessage(updated.defaultAcceptMessage ?? '');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card profile-seller-chat-section mt-6 p-5">
      <div>
        <h3 className="profile-seller-section__title">{t('profile.acceptMessageTitle')}</h3>
        <p className="profile-seller-section__hint">{t('profile.acceptMessageDesc')}</p>
      </div>
      <textarea
        className="input"
        value={message}
        onChange={(e) => {
          setSaved(false);
          setMessage(e.target.value);
        }}
        placeholder={placeholder}
        maxLength={500}
      />
      <p className="profile-seller-chat-section__hint">{t('profile.acceptMessageHint')}</p>
      {error && <p className="profile-form__alert profile-form__alert--error">{error}</p>}
      {saved && <p className="profile-form__alert profile-form__alert--success">{t('profile.saved')}</p>}
      <button type="submit" disabled={saving} className="btn btn-primary profile-seller-chat-section__save">
        {saving ? t('common.saving') : t('profile.save')}
      </button>
    </form>
  );
}
