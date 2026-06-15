import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie policy — Buyseekk',
  description: 'How Buyseekk uses cookies and similar technologies.',
};

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
