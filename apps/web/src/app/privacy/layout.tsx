import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy policy — Buyseek',
  description: 'How Buyseek collects and uses your data.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
