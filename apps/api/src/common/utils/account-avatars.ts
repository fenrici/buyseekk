export const REQUEST_BUYER_SELECT = {
  id: true,
  name: true,
  country: true,
  currency: true,
  buyerAvatarUrl: true,
} as const;

export function withBuyerAvatar<T extends { buyerAvatarUrl?: string | null }>(user: T) {
  const { buyerAvatarUrl, ...rest } = user;
  return { ...rest, avatarUrl: buyerAvatarUrl ?? null };
}

export function withSellerAvatar<T extends { sellerAvatarUrl?: string | null }>(user: T) {
  const { sellerAvatarUrl, ...rest } = user;
  return { ...rest, avatarUrl: sellerAvatarUrl ?? null };
}

export function toAccountUser<T extends { passwordHash: string; buyerAvatarUrl?: string | null }>(user: T) {
  const { passwordHash: _drop, ...safe } = user;
  return {
    ...safe,
    avatarUrl: safe.buyerAvatarUrl ?? null,
  };
}
