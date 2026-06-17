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
    <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-5">
      <div>
        <h3 className="font-semibold text-slate-900">{t('profile.acceptMessageTitle')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('profile.acceptMessageDesc')}</p>
      </div>
      <textarea
        className="input min-h-[100px] resize-y"
        value={message}
        onChange={(e) => {
          setSaved(false);
          setMessage(e.target.value);
        }}
        placeholder={placeholder}
        maxLength={500}
      />
      <p className="text-xs text-slate-500">{t('profile.acceptMessageHint')}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">{t('profile.saved')}</p>}
      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? t('common.saving') : t('profile.save')}
      </button>
    </form>
  );
}
