'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { ProfilePlanTeaser } from './ProfilePlanTeaser';
import { ProfileSecuritySummary } from './ProfileSecuritySummary';
import type { User } from '@/lib/types';

type Props = {
  user: User;
  onUpgrade: () => void;
  onSecurity: () => void;
};

export function ProfileAccountSidebar({ user, onUpgrade, onSecurity }: Props) {
  const plan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;

  return (
    <div className="profile-sidebar-stack">
      <EmailVerificationBanner variant="sidebar" />
      <ProfilePlanTeaser plan={plan} onUpgrade={onUpgrade} variant="sidebar" />
      <ProfileSecuritySummary emailVerified={user.emailVerified} onOpenSecurity={onSecurity} />
    </div>
  );
}
