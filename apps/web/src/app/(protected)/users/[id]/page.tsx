'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicProfile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Header } from '@/components/Header';
import { StarRating } from '@/components/StarRating';
import { UserRatingBadge } from '@/components/UserRatingBadge';
import { ReportButton } from '@/components/ReportButton';
import { useAuth } from '@/providers/AuthProvider';
import { useLocale, useT } from '@/lib/i18n';
import { formatProfileLocation } from '@/lib/profile-location';

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const locale = useLocale();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    api<PublicProfile>(`/users/${params.id}/profile`)
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [params?.id]);

  const isSeller = profile && (profile.role === 'SELLER' || profile.role === 'BOTH');
  const displayName = profile?.businessName || profile?.name || '';
  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleDateString(locale === 'EN' ? 'en-US' : 'es-AR', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="panel-dark">
      <Header variant="dark" />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {loading && <p className="text-slate-500">{t('common.loading')}</p>}
        {error && !loading && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        {profile && !loading && (
          <>
            <section className="card p-6">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                <Avatar name={displayName} url={profile.avatarUrl} size={96} />
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                  {profile.businessName && (
                    <p className="text-sm text-slate-500">{profile.name}</p>
                  )}

                  <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    {isSeller ? (
                      <>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                          {profile.sellerType === 'BUSINESS'
                            ? t('auth.sellerTypeBusiness')
                            : t('auth.sellerTypePersonal')}
                        </span>
                        {profile.sellerCategory && (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            profile.sellerCategory === 'AUTOS' ? 'tag-autos' : 'tag-inm'
                          }`}>
                            {profile.sellerCategory === 'AUTOS' ? t('seller.autos') : t('seller.realEstate')}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                        {t('auth.roleBuyer')}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {formatProfileLocation(profile.city, profile.country, t) ?? t('profile.locationUnknown')}
                    {' · '}
                    {t('profile.memberSince', { date: memberSince })}
                  </p>

                  <div className="mt-3 flex justify-center sm:justify-start">
                    <UserRatingBadge stats={profile.rating} />
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p className="mt-5 whitespace-pre-line border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-400">
                  {profile.bio}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xl font-bold text-white">{profile.completedDeals}</p>
                  <p className="text-xs text-slate-500">{t('profile.completedDeals')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{profile.rating.reviewCount}</p>
                  <p className="text-xs text-slate-500">{t('profile.reviewsTitle')}</p>
                </div>
                {profile.rating.avgStars !== null && (
                  <div>
                    <p className="text-xl font-bold text-white">{profile.rating.avgStars.toFixed(1)} ★</p>
                    <p className="text-xs text-slate-500">{t('profile.avgRating')}</p>
                  </div>
                )}
              </div>

              {profile.website && (
                <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4 text-sm">
                  {profile.website && (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      🌐 {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              )}

              {user?.id === profile.id ? (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <Link href="/profile" className="btn btn-ghost text-sm">
                    {t('profile.editTitle')}
                  </Link>
                </div>
              ) : (
                user && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <ReportButton target={{ reportedUserId: profile.id }} variant="button" />
                  </div>
                )
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-bold text-white">{t('profile.reviewsTitle')}</h2>
              <div className="mt-4 space-y-3">
                {profile.recentReviews.length === 0 && (
                  <p className="card empty-state p-6 text-sm">{t('profile.noReviews')}</p>
                )}
                {profile.recentReviews.map((review) => (
                  <article key={review.id} className="card p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={review.fromUser.name} url={review.fromUser.avatarUrl} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{review.fromUser.name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleDateString(locale === 'EN' ? 'en-US' : 'es-AR')}
                        </p>
                      </div>
                      {review.stars !== null && <StarRating value={review.stars} showValue={false} />}
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{review.comment}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
