'use client';

import type { SubscriptionPlan } from '@buyseekk/shared';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { ProfilePlanTeaser } from './ProfilePlanTeaser';
import { ProfileSecuritySummary } from './ProfileSecuritySummary';
import type { User } from '@/lib/types';

type Props = {
  user: User;
  onOpenPlan: () => void;
  onSecurity: () => void;
};

export function ProfileAccountSidebar({ user, onOpenPlan, onSecurity }: Props) {
  const plan = (user.subscriptionPlan ?? 'FREE') as SubscriptionPlan;

  return (
    <div className="profile-sidebar-stack">
      <EmailVerificationBanner variant="sidebar" />
      <ProfilePlanTeaser plan={plan} onOpenPlan={onOpenPlan} onUpgrade={onOpenPlan} variant="sidebar" />
      <ProfileSecuritySummary emailVerified={user.emailVerified} onOpenSecurity={onSecurity} />
    </div>
  );
}
