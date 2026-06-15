import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help — Buyseekk',
  description: 'FAQ and support for Buyseekk.',
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
