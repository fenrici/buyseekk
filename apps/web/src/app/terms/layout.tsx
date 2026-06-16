import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of service — Buyseek',
  description: 'Terms of service for using Buyseek.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
