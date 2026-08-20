export type AccountMode = 'BUYER' | 'SELLER';

export type AccountAvatarFields = {
  buyerAvatarUrl?: string | null;
  sellerAvatarUrl?: string | null;
  /** Legacy alias of buyerAvatarUrl. */
  avatarUrl?: string | null;
  activeMode?: AccountMode | string | null;
};

export function buyerAvatarUrl(user: AccountAvatarFields): string | null {
  return user.buyerAvatarUrl || user.avatarUrl || null;
}

export function sellerAvatarUrl(user: AccountAvatarFields): string | null {
  return user.sellerAvatarUrl || null;
}

/** Avatar for the given mode. Empty values fall back to initials in UI, never a broken image. */
export function avatarUrlForMode(
  user: AccountAvatarFields,
  mode?: AccountMode | string | null,
): string | null {
  const resolved = mode || user.activeMode || 'BUYER';
  if (resolved === 'SELLER') return sellerAvatarUrl(user);
  return buyerAvatarUrl(user);
}
