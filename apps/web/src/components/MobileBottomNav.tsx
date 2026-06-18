'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { useMobileNavBadges } from '@/hooks/useMobileNavBadges';
import { useChatUnread } from '@/hooks/useChatUnread';
import { useMobileNavContext } from '@/hooks/useMobileNavContext';

type TabDef = {
  id: string;
  href: string;
  label: string;
  icon: ComponentType<{ active: boolean }>;
  isActive: (pathname: string, tab: string | null) => boolean;
  badge?: number;
};

function IconGrid({ active }: { active: boolean }) {
  const c = active ? 'text-indigo-400' : 'text-slate-500';
  return (
    <svg className={`h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  const c = active ? 'text-indigo-400' : 'text-slate-500';
  return (
    <svg className={`h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconTag({ active }: { active: boolean }) {
  const c = active ? 'text-indigo-400' : 'text-slate-500';
  return (
    <svg className={`h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 12v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <path d="M12 14v4M9 18h6" strokeLinecap="round" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function IconChat({ active }: { active: boolean }) {
  const c = active ? 'text-indigo-400' : 'text-slate-500';
  return (
    <svg className={`h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 9h10M7 13h6" strokeLinecap="round" />
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3V6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  const c = active ? 'text-indigo-400' : 'text-slate-500';
  return (
    <svg className={`h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" />
    </svg>
  );
}

function IconStar({ active }: { active: boolean }) {
  const c = active ? 'text-indigo-400' : 'text-slate-500';
  return (
    <svg className={`h-6 w-6 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3.5l2.45 4.96 5.48.8-3.97 3.87.94 5.46L12 16.9l-4.9 2.69.94-5.46-3.97-3.87 5.48-.8L12 3.5z" strokeLinejoin="round" />
    </svg>
  );
}

function buyerTabs(badges: { offers: number; ratings: number }, t: (k: string) => string): TabDef[] {
  return [
    {
      id: 'requests',
      href: '/buyer?tab=mine',
      label: t('mobileNav.requests'),
      icon: IconList,
      isActive: (pathname) => pathname === '/buyer',
    },
    {
      id: 'offers',
      href: '/buyer/offers',
      label: t('mobileNav.offers'),
      icon: IconTag,
      isActive: (pathname) => pathname.startsWith('/buyer/offers'),
      badge: badges.offers,
    },
    {
      id: 'messages',
      href: '/chats',
      label: t('nav.messages'),
      icon: IconChat,
      isActive: (pathname) => pathname === '/chats' || pathname.startsWith('/chats/'),
    },
    {
      id: 'ratings',
      href: '/ratings',
      label: t('nav.ratings'),
      icon: IconStar,
      isActive: (pathname) => pathname === '/ratings',
      badge: badges.ratings,
    },
    {
      id: 'profile',
      href: '/profile',
      label: t('nav.profile'),
      icon: IconUser,
      isActive: (pathname) => pathname === '/profile',
    },
  ];
}

function sellerTabs(badges: { offers: number; ratings: number }, t: (k: string) => string): TabDef[] {
  return [
    {
      id: 'explore',
      href: '/seller',
      label: t('nav.sellerPanel'),
      icon: IconGrid,
      isActive: (pathname) => pathname === '/seller' || pathname.startsWith('/requests/'),
    },
    {
      id: 'offers',
      href: '/seller/offers',
      label: t('mobileNav.offers'),
      icon: IconTag,
      isActive: (pathname) =>
        pathname.startsWith('/seller/offers') || pathname.startsWith('/seller/saved'),
      badge: badges.offers,
    },
    {
      id: 'messages',
      href: '/chats',
      label: t('nav.messages'),
      icon: IconChat,
      isActive: (pathname) => pathname === '/chats' || pathname.startsWith('/chats/'),
    },
    {
      id: 'ratings',
      href: '/ratings',
      label: t('nav.ratings'),
      icon: IconStar,
      isActive: (pathname) => pathname === '/ratings',
      badge: badges.ratings,
    },
    {
      id: 'profile',
      href: '/profile',
      label: t('nav.profile'),
      icon: IconUser,
      isActive: (pathname) => pathname === '/profile',
    },
  ];
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const context = useMobileNavContext(user);
  const navBadges = useMobileNavBadges(user, context);
  const { totalUnread } = useChatUnread(user);

  if (!user || !context) return null;

  // Hilo de chat activo: full-screen sin bottom nav (la lista /chats sí lo muestra).
  if (pathname.startsWith('/chats/')) return null;

  const badges = { ...navBadges };
  const baseTabs = context === 'seller' ? sellerTabs(badges, t) : buyerTabs(badges, t);
  const tabs = baseTabs.map((item) => {
    if (item.id === 'messages' && totalUnread > 0) {
      return { ...item, badge: totalUnread };
    }
    return item;
  });

  return (
    <nav className="mobile-bottom-nav" aria-label={t('mobileNav.aria')}>
      <div className="mobile-bottom-nav__inner">
        {tabs.map((item) => {
          const active = item.isActive(pathname, tab);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`mobile-bottom-nav__tab ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mobile-bottom-nav__icon-wrap">
                <Icon active={active} />
                {!!item.badge && item.badge > 0 && (
                  <span className="mobile-bottom-nav__badge">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
