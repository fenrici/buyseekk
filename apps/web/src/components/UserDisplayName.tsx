'use client';

import { showsPlusMembershipBadge } from '@/lib/subscription-display';
import type { User } from '@/lib/types';
import { PlusMembershipBadge } from './PlusMembershipBadge';

type Props = {
  name: string;
  subscriptionPlan?: User['subscriptionPlan'];
  className?: string;
};

/** User name with optional Plus membership badge (display cache only). */
export function UserDisplayName({ name, subscriptionPlan, className }: Props) {
  return (
    <span className={`user-display-name${className ? ` ${className}` : ''}`.trim()}>
      <span className="user-display-name__text">{name}</span>
      {showsPlusMembershipBadge(subscriptionPlan) && <PlusMembershipBadge />}
    </span>
  );
}
