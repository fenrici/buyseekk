import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help — Buyseek',
  description: 'FAQ and support for Buyseek.',
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
